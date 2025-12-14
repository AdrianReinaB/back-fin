import express from "express";
import bodyParser from "body-parser";
import connect from './dbConnection.mjs';
import cors from "cors";
import bcrypt from "bcrypt";

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const db = await connect();


function toMySQLDatetime(dateString) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}


app.use(cors());

// Endpoint de login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id_usuario, nombre, apellido, password, telefono, email, rol, credito, activa FROM usuario WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

     const user = rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(402).json({ error: "Credenciales inválidas" });
    }


    if (user.activa === 1) {
      return res.status(403).json({ message: "Usuario desactivado, no puede iniciar sesión." });
    }

    delete user.password;
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Endpoint de register
app.post("/register", async (req, res) => {
  const { nombre, apellido, dni, email, password, telefono } = req.body;

  if (!nombre || !apellido || !email || !password || !telefono) {
    return res.status(400).json({ error: "Faltaron campos" });
  }

  try {
    const [existing] = await db.execute(
      "SELECT id_usuario FROM usuario WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);  

    const [result] = await db.execute(
      "INSERT INTO usuario (nombre, apellido, email, password, telefono, dni) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, apellido, email, hashedPassword, telefono, dni]
    );

    res.status(201).json({
      id_usuario: result.insertId,
      nombre,
      apellido,
      email,
      telefono,
    });
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

//Endpoint de usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM usuario");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

//endpoint de usuario especifico
app.get("/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;
  if (!id_usuario) {
    return res.status(400).json({ error: "no existe el usuario" })
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM usuario where id_usuario = ?",
      [id_usuario]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin usuarios" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

//endpoint de actualizar el usuario
app.put("/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;
  let { nombre, apellido, telefono, rol, credito, email, password, dni } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ error: "Falta el ID del usuario" });
  }

  try {
    const [existing] = await db.execute(
      "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
      [id_usuario]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    nombre = nombre === "" ? null : nombre;
    apellido = apellido === "" ? null : apellido;
    telefono = telefono === "" ? null : telefono;
    credito = credito === "" ? null : credito;
    rol = rol === "" ? null : rol;
    email = email === "" ? null : email;
    password = password === "" ? null : password;
    dni = dni === "" ? null : dni;

    let hashedPassword = null;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await db.execute(
      `UPDATE usuario 
       SET nombre = COALESCE(?, nombre),
           apellido = COALESCE(?, apellido),
           telefono = COALESCE(?, telefono),
           email = COALESCE(?, email),
           password = COALESCE(?, password),
           credito = COALESCE(?, credito),
           rol = COALESCE(?, rol),
           dni = COALESCE(?, dni)
       WHERE id_usuario = ?`,
      [nombre, apellido, telefono, email, hashedPassword, null, rol, dni, id_usuario]
    );

    // Devolver el usuario actualizado
    const [updated] = await db.execute(
      "SELECT id_usuario, nombre, apellido, telefono, email, rol, credito, dni FROM usuario WHERE id_usuario = ?",
      [id_usuario]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

//enpoint de desactivar o activar usuario
app.put("/usuario/disabled/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM usuario WHERE id_usuario = ?",
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = rows[0];
    const nuevoEstado = user.activa === 1 ? 0 : 1;

    await db.execute(
      "UPDATE usuario SET activa = ? WHERE id_usuario = ?",
      [nuevoEstado, id_usuario]
    );

    res.json({
      message: nuevoEstado === 1
        ? "Usuario activado correctamente"
        : "Usuario desactivado correctamente",
      nueva_activa: nuevoEstado
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al desactivar usuario" });
  }
});

//endpoint de activar usuario
app.put("/usuario/disabled/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    await db.query(
      "UPDATE usuario SET activa = 0 WHERE id_usuario = ?",
      [id_usuario]
    );

    res.json({ message: "Usuario activado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al activar usuario" });
  }
});

//Pelicula
//Endpoint de peliculas
app.get("/peliculas", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM pelicula WHERE activa = 1");

    const peliculas = rows.map(p => {
      let imagenBase64 = null;
      if (p.imagen) {
        imagenBase64 = Buffer.from(p.imagen).toString("base64");
      }

      return {
        id_pelicula: p.id_pelicula,
        titulo: p.titulo,
        sinopsis: p.sinopsis,
        clasificacion_edad: p.clasificacion_edad,
        anio: p.anio,
        director: p.director,
        genero: p.genero,
        imagen: imagenBase64
      };
    });

    res.json(peliculas);
  } catch (error) {
    console.error("Error al obtener peliculas:", error);
    res.status(500).json({ error: "Error al obtener peliculas" });
  }
});

//Endpoint de pelicula
//en deshuso
app.get("/pelicula/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;
  if (!id_pelicula) {
    return res.status(400).json({ error: "no existe la pelicula" })
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM pelicula where id_pelicula = ?",
      [id_pelicula]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Película no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener pelicula:", error);
    res.status(500).json({ error: "Error al obtener pelicula" });
  }
});

// Endpoint de register de pelicula
app.post("/registerMovie", async (req, res) => {
  const { titulo, sinopsis, clasificacion_edad, anio, director, genero, imagen } = req.body;

  if (!titulo || !sinopsis || !clasificacion_edad || !anio || !director || !genero || !imagen) {
    return res.status(400).json({ error: "Faltaron campos" });
  }

  if (imagen.length > 1024 * 1024) {
    return res.status(413).json({ error: "La imagen es demasiado grande" });
  }

  try {

    const imagenBuffer = Buffer.from(imagen, "base64");

    const [existing] = await db.execute(
      "SELECT titulo FROM pelicula WHERE titulo = ?",
      [titulo]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "La pelicula ya está registrada" });
    }

    await db.execute(
      "INSERT INTO pelicula (titulo, sinopsis, clasificacion_edad, anio, director, genero, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [titulo, sinopsis, clasificacion_edad, anio, director, genero, imagenBuffer]
    );

    res.status(201).json({
      titulo,
      sinopsis,
      clasificacion_edad,
      anio,
      director,
      genero,
    });
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// endpoint editar pelicula
app.put("/movie/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;
  let { titulo, genero, anio, director, clasificacion_edad, sinopsis, imagen } = req.body;

  if (!id_pelicula) {
    return res.status(400).json({ error: "Falta el ID del usuario" });
  }

  try {
    let imagenBuffer = Buffer.from(imagen, "base64");
    const [existing] = await db.execute(
      "SELECT id_pelicula FROM pelicula WHERE id_pelicula = ?",
      [id_pelicula]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "pelicula no encontrado" });
    }

    titulo = titulo === "" ? null : titulo;
    genero = genero === "" ? null : genero;
    anio = anio === "" ? null : anio;
    director = director === "" ? null : director;
    clasificacion_edad = clasificacion_edad === "" ? null : clasificacion_edad;
    sinopsis = sinopsis === "" ? null : sinopsis;
    imagenBuffer = imagenBuffer === "" ? null : imagenBuffer;

    await db.execute(
      `UPDATE pelicula 
       SET titulo = COALESCE(?, titulo),
           genero = COALESCE(?, genero),
           anio = COALESCE(?, anio),
           director = COALESCE(?, director),
           clasificacion_edad = COALESCE(?, clasificacion_edad),
           sinopsis = COALESCE(?, sinopsis),
           imagen = COALESCE(?, imagen)
       WHERE id_pelicula = ?`,
      [titulo, genero, anio, director, clasificacion_edad, sinopsis, imagenBuffer, id_pelicula]
    );

    const [updated] = await db.execute(
      "SELECT id_pelicula, titulo, genero, anio, director, clasificacion_edad, sinopsis, imagen, activa FROM pelicula WHERE id_pelicula = ?",
      [id_pelicula]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error("Error al actualizar pelicula:", error);
    res.status(500).json({ error: "Error al actualizar pelicula" });
  }
});

//valoracion
//Endpoint de valoraciones
app.get("/valoracion", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM valoracion");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener las valoraciones", error);
    res.status(500).json({ error: "Error al obtener las valoracions" });
  }
});

//Endpoint de valoraciones especificas
app.get("/valoracion/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;
  if (!id_pelicula) {
    return res.status(400).json({ error: "no existe la pelicula" })
  }

  try {
    const [rows] = await db.query(
      `SELECT v.*, u.nombre
         FROM valoracion v
         JOIN usuario u ON v.usuario_id_usuario = u.id_usuario
         WHERE v.pelicula_id_pelicula = ? AND v.activo = 0 AND u.activa = 0`,
      [id_pelicula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin valoraciones" });
    }
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener pelicula:", error);
    res.status(500).json({ error: "Error al obtener las valoraciones" });
  }
});

// Endpoint de valoraciones por usuario
app.get("/valoracion/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT v.*, p.titulo AS titulo
       FROM valoracion v
       JOIN pelicula p ON v.pelicula_id_pelicula = p.id_pelicula
       WHERE v.usuario_id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin valoraciones de este usuario" });
    }

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener valoraciones del usuario:", error);
    res.status(500).json({ error: "Error al obtener valoraciones del usuario" });
  }
});

// Endpoint de register de valoracion
app.post("/registerOpinion", async (req, res) => {
  const { puntuacion, comentario, usuario_id_usuario, pelicula_id_pelicula } = req.body;

  if (!puntuacion || !comentario || !usuario_id_usuario || !pelicula_id_pelicula) {
    return res.status(400).json({ error: "Faltaron campos", puntuacion, comentario, usuario_id_usuario, pelicula_id_pelicula });
  }

  try {
    const [existing] = await db.execute(
      "SELECT usuario_id_usuario, pelicula_id_pelicula FROM valoracion WHERE usuario_id_usuario = ? AND pelicula_id_pelicula = ?",
      [usuario_id_usuario, pelicula_id_pelicula]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Ya realizaste una valoracion sobre la pelicula" });
    }

    await db.execute(
      "INSERT INTO valoracion (puntuacion, fecha, comentario, usuario_id_usuario, pelicula_id_pelicula) VALUES (?, CURDATE(), ?, ?, ?)",
      [puntuacion, comentario, usuario_id_usuario, pelicula_id_pelicula]
    );

    res.status(201)
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

//endpoint para borrar un comentario
app.delete("/delvaloracion/:id_valoracion", async (req, res) => {
  const { id_valoracion } = req.params;
  try {
    await db.beginTransaction();
    const [rows] = await db.query(
      `SELECT * FROM valoracion WHERE id_valoracion = ?`,
      [id_valoracion]
    );

    if (rows.length === 0) {
      await db.rollback();
      return res.status(404).json({ message: "No disponible el comentario." });
    }

    await db.query(
      "DELETE FROM valoracion WHERE id_valoracion = ?",
      [id_valoracion]
    );

    await db.commit();
    res.status(200).json({ message: "Valoracion eliminada correctamente." });

  } catch (error) {
    await db.rollback();
    console.error("Error al borrar película:", error);
    res.status(500).json({ message: "Error del servidor." });

  }
});

//Producto
// endpoint para alquilar
app.post("/productRent", async (req, res) => {
  const { fecha_fin, usuario_id_usuario, pelicula_id_pelicula } = req.body;

  if (!fecha_fin || !usuario_id_usuario || !pelicula_id_pelicula) {
    return res.status(400).json({ error: "Faltaron campos" });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaFinDate = new Date(fecha_fin);

  if (isNaN(fechaFinDate.getTime())) {
    return res.status(400).json({ error: "Fecha fin invalidada" });
  }

  if (fechaFinDate < hoy) {
    return res.status(400).json({ error: "La fecha de fin no puede ser menor que la fecha actual" });
  }

  try {
    await db.beginTransaction();

    const [productoDisponible] = await db.execute(
      `SELECT id_producto 
       FROM producto 
       WHERE pelicula_id_pelicula = ? AND estado = 'disponible'
       LIMIT 1`,
      [pelicula_id_pelicula]
    );

    if (productoDisponible.length === 0) {
      await db.rollback();
      return res.status(409).json({ error: "No hay copias disponibles" });
    }

    const id_producto = productoDisponible[0].id_producto;

    const [pelicula] = await db.execute(
      `SELECT precio
       FROM pelicula 
       WHERE id_pelicula = ?`,
      [pelicula_id_pelicula]
    );

    if (pelicula.length === 0) {
      await db.rollback();
      return res.status(404).json({ error: "Película no encontrada" });
    }

    const precio = pelicula[0].precio;

    if (precio == null) {
      await db.rollback();
      return res.status(500).json({ error: "La película no tiene precio configurado" });
    }

    const [usuario] = await db.execute(
      "SELECT credito FROM usuario WHERE id_usuario = ?",
      [usuario_id_usuario]
    );

    if (usuario.length === 0) {
      await db.rollback();
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const creditoActual = usuario[0].credito;

    if (creditoActual < precio) {
      await db.rollback();
      return res.status(402).json({ error: "Crédito insuficiente" });
    }

    await db.execute(
      "UPDATE usuario SET credito = credito - ? WHERE id_usuario = ?",
      [precio, usuario_id_usuario]
    );

    await db.execute(
      "UPDATE producto SET estado = 'alquilado' WHERE id_producto = ?",
      [id_producto]
    );

    const fechaSQL = toMySQLDatetime(fecha_fin);

    const [insertAlquiler] = await db.execute(
      `INSERT INTO alquiler (fecha_inicio, fecha_fin, usuario_id_usuario, producto_id_producto, estado)
       VALUES (CURDATE(), ?, ?, ?, 'activo')`,
      [fechaSQL, usuario_id_usuario, id_producto]
    );

    const id_alquiler = insertAlquiler.insertId;

    await db.execute(
      `INSERT INTO pago (pago, fecha_pago, alquiler_id_alquiler)
       VALUES (?, CURDATE(), ?)`,
      [precio, id_alquiler]
    );

    await db.commit();

    res.status(201).json({ message: "Alquiler registrado correctamente" });

  } catch (error) {
    await db.rollback();
    console.error("Error en /productRent:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// Endpoint de alquileres por usuario
app.get("/alquiler/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT al.*, p.titulo AS titulo, pr.id_producto, p.imagen
       FROM alquiler al
       JOIN producto pr ON al.producto_id_producto = pr.id_producto
       JOIN pelicula p ON pr.pelicula_id_pelicula = p.id_pelicula
       WHERE al.usuario_id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin alquileres de este usuario" });
    }

    const peliculas = rows.map(p => {
      let imagenBase64 = null;
      if (p.imagen) {
        imagenBase64 = Buffer.from(p.imagen).toString("base64");
      }

      return {
        id_producto: p.id_producto,
        titulo: p.titulo,
        id_alquiler: p.id_alquiler,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        estado: p.estado,
        usuario_id_usuario: p.usuario_id_usuario,
        imagen: imagenBase64,
        producto_id_producto: p.producto_id_producto
      };
    });

    res.json(peliculas);

  } catch (error) {
    console.error("Error al obtener los alquileres del usuario:", error);
    res.status(500).json({ error: "Error al obtener los alquileres del usuario" });
  }
});

//enpoint disponibilidad del producto
app.get("/producto/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;
  if (!id_pelicula) {
    return res.status(400).json({ error: "no existe la pelicula" })
  }

  try {
    const [rows] = await db.execute(
      `SELECT p.*,
              CASE WHEN COUNT(pr.id_producto) > 0 THEN 'disponible' ELSE 'no disponible' END AS disponibilidad
       FROM pelicula p
       LEFT JOIN producto pr ON pr.pelicula_id_pelicula = p.id_pelicula AND pr.estado = 'disponible'
       WHERE p.id_pelicula = ?
       GROUP BY p.id_pelicula`,
      [id_pelicula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Película no encontrada" });
    }

    const p = rows[0];
    let imagenBase64 = null;
    if (p.imagen) {
      imagenBase64 = Buffer.from(p.imagen).toString("base64");
    }

    const peliculas = {
      id_pelicula: p.id_pelicula,
      titulo: p.titulo,
      sinopsis: p.sinopsis,
      clasificacion_edad: p.clasificacion_edad,
      anio: p.anio,
      director: p.director,
      genero: p.genero,
      imagen: imagenBase64,
      disponibilidad: p.disponibilidad,
      activa: p.activa
    };

    res.json(peliculas);
  } catch (error) {
    console.error("Error al obtener pelicula:", error);
    res.status(500).json({ error: "Error al obtener pelicula" });
  }
});

// endpoint listado de los productos por cantidad
app.get("/listproducto", async (req, res) => {

  try {
    const [rows] = await db.execute(
      `SELECT p.*,
    COUNT(pr.id_producto) AS total_productos,
    SUM(CASE WHEN pr.estado = 'disponible' THEN 1 ELSE 0 END) AS disponibles,
    SUM(CASE WHEN pr.estado = 'alquilado' THEN 1 ELSE 0 END) AS alquilados
    FROM pelicula p
    LEFT JOIN producto pr 
    ON pr.pelicula_id_pelicula = p.id_pelicula
    GROUP BY p.id_pelicula, p.titulo
    ORDER BY p.id_pelicula`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Película no encontrada" });
    }

    const peliculas = rows.map(p => {
      let imagenBase64 = null;
      if (p.imagen) {
        imagenBase64 = Buffer.from(p.imagen).toString("base64");
      }

      return {
        id_pelicula: p.id_pelicula,
        total_productos: p.total_productos,
        disponibles: p.disponibles,
        titulo: p.titulo,
        sinopsis: p.sinopsis,
        clasificacion_edad: p.clasificacion_edad,
        anio: p.anio,
        director: p.director,
        genero: p.genero,
        imagen: imagenBase64,
        disponibilidad: p.disponibilidad,
        activa: p.activa,
        alquilados: p.alquilados
      };
    });

    res.json(peliculas);
  } catch (error) {
    console.error("Error al obtener pelicula:", error);
    res.status(500).json({ error: "Error al obtener pelicula" });
  }
});

//endpoint para desactivar pelicula y copias en inventario
app.delete("/delproducto/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;

  try {
    await db.beginTransaction();
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN LOWER(estado) = 'alquilado' THEN 1 ELSE 0 END) AS alquilados
      FROM producto WHERE pelicula_id_pelicula = ?`,
      [id_pelicula]
    );

    const { total, alquilados } = rows[0];

    if (Number(total) === 0) {
      await db.rollback();
      return res.status(404).json({ message: "La película no existe o no tiene productos." });
    }

    if (alquilados > 0) {
      await db.rollback();
      return res.status(400).json({
        message: "No se puede borrar la película porque tiene productos alquilados."
      });
    }

    await db.query(
      "UPDATE producto SET estado = 'inactivo' WHERE pelicula_id_pelicula = ?",
      [id_pelicula]
    );

    const [deleteResult] = await db.query(
      "UPDATE pelicula SET activa = 0 WHERE id_pelicula = ?",
      [id_pelicula]
    );

    if (deleteResult.affectedRows === 0) {
      await db.rollback();
      return res.status(404).json({ message: "Película no encontrada." });
    }

   
    await db.commit();
    res.json({ message: "Película desactivada correctamente." });

  } catch (error) {
    await db.rollback();
    console.error("Error al borrar película:", error);
    res.status(500).json({ message: "Error del servidor." });

  }
});

//Endpoint para activar la pelicula y copias en el inventario
app.put("/actPelicula/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;

  try {
    await db.beginTransaction();

    const [peliculaRows] = await db.query(
      "SELECT activa FROM pelicula WHERE id_pelicula = ?",
      [id_pelicula]
    );

    if (peliculaRows.length === 0) {
      await db.rollback();
      return res.status(404).json({ message: "Película no encontrada." });
    }

    await db.query(
      "UPDATE pelicula SET activa = 1 WHERE id_pelicula = ?",
      [id_pelicula]
    );
    

    await db.query(
      "UPDATE producto SET estado = 'disponible' WHERE pelicula_id_pelicula = ?",
      [id_pelicula]
    );

    

    await db.commit();
    res.json({ message: "Película activada correctamente." });

  } catch (error) {
    await db.rollback();
    console.error("Error al activar película:", error);
    res.status(500).json({ message: "Error del servidor." });
  }
});


//endpoint para agregar y quitar total de productos
app.put("/producto/updateTotal/:id_pelicula", async (req, res) => {
  const { id_pelicula } = req.params;
  const { total } = req.body;

  try {
    const [[counts]] = await db.execute(
      `SELECT 
          SUM(estado != 'inactivo') AS totalActual,
          SUM(estado = 'inactivo') AS inactivos,
          SUM(estado = 'disponible') AS disponibles,
          SUM(estado = 'alquilado') AS alquilados
       FROM producto
       WHERE pelicula_id_pelicula = ?`,
      [id_pelicula]
    );

    const totalActual = counts.totalActual;
    const inactivos = counts.inactivos;
    const disponibles = counts.disponibles;
    const alquilados = counts.alquilados;

    if (total === totalActual)
      return res.json({ message: "No hay cambios." });

    if (total > totalActual) {
      let cantidadAAgregar = total - totalActual;

      const [r1] = await db.execute(
        `UPDATE producto
         SET estado = 'disponible'
         WHERE pelicula_id_pelicula = ? AND estado = 'inactivo'
         LIMIT ${cantidadAAgregar}`,
        [id_pelicula]
      );

      cantidadAAgregar -= r1.affectedRows;

      for (let i = 0; i < cantidadAAgregar; i++) {
        await db.execute(
          `INSERT INTO producto (estado, pelicula_id_pelicula)
           VALUES ('disponible', ?)`,
          [id_pelicula]
        );
      }

      return res.json({ message: "Productos aumentados correctamente" });
    }

    const cantidadAQuitar = totalActual - total;

    if (cantidadAQuitar > disponibles) {
      return res
        .status(400)
        .json({ error: "No puedes eliminar productos alquilados" });
    }

    await db.execute(
      `UPDATE producto
       SET estado = 'inactivo'
       WHERE pelicula_id_pelicula = ? AND estado = 'disponible'
       LIMIT ${cantidadAQuitar}`,
      [id_pelicula]
    );

    return res.json({ message: "Productos disminuidos correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar productos" });
  }
});



//endpoint de devolver pelicula
app.post("/devolverproducto/:id_producto", async (req, res) => {
  const { id_producto } = req.params;
  try {

    await db.beginTransaction();

    const [peli] = await db.query(
      `SELECT pelicula.activa 
             FROM producto 
             JOIN pelicula ON pelicula.id_pelicula = producto.pelicula_id_pelicula
             WHERE id_producto = ?`,
      [id_producto]
    );

    if (peli.length === 0) {
      await db.rollback();
      return res.status(404).json({ message: "Producto no encontrado." });
    }


    const activa = peli[0].activa;
    if (activa === 1) {
      await db.query(
        `UPDATE producto SET estado = 'disponible' WHERE id_producto = ?`,
        [id_producto]
      );
    } else {
      await db.query(
        `UPDATE producto SET estado = 'inactivo' WHERE id_producto = ?`,
        [id_producto]
      );
    }

    await db.query(
      `UPDATE alquiler SET estado = 'devuelto'
             WHERE producto_id_producto = ? AND estado = 'activo'`,
      [id_producto]
    );
    await db.commit();

    res.json({ message: "Producto devuelto correctamente." });

  } catch (error) {
    await db.rollback();
    console.error(error);
    res.status(500).json({ message: "Error al devolver el producto." });
  }
});

// endpoint lista de alquileres de usuarios
app.get("/alquileres", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
          u.id_usuario,
          u.nombre,
          u.dni,
          p.titulo,
          a.fecha_inicio,
          a.fecha_fin,
          a.id_alquiler,
          a.estado as 'estado_a',
          pr.id_producto,
          pr.estado as 'estado_pr'
       FROM alquiler a
       JOIN usuario u ON u.id_usuario = a.usuario_id_usuario
       JOIN producto pr ON pr.id_producto = a.producto_id_producto
       JOIN pelicula p ON p.id_pelicula = pr.pelicula_id_pelicula`
    );

    res.json(rows);

  } catch (error) {
    console.error("Error al obtener alquileres:", error);
    res.status(500).json({ error: "Error al obtener alquileres" });
  }
});



app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
