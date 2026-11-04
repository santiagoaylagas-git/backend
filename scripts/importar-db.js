// Crea (o recrea desde cero) la base de datos e importa database/clinica_ampliada.sql.txt.
// Funciona en cualquier sistema operativo: usa el driver mysql2 del propio backend,
// por lo que no hace falta tener el cliente "mysql" en el PATH.
// Uso:  npm run db:importar
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const archivo = path.join(__dirname, '..', 'database', 'clinica_ampliada.sql.txt');
  const nombreBase = process.env.DB_NAME;

  if (!nombreBase || !/^\w+$/.test(nombreBase)) {
    throw new Error('DB_NAME no está definido en .env o tiene caracteres inválidos');
  }

  const sql = fs.readFileSync(archivo, 'utf8');
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    process.stdout.write(`Recreando la base '${nombreBase}'... `);
    await conexion.query(`DROP DATABASE IF EXISTS \`${nombreBase}\``);
    await conexion.query(`CREATE DATABASE \`${nombreBase}\` CHARACTER SET utf8 COLLATE utf8_general_ci`);
    await conexion.query(`USE \`${nombreBase}\``);
    console.log('ok');

    process.stdout.write(`Importando ${path.basename(archivo)}... `);
    await conexion.query(sql);
    console.log('ok');

    const [tablas] = await conexion.query('SHOW TABLES');
    console.log(`Listo: ${tablas.length} tablas creadas con los datos de prueba.`);
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  console.error(`\nNo se pudo importar la base: ${error.message}`);
  process.exit(1);
});
