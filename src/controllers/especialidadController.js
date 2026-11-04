const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { validarLargos } = require('../utils/validaciones');

async function crear(req, res) {
  try {
    const { descripcion } = req.body;

    if (!descripcion) {
      return responder(res, 400, 'Falta el dato obligatorio: descripcion');
    }

    const errorLargo = validarLargos(req.body, { descripcion: 30 });
    if (errorLargo) {
      return responder(res, 400, errorLargo);
    }

    const [resultado] = await pool.query(
      'INSERT INTO especialidad (descripcion) VALUES (?)',
      [descripcion]
    );

    return responder(res, 201, 'ok', { id: resultado.insertId, descripcion });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear la especialidad');
  }
}

async function listar(req, res) {
  try {
    const [especialidades] = await pool.query('SELECT id, descripcion FROM especialidad ORDER BY descripcion');
    return responder(res, 200, 'ok', especialidades);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar las especialidades');
  }
}

async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion) {
      return responder(res, 400, 'Falta el dato obligatorio: descripcion');
    }

    const errorLargo = validarLargos(req.body, { descripcion: 30 });
    if (errorLargo) {
      return responder(res, 400, errorLargo);
    }

    const [resultado] = await pool.query(
      'UPDATE especialidad SET descripcion = ? WHERE id = ?',
      [descripcion, id]
    );

    if (resultado.affectedRows === 0) {
      return responder(res, 404, 'Especialidad no encontrada');
    }

    return responder(res, 200, 'ok', { id: Number(id), descripcion });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al modificar la especialidad');
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id]);
    if (especialidades.length === 0) {
      return responder(res, 404, 'Especialidad no encontrada');
    }

    const [asociaciones] = await pool.query(
      'SELECT id FROM medico_especialidad WHERE id_especialidad = ?',
      [id]
    );
    const [agenda] = await pool.query('SELECT id FROM agenda WHERE id_especialidad = ?', [id]);

    if (asociaciones.length > 0 || agenda.length > 0) {
      return responder(res, 409, 'No se puede eliminar la especialidad: tiene médicos o agenda asociada');
    }

    await pool.query('DELETE FROM especialidad WHERE id = ?', [id]);
    return responder(res, 200, 'ok', { id: Number(id) });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al eliminar la especialidad');
  }
}

module.exports = { crear, listar, modificar, eliminar };
