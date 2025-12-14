// import mysql from 'mysql2/promise';

// async function connect() {
//   try {
//     const connection = await mysql.createConnection({
//       // host: 'localhost',
//       // //port: 25589,
//       // user: 'root',
//       // password: 'root',
//       // database: 'proyect',
//       host: 'yamanote.proxy.rlwy.net',
//       port: 25589,
//       user: 'root',
//       password: 'nfkHumOGORPjizoABOVtKyYuQqZQnzGl',
//       database: 'railway',
//     });
//     console.log('Connection to MySQL established.');
//     return connection;
//   } catch (error) {
//     console.error('Error connecting to MySQL:', error);
//     throw error;
//   }
// }

// export default connect;
// dbConnection.mjs
import mysql from "mysql2/promise";

export default async function connect() {
  try {
    const connection = await mysql.createConnection(process.env.MYSQL_URL);
    console.log("✅ Conexión a MySQL en Railway establecida.");
    return connection;
  } catch (error) {
    console.error("❌ Error conectando a MySQL:", error);
    throw error;
  }
}