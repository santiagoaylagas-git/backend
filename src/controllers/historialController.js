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

    const condiciones = ['historial_clinico.id_paciente = ?'];
    const valores = [idPaciente];

    // El medico solo ve los registros de los turnos que atendio el mismo.
    if (req.usuario.rol === 'medico') {
      condiciones.push('historial_clinico.id_medico = ?');
      valores.push(req.usuario.id);
    }

    const [filas] = await pool.query(
      `SELECT historial_clinico.id, historial_clinico.id_turno, historial_clinico.id_medico,
              historial_clinico.id_paciente, historial_clinico.diagnostico, historial_clinico.tratamiento,
              historial_clinico.observaciones, historial_clinico.fecha_registro,
              turno.fecha, turno.hora, turno.nota,
              medico.nombre AS medico_nombre, medico.apellido AS medico_apellido,
              especialidad.descripcion AS especialidad, sede.nombre AS sede
       FROM historial_clinico
       JOIN turno ON historial_clinico.id_turno = turno.id
       JOIN agenda ON turno.id_agenda = agenda.id
       JOIN usuario medico ON historial_clinico.id_medico = medico.id
       JOIN especialidad ON agenda.id_especialidad = especialidad.id
       JOIN sede ON agenda.id_sede = sede.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY turno.fecha DESC, turno.hora DESC, historial_clinico.fecha_registro DESC`,
      valores
    );

    return responder(res, 200, 'ok', filas);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar el historial clínico');
  }
}

module.exports = { crear, consultar };
