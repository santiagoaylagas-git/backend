const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function crear(req, res) {
  try {
    const { id_turno, diagnostico, tratamiento, observaciones } = req.body;

    if (!id_turno || !diagnostico) {
      return responder(res, 400, 'Faltan datos obligatorios: id_turno, diagnostico');
    }

    const [turnos] = await pool.query(
      `SELECT turno.id, turno.estado, turno.id_paciente, agenda.id_medico
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       WHERE turno.id = ?`,
      [id_turno]
    );
    if (turnos.length === 0) {
      return responder(res, 404, 'Turno no encontrado');
    }
    const turno = turnos[0];

    if (turno.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede registrar historial de turnos que él mismo atendió');
    }

    if (turno.estado !== 'atendido') {
      return responder(res, 400, 'El turno debe estar en estado atendido para registrar su historial');
    }

    const [existentes] = await pool.query('SELECT id FROM historial_clinico WHERE id_turno = ?', [id_turno]);
    if (existentes.length > 0) {
      return responder(res, 409, 'Ya existe un historial clínico registrado para este turno');
    }

    const [resultado] = await pool.query(
      'INSERT INTO historial_clinico (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
      [id_turno, req.usuario.id, turno.id_paciente, diagnostico, tratamiento || null, observaciones || null]
    );

    return responder(res, 201, 'ok', {
      id: resultado.insertId,
      id_turno,
      id_medico: req.usuario.id,
      id_paciente: turno.id_paciente,
      diagnostico,
      tratamiento: tratamiento || null,
      observaciones: observaciones || null,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al registrar el historial clínico');
  }
}

async function consultar(req, res) {
  try {
    const { idPaciente } = req.params;

    if (req.usuario.rol === 'paciente' && Number(idPaciente) !== req.usuario.id) {
      return responder(res, 403, 'Un paciente solo puede consultar su propio historial clínico');
    }

    let filas;
    if (req.usuario.rol === 'medico') {
      [filas] = await pool.query(
        `SELECT id, id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha_registro
         FROM historial_clinico
         WHERE id_paciente = ? AND id_medico = ?
         ORDER BY fecha_registro DESC`,
        [idPaciente, req.usuario.id]
      );
    } else {
      [filas] = await pool.query(
        `SELECT id, id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha_registro
         FROM historial_clinico
         WHERE id_paciente = ?
         ORDER BY fecha_registro DESC`,
        [idPaciente]
      );
    }

    return responder(res, 200, 'ok', filas);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar el historial clínico');
  }
}

module.exports = { crear, consultar };
