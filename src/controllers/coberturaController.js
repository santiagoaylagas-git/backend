const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { validarLargos } = require('../utils/validaciones');

async function listar(req, res) {
  try {
    const [coberturas] = await pool.query('SELECT id, nombre FROM cobertura ORDER BY nombre');
    return responder(res, 200, 'ok', coberturas);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al obtener las coberturas');
  }
}

async function crear(req, res) {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return responder(res, 400, 'Falta el dato obligatorio: nombre');
    }

    const errorLargo = validarLargos(req.body, { nombre: 30 });
    if (errorLargo) {
      return responder(res, 400, errorLargo);
    }

    const [resultado] = await pool.query('INSERT INTO cobertura (nombre) VALUES (?)', [nombre]);

    return responder(res, 201, 'ok', { id: resultado.insertId, nombre });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear la cobertura');
  }
}

async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return responder(res, 400, 'Falta el dato obligatorio: nombre');
    }

    const errorLargo = validarLargos(req.body, { nombre: 30 });
    if (errorLargo) {
      return responder(res, 400, errorLargo);
    }

    const [resultado] = await pool.query('UPDATE cobertura SET nombre = ? WHERE id = ?', [nombre, id]);

    if (resultado.affectedRows === 0) {
      return responder(res, 404, 'Cobertura no encontrada');
    }

    return responder(res, 200, 'ok', { id: Number(id), nombre });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al modificar la cobertura');
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id]);
    if (coberturas.length === 0) {
      return responder(res, 404, 'Cobertura no encontrada');
    }

    const [usuarios] = await pool.query('SELECT id FROM usuario WHERE id_cobertura = ?', [id]);
    const [turnos] = await pool.query('SELECT id FROM turno WHERE id_cobertura = ?', [id]);

    if (usuarios.length > 0 || turnos.length > 0) {
      return responder(res, 409, 'No se puede eliminar la cobertura: tiene usuarios o turnos asociados');
    }

    await pool.query('DELETE FROM cobertura WHERE id = ?', [id]);
    return responder(res, 200, 'ok', { id: Number(id) });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al eliminar la cobertura');
  }
}

module.exports = { listar, crear, modificar, eliminar };
