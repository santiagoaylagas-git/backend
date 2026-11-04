const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { notificarVarios } = require('../utils/notificaciones');
const { esFechaValida, esHoraValida, horariosDelRango, formatearFecha } = require('../utils/fechas');

// Datos del turno con nombres resueltos, para los listados y las notificaciones.
const SELECT_TURNO = `
  SELECT turno.id, turno.nota, turno.fecha, turno.hora, turno.estado, turno.id_agenda,
         turno.id_paciente, paciente.nombre AS paciente_nombre, paciente.apellido AS paciente_apellido,
         paciente.dni AS paciente_dni, paciente.fecha_nacimiento AS paciente_fecha_nacimiento,
         turno.id_cobertura, cobertura.nombre AS cobertura,
         agenda.id_medico, medico.nombre AS medico_nombre, medico.apellido AS medico_apellido,
         agenda.id_especialidad, especialidad.descripcion AS especialidad,
         agenda.id_sede, sede.nombre AS sede
  FROM turno
  JOIN agenda ON turno.id_agenda = agenda.id
  JOIN usuario paciente ON turno.id_paciente = paciente.id
  JOIN usuario medico ON agenda.id_medico = medico.id
  JOIN especialidad ON agenda.id_especialidad = especialidad.id
  JOIN sede ON agenda.id_sede = sede.id
  LEFT JOIN cobertura ON turno.id_cobertura = cobertura.id
`;

async function obtenerTurno(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_TURNO} WHERE turno.id = ?`, [id]);
  return filas[0];
}

function describirTurno(turno) {
  return `del ${formatearFecha(turno.fecha)} a las ${turno.hora}`;
}

async function crear(req, res) {
  const conexion = await pool.getConnection();
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
    if (!esFechaValida(fecha) || !esHoraValida(hora)) {
      return responder(res, 400, 'La fecha debe tener formato AAAA-MM-DD y la hora HH:MM');
    }
    if (String(nota).length > 40) {
      return responder(res, 400, 'La nota no puede superar los 40 caracteres');
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

    // El horario tiene que coincidir con el inicio de un turno dentro de algun rango de la
    // agenda del medico (misma regla que la consulta de horarios disponibles).
    const [rangos] = await pool.query(
      'SELECT id, hora_entrada, hora_salida FROM agenda WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?',
      [id_medico, id_especialidad, id_sede, fecha]
    );
    const rango = rangos.find((r) => horariosDelRango(r.hora_entrada, r.hora_salida).includes(hora));
    if (!rango) {
      return responder(res, 400, 'El horario solicitado no está disponible en la agenda del médico');
    }

    await conexion.beginTransaction();

    // Se bloquean los turnos del medico ese dia para evitar dos reservas simultaneas.
    const [ocupados] = await conexion.query(
      `SELECT turno.id FROM turno JOIN agenda ON turno.id_agenda = agenda.id
       WHERE agenda.id_medico = ? AND turno.fecha = ? AND turno.hora = ? AND turno.estado = 'confirmado'
       FOR UPDATE`,
      [id_medico, fecha, hora]
    );
    if (ocupados.length > 0) {
      await conexion.rollback();
      return responder(res, 409, 'El horario solicitado ya está reservado. Elija otro horario.');
    }

    const [propios] = await conexion.query(
      "SELECT id FROM turno WHERE id_paciente = ? AND fecha = ? AND hora = ? AND estado = 'confirmado'",
      [id_paciente, fecha, hora]
    );
    if (propios.length > 0) {
      await conexion.rollback();
      return responder(res, 409, 'El paciente ya tiene otro turno confirmado en ese mismo horario');
    }

    const [resultado] = await conexion.query(
      "INSERT INTO turno (nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado) VALUES (?, ?, ?, ?, ?, ?, 'confirmado')",
      [nota, rango.id, fecha, hora, id_paciente, id_cobertura]
    );

    const turno = await obtenerTurno(resultado.insertId, conexion);
    const cuando = describirTurno(turno);
    const medico = `${turno.medico_nombre} ${turno.medico_apellido}`;
    const paciente = `${turno.paciente_nombre} ${turno.paciente_apellido}`;

    await notificarVarios(
      [
        { id_usuario: turno.id_paciente, tipo: 'turno_confirmado', mensaje: `Tu turno ${cuando} con ${medico} (${turno.especialidad}, ${turno.sede}) fue confirmado.` },
        { id_usuario: turno.id_medico, tipo: 'turno_confirmado', mensaje: `Nuevo turno: ${paciente}, ${cuando} en ${turno.sede}.` },
        { id_usuario: req.usuario.id, tipo: 'turno_confirmado', mensaje: `Asignaste a ${paciente} el turno ${cuando} con ${medico}.` },
      ],
      conexion
    );

    await conexion.commit();

    return responder(res, 201, 'ok', {
      id: turno.id,
      nota,
      id_agenda: rango.id,
      fecha,
      hora,
      id_paciente: turno.id_paciente,
      id_cobertura,
      estado: 'confirmado',
    });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error(error);
    return responder(res, 500, 'Error interno al crear el turno');
  } finally {
    conexion.release();
  }
}

async function cancelar(req, res) {
  try {
    const { id } = req.params;

    const turno = await obtenerTurno(id);
    if (!turno) {
      return responder(res, 404, 'Turno no encontrado');
    }

    if (req.usuario.rol === 'paciente' && turno.id_paciente !== req.usuario.id) {
      return responder(res, 403, 'Un paciente solo puede cancelar sus propios turnos');
    }
    if (req.usuario.rol === 'operador' && turno.id_sede !== req.usuario.id_sede) {
      return responder(res, 403, 'Un operador solo puede cancelar turnos de su propia sede');
    }
    // El medico puede atender en varias sedes: opera sobre sus propios turnos en cualquiera de ellas.
    if (req.usuario.rol === 'medico' && turno.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede cancelar sus propios turnos');
    }

    if (turno.estado !== 'confirmado') {
      return responder(res, 409, `El turno no se puede cancelar porque su estado actual es '${turno.estado}'`);
    }

    await pool.query("UPDATE turno SET estado = 'cancelado' WHERE id = ?", [id]);

    const cuando = describirTurno(turno);
    const paciente = `${turno.paciente_nombre} ${turno.paciente_apellido}`;
    await notificarVarios([
      { id_usuario: turno.id_paciente, tipo: 'turno_cancelado', mensaje: `Tu turno ${cuando} con ${turno.medico_nombre} ${turno.medico_apellido} fue cancelado.` },
      { id_usuario: turno.id_medico, tipo: 'turno_cancelado', mensaje: `Se canceló el turno de ${paciente} ${cuando} en ${turno.sede}.` },
      { id_usuario: req.usuario.id, tipo: 'turno_cancelado', mensaje: `Cancelaste el turno de ${paciente} ${cuando}.` },
    ]);

    return responder(res, 200, 'ok', { id: Number(id), estado: 'cancelado' });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al cancelar el turno');
  }
}

// Marca el turno como atendido. Si el body trae diagnostico (y opcionalmente tratamiento
// y observaciones), registra el historial clinico en la misma transaccion, de modo que
// nunca quede un turno atendido a medias. Sin body se comporta como en la semana 3 y el
// historial se puede cargar despues con POST /historial.
async function atender(req, res) {
  const conexion = await pool.getConnection();
  try {
    const { id } = req.params;
    const { diagnostico, tratamiento, observaciones } = req.body || {};

    const turno = await obtenerTurno(id);
    if (!turno) {
      return responder(res, 404, 'Turno no encontrado');
    }

    if (turno.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede marcar como atendidos sus propios turnos');
    }

    if (turno.estado !== 'confirmado') {
      return responder(res, 409, `El turno no se puede atender porque su estado actual es '${turno.estado}'`);
    }

    for (const [campo, valor] of Object.entries({ diagnostico, tratamiento, observaciones })) {
      if (valor && String(valor).length > 255) {
        return responder(res, 400, `El campo ${campo} no puede superar los 255 caracteres`);
      }
    }

    await conexion.beginTransaction();
    await conexion.query("UPDATE turno SET estado = 'atendido' WHERE id = ?", [id]);

    let historial = null;
    if (diagnostico) {
      const [resultado] = await conexion.query(
        'INSERT INTO historial_clinico (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.usuario.id, turno.id_paciente, diagnostico, tratamiento || null, observaciones || null]
      );
      historial = {
        id: resultado.insertId,
        diagnostico,
        tratamiento: tratamiento || null,
        observaciones: observaciones || null,
      };
    }

    const cuando = describirTurno(turno);
    await notificarVarios(
      [
        { id_usuario: turno.id_paciente, tipo: 'turno_atendido', mensaje: `Tu turno ${cuando} con ${turno.medico_nombre} ${turno.medico_apellido} fue registrado como atendido.` },
        { id_usuario: turno.id_medico, tipo: 'turno_atendido', mensaje: `Registraste el turno de ${turno.paciente_nombre} ${turno.paciente_apellido} ${cuando} como atendido.` },
      ],
      conexion
    );

    await conexion.commit();

    return responder(res, 200, 'ok', { id: Number(id), estado: 'atendido', historial });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error(error);
    return responder(res, 500, 'Error interno al marcar el turno como atendido');
  } finally {
    conexion.release();
  }
}

// "Mis turnos" del paciente, con los nombres resueltos y, si el turno fue atendido,
// el resumen del historial clinico cargado por el medico.
async function misTurnos(req, res) {
  try {
    const [turnos] = await pool.query(
      `SELECT t.*, historial_clinico.diagnostico, historial_clinico.tratamiento, historial_clinico.observaciones
       FROM (${SELECT_TURNO} WHERE turno.id_paciente = ?) t
       LEFT JOIN historial_clinico ON historial_clinico.id_turno = t.id
       ORDER BY t.fecha ASC, t.hora ASC`,
      [req.usuario.id]
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos');
  }
}

// Turnos del medico logueado para una fecha, en todas las sedes donde atiende
// (o en una sola, con id_sede).
async function turnosMedico(req, res) {
  try {
    const { fecha, id_sede } = req.query;
    if (!fecha) {
      return responder(res, 400, 'Falta el parámetro obligatorio: fecha');
    }

    const condiciones = ['agenda.id_medico = ?', 'turno.fecha = ?'];
    const valores = [req.usuario.id, fecha];
    if (id_sede) {
      condiciones.push('agenda.id_sede = ?');
      valores.push(id_sede);
    }

    const [turnos] = await pool.query(
      `${SELECT_TURNO} WHERE ${condiciones.join(' AND ')} ORDER BY turno.hora ASC`,
      valores
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos del médico');
  }
}

// Turnos de la sede del operador para una fecha. Filtros opcionales: id_medico y estado.
async function turnosSede(req, res) {
  try {
    const { fecha, id_medico, estado } = req.query;
    if (!fecha) {
      return responder(res, 400, 'Falta el parámetro obligatorio: fecha');
    }

    const condiciones = ['agenda.id_sede = ?', 'turno.fecha = ?'];
    const valores = [req.usuario.id_sede, fecha];
    if (id_medico) {
      condiciones.push('agenda.id_medico = ?');
      valores.push(id_medico);
    }
    if (estado) {
      condiciones.push('turno.estado = ?');
      valores.push(estado);
    }

    const [turnos] = await pool.query(
      `${SELECT_TURNO} WHERE ${condiciones.join(' AND ')} ORDER BY turno.hora ASC`,
      valores
    );
    return responder(res, 200, 'ok', turnos);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los turnos de la sede');
  }
}

module.exports = { crear, cancelar, atender, misTurnos, turnosMedico, turnosSede };
