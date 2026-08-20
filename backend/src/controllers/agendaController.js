const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function crear(req, res) {
  try {
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return responder(
        res,
        400,
        'Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede'
      );
    }

    if (req.usuario.rol === 'medico' && Number(id_medico) !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede cargar agenda para sí mismo');
    }

    const [medicos] = await pool.query("SELECT id FROM usuario WHERE id = ? AND rol = 'medico'", [id_medico]);
    if (medicos.length === 0) {
      return responder(res, 400, 'El id_medico indicado no corresponde a un médico válido');
    }

    const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id_especialidad]);
    if (especialidades.length === 0) {
      return responder(res, 400, 'La especialidad indicada no existe');
    }

    const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
    if (sedes.length === 0) {
      return responder(res, 400, 'La sede indicada no existe');
    }

    const [resultado] = await pool.query(
      'INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede) VALUES (?, ?, ?, ?, ?, ?)',
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    return responder(res, 201, 'ok', {
      id: resultado.insertId,
      hora_entrada,
      hora_salida,
      fecha,
      id_medico,
      id_especialidad,
      id_sede,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear la agenda');
  }
}

async function listar(req, res) {
  try {
    const { id_sede, fecha } = req.query;
    let { id_medico } = req.query;

    if (req.usuario.rol === 'medico') {
      id_medico = req.usuario.id;
    }

    const condiciones = [];
    const valores = [];

    if (id_medico) {
      condiciones.push('id_medico = ?');
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push('id_sede = ?');
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push('fecha = ?');
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [agenda] = await pool.query(
      `SELECT id, hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede FROM agenda ${where} ORDER BY fecha, hora_entrada`,
      valores
    );

    return responder(res, 200, 'ok', agenda);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar la agenda');
  }
}

async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrada, hora_salida, fecha, id_especialidad, id_sede } = req.body;

    const [registros] = await pool.query('SELECT * FROM agenda WHERE id = ?', [id]);
    if (registros.length === 0) {
      return responder(res, 404, 'Registro de agenda no encontrado');
    }

    const registro = registros[0];

    if (req.usuario.rol === 'medico' && registro.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede modificar su propia agenda');
    }

    if (!hora_entrada || !hora_salida || !fecha || !id_especialidad || !id_sede) {
      return responder(
        res,
        400,
        'Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_especialidad, id_sede'
      );
    }

    const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id_especialidad]);
    if (especialidades.length === 0) {
      return responder(res, 400, 'La especialidad indicada no existe');
    }

    const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
    if (sedes.length === 0) {
      return responder(res, 400, 'La sede indicada no existe');
    }

    await pool.query(
      'UPDATE agenda SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_especialidad = ?, id_sede = ? WHERE id = ?',
      [hora_entrada, hora_salida, fecha, id_especialidad, id_sede, id]
    );

    return responder(res, 200, 'ok', {
      id: Number(id),
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: registro.id_medico,
      id_especialidad,
      id_sede,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al modificar la agenda');
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [registros] = await pool.query('SELECT * FROM agenda WHERE id = ?', [id]);
    if (registros.length === 0) {
      return responder(res, 404, 'Registro de agenda no encontrado');
    }

    const registro = registros[0];

    if (req.usuario.rol === 'medico' && registro.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede eliminar turnos de su propia agenda');
    }

    const [turnos] = await pool.query('SELECT id FROM turno WHERE id_agenda = ?', [id]);
    if (turnos.length > 0) {
      return responder(res, 409, 'No se puede eliminar el turno de agenda: tiene turnos de pacientes asociados');
    }

    await pool.query('DELETE FROM agenda WHERE id = ?', [id]);
    return responder(res, 200, 'ok', { id: Number(id) });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al eliminar la agenda');
  }
}

module.exports = { crear, listar, modificar, eliminar };
