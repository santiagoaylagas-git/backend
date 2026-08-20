const pool = require('../database/db');

async function crearNotificacion(id_usuario, tipo, mensaje) {
  await pool.query(
    'INSERT INTO notificacion (id_usuario, tipo, mensaje, leida) VALUES (?, ?, ?, 0)',
    [id_usuario, tipo, mensaje]
  );
}

module.exports = { crearNotificacion };
