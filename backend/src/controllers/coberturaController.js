const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function listar(req, res) {
  try {
    const [coberturas] = await pool.query('SELECT id, nombre FROM cobertura ORDER BY nombre');
    return responder(res, 200, 'ok', coberturas);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al obtener las coberturas');
  }
}

module.exports = { listar };
