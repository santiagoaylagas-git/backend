const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function health(req, res) {
  try {
    await pool.query('SELECT 1');
    return responder(res, 200, 'ok', { db: 'conectada' });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'No se pudo conectar a la base de datos');
  }
}

module.exports = { health };
