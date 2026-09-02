const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { crearNotificacion } = require('../utils/notificaciones');

async function crear(req, res) {
  try {
    const { id_especialidad, id_sede, id_medico, fecha, hora, nota } = req.body;
    let { id_paciente } = req.body;

    if (!id_especialidad || !id_sede || !id_medico || !fecha || !hora || !nota) {
      return responder(
        res,
        400,
        'Faltan datos obligatorios: id_especialidad, id_sede, id_medico, fecha, hora, nota'
      );
    }

    if (req.usuario.rol === 'paciente') {
      id_paciente = req.usuario.id;
    } else if (req.usuario.rol === 'operador') {
      if (!id_paciente) {
        return responder(res, 400, 'Falta el dato obligatorio: id_paciente');
      }
      if (Number(id_sede) !== req.usuario.id_sede) {
        return responder(res, 403, 'Un operador solo puede solicitar turnos en su propia sede');
      }
    }

    const [pacientes] = await pool.query(
      "SELECT id, id_cobertura FROM usuario WHERE id = ? AND rol = 'paciente'",
      [id_paciente]
    );
    if (pacientes.length === 0) {
      return responder(res, 400, 'El id_paciente indicado no corresponde a un paciente válido');
    }
    const id_cobertura = pacientes[0].id_cobertura;

    const [agendas] = await pool.query(
      'SELECT id FROM agenda WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ? AND ? BETWEEN hora_entrada AND hora_salida',
      [id_medico, id_especialidad, id_sede, fecha, hora]
    );
    if (agendas.length === 0) {
      return responder(res, 400, 'El horario solicitado no está disponible en la agenda del médico');
    }
    const id_agenda = agendas[0].id;

    const [ocupados] = await pool.query(
      "SELECT id FROM turno WHERE id_agenda = ? AND fecha = ? AND hora = ? AND estado = 'confirmado'",
      [id_agenda, fecha, hora]
    );
    if (ocupados.length > 0) {
      return responder(res, 409, 'El horario solicitado ya está reservado');
    }

    const [resultado] = await pool.query(
      "INSERT INTO turno (nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado) VALUES (?, ?, ?, ?, ?, ?, 'confirmado')",
      [nota, id_agenda, fecha, hora, id_paciente, id_cobertura]
    );

    await crearNotificacion(
      id_paciente,
      'turno_confirmado',
      `Tu turno del ${fecha} a las ${hora} fue confirmado.`
    );

    return responder(res, 201, 'ok', {
      id: resultado.insertId,
      nota,
      id_agenda,
      fecha,
      hora,
      id_paciente,
      id_cobertura,
      estado: 'confirmado',
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear el turno');
  }
}

async function obtenerTurnoConAgenda(id) {
  const [filas] = await pool.query(
    `SELECT turno.*, agenda.id_medico, agenda.id_sede, agenda.id_especialidad
     FROM turno
     JOIN agenda ON turno.id_agenda = agenda.id
     WHERE turno.id = ?`,
    [id]
  );
  return filas[0];
}

async function cancelar(req, res) {
  try {
    const { id } = req.params;

    const turno = await obtenerTurnoConAgenda(id);
    if (!turno) {
      return responder(res, 404, 'Turno no encontrado');
    }

    if (req.usuario.rol === 'paciente' && turno.id_paciente !== req.usuario.id) {
      return responder(res, 403, 'Un paciente solo puede cancelar sus propios turnos');
    }
    if (
      (req.usuario.rol === 'operador' || req.usuario.rol === 'medico') &&
      turno.id_sede !== req.usuario.id_sede
    ) {
      return responder(res, 403, 'Solo puede cancelar turnos de su propia sede');
    }

    if (turno.estado !== 'confirmado') {
      return responder(res, 409, `El turno no se puede cancelar porque su estado actual es '${turno.estado}'`);
    }

    await pool.query("UPDATE turno SET estado = 'cancelado' WHERE id = ?", [id]);

    await crearNotificacion(
      turno.id_paciente,
      'turno_cancelado',
      `Tu turno del ${turno.fecha} a las ${turno.hora} fue cancelado.`
    );
    await crearNotificacion(
      turno.id_medico,
      'turno_cancelado',
      `El turno del ${turno.fecha} a las ${turno.hora} fue cancelado.`
    );

    return responder(res, 200, 'ok', { id: Number(id), estado: 'cancelado' });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al cancelar el turno');
  }
}

async function atender(req, res) {
  try {
    const { id } = req.params;

    const turno = await obtenerTurnoConAgenda(id);
    if (!turno) {
      return responder(res, 404, 'Turno no encontrado');
    }

    if (turno.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede marcar como atendidos sus propios turnos');
    }

    if (turno.estado !== 'confirmado') {
      return responder(res, 409, `El turno no se puede atender porque su estado actual es '${turno.estado}'`);
    }

    await pool.query("UPDATE turno SET estado = 'atendido' WHERE id = ?", [id]);

    await crearNotificacion(
      turno.id_paciente,
      'turno_atendido',
      `Tu turno del ${turno.fecha} a las ${turno.hora} fue registrado como atendido.`
    );

    return responder(res, 200, 'ok', { id: Number(id), estado: 'atendido' });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al marcar el turno como atendido');
  }
}

async function misTurnos(req, res) {
  try {
    const [turnos] = await pool.query(
      `SELECT turno.id, turno.nota, turno.fecha, turno.hora, turno.estado,
              agenda.id_medico, agenda.id_sede, agenda.id_especialidad
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       WHERE turno.id_paciente = ?
       ORDER BY turno.fecha ASC, turno.hora ASC`,
      [req.usuario.id]
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos');
  }
}

async function turnosMedico(req, res) {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return responder(res, 400, 'Falta el parámetro obligatorio: fecha');
    }

    const [turnos] = await pool.query(
      `SELECT turno.id, turno.nota, turno.fecha, turno.hora, turno.estado, turno.id_paciente,
              agenda.id_sede, agenda.id_especialidad
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       WHERE agenda.id_medico = ? AND turno.fecha = ?
       ORDER BY turno.hora ASC`,
      [req.usuario.id, fecha]
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos del médico');
  }
}

async function turnosSede(req, res) {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return responder(res, 400, 'Falta el parámetro obligatorio: fecha');
    }

    const [turnos] = await pool.query(
      `SELECT turno.id, turno.nota, turno.fecha, turno.hora, turno.estado, turno.id_paciente,
              agenda.id_medico, agenda.id_especialidad
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       WHERE agenda.id_sede = ? AND turno.fecha = ?
       ORDER BY turno.hora ASC`,
      [req.usuario.id_sede, fecha]
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos de la sede');
  }
}

module.exports = { crear, cancelar, atender, misTurnos, turnosMedico, turnosSede };
