const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function crear(req, res) {
  try {
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return responder(res, 400, 'Faltan datos obligatorios: nombre, direccion, telefono');
    }

    const [resultado] = await pool.query(
      'INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)',
      [nombre, direccion, telefono]
    );

    return responder(res, 201, 'ok', { id: resultado.insertId, nombre, direccion, telefono });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear la sede');
  }
}

async function listar(req, res) {
  try {
    const [sedes] = await pool.query('SELECT id, nombre, direccion, telefono FROM sede ORDER BY nombre');
    return responder(res, 200, 'ok', sedes);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar las sedes');
  }
}

async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return responder(res, 400, 'Faltan datos obligatorios: nombre, direccion, telefono');
    }

    const [resultado] = await pool.query(
      'UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
      [nombre, direccion, telefono, id]
    );

    if (resultado.affectedRows === 0) {
      return responder(res, 404, 'Sede no encontrada');
    }

    return responder(res, 200, 'ok', { id: Number(id), nombre, direccion, telefono });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al modificar la sede');
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id]);
    if (sedes.length === 0) {
      return responder(res, 404, 'Sede no encontrada');
    }

    const [medicos] = await pool.query(
      "SELECT id FROM usuario WHERE id_sede = ? AND rol = 'medico'",
      [id]
    );
    const [operadores] = await pool.query(
      "SELECT id FROM usuario WHERE id_sede = ? AND rol = 'operador'",
      [id]
    );
    const [agenda] = await pool.query('SELECT id FROM agenda WHERE id_sede = ?', [id]);

    if (medicos.length > 0 || operadores.length > 0 || agenda.length > 0) {
      return responder(res, 409, 'No se puede eliminar la sede: tiene médicos, operadores o agenda asociada');
    }

    await pool.query('DELETE FROM sede WHERE id = ?', [id]);
    return responder(res, 200, 'ok', { id: Number(id) });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al eliminar la sede');
  }
}

module.exports = { crear, listar, modificar, eliminar };
