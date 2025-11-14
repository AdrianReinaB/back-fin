import express from "express";
import bodyParser from "body-parser";
import connect from './dbConnection.mjs';
import cors from "cors";

const app = express();
app.use(bodyParser.json());
const db = await connect();

app.use(cors());

// Endpoint de login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id_usuario, nombre, apellido, telefono, email, rol, credito FROM usuario WHERE email = ? AND password = ?",
      [email, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Endpoint de register
app.post("/register", async (req, res) => {
  const { nombre, apellido, email, password, telefono } = req.body;

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

    const [result] = await db.execute(
      "INSERT INTO usuario (nombre, apellido, email, password, telefono) VALUES (?, ?, ?, ?, ?)",
      [nombre, apellido, email, password, telefono]
    );

    res.status(201).json({
      id_usuario: result.insertId,
      nombre,
      apellido,
      email,
      telefono,
    });
    console.log("res" + res.nombre)
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
    console.log("buscado usuario")
    const [rows] = await db.execute(
      "SELECT * FROM usuario where id_usuario = ?",
      [id_usuario]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin usuarios" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener pelicula:", error);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

//endpoint de actualizar el usuario
app.put("/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;
  let { nombre, apellido, telefono, email, password } = req.body;

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
    email = email === "" ? null : email;
    password = password === "" ? null : password;

    await db.execute(
      `UPDATE usuario 
       SET nombre = COALESCE(?, nombre),
           apellido = COALESCE(?, apellido),
           telefono = COALESCE(?, telefono),
           email = COALESCE(?, email),
           password = COALESCE(?, password)
       WHERE id_usuario = ?`,
      [nombre, apellido, telefono, email, password, id_usuario]
    );

    // Devolver el usuario actualizado
    const [updated] = await db.execute(
      "SELECT id_usuario, nombre, apellido, telefono, email, rol, credito FROM usuario WHERE id_usuario = ?",
      [id_usuario]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

//Pelicula
//Endpoint de peliculas
app.get("/peliculas", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM pelicula");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener peliculas:", error);
    res.status(500).json({ error: "Error al obtener peliculas" });
  }
});

//Endpoint de pelicula
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
  const { titulo, sinopsis, clasificacion_edad, año, director, genero, imagen } = req.body;

  if (!titulo || !sinopsis || !clasificacion_edad || !año || !director || !genero || !imagen) {
    return res.status(400).json({ error: "Faltaron campos" });
  }

  try {
    const [existing] = await db.execute(
      "SELECT titulo FROM pelicula WHERE titulo = ?",
      [titulo]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "La pelicula ya está registrada" });
    }

    await db.execute(
      "INSERT INTO pelicula (titulo, sinopsis, clasificacion_edad, año, director, genero, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [titulo, sinopsis, clasificacion_edad, año, director, genero, imagen]
    );

    res.status(201).json({
      titulo,
      sinopsis,
      clasificacion_edad,
      año,
      director,
      genero,
    });
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error en el servidor" });
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
    console.log("buscado valoraciones")
    const [rows] = await db.execute(
      "SELECT * FROM valoracion where pelicula_id_pelicula = ?",
      [id_pelicula]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin valoraciones" });
    }
    res.json(rows);
    console.log("Dando valoraciones")
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
    console.log("Valoraciones obtenidas:", rows);

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

//Producto
// endpoint para alquilar
app.post("/productRent", async (req, res) => {
  const { fecha_inicio, fecha_fin, usuario_id_usuario, pelicula_id_pelicula } = req.body;

  if (!fecha_inicio || !fecha_fin || !usuario_id_usuario || !pelicula_id_pelicula) {
    return res.status(400).json({ error: "Faltaron campos", fecha_inicio, fecha_fin, usuario_id_usuario, pelicula_id_pelicula });
  }

  try {
    const [existing] = await db.execute(
      "SELECT * FROM producto WHERE pelicula_id_pelicula = ? AND estado = 'disponible' LIMIT 1",
       [pelicula_id_pelicula]
    );

    if (existing.length === 0) {
      return res.status(409).json({ error: "No hay peliculas disponibles" });
    }

    const productoId = existing[0].id_producto;
    await db.execute(
      "UPDATE producto SET fecha_inicio = ?, fecha_fin = ?, estado = 'alquilado', usuario_id_usuario = ? WHERE id_producto = ?",
      [fecha_inicio, fecha_fin, usuario_id_usuario, productoId]
    );

    res.status(201)
  } catch (error) {
    console.error("Error en /productRent:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Endpoint de alquileres por usuario
app.get("/producto/usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT pr.*, p.titulo AS titulo
       FROM producto pr
       JOIN pelicula p ON pr.pelicula_id_pelicula = p.id_pelicula
       WHERE pr.usuario_id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sin alquileres de este usuario" });
    }
    console.log("Alquileres obtenidos:", rows);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los alquileres del usuario:", error);
    res.status(500).json({ error: "Error al obtener los alquileres del usuario" });
  }
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
