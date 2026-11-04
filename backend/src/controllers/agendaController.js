const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { esFechaValida, esHoraValida, horaAMinutos, formatearFecha, DURACION_TURNO_MINUTOS } = require('../utils/fechas');

const CAMPOS_LISTADO = `
  agenda.id, agenda.hora_entrada, agenda.hora_salida, agenda.fecha,
  agenda.id_medico, medico.nombre AS medico_nombre, medico.apellido AS medico_apellido,
  agenda.id_especialidad, especialidad.descripcion AS especialidad,
  agenda.id_sede, sede.nombre AS sede,
  (SELECT COUNT(*) FROM turno WHERE turno.id_agenda = agenda.id AND turno.estado = 'confirmado') AS turnos_confirmados
`;

const JOINS_LISTADO = `
  JOIN usuario medico ON agenda.id_medico = medico.id
  JOIN especialidad ON agenda.id_especialidad = especialidad.id
  JOIN sede ON agenda.id_sede = sede.id
`;

async function obtenerConNombres(id) {
  const [filas] = await pool.query(`SELECT ${CAMPOS_LISTADO} FROM agenda ${JOINS_LISTADO} WHERE agenda.id = ?`, [id]);
  return filas[0];
}

// Validaciones de formato comunes al alta y la modificacion.
function validarHorario({ hora_entrada, hora_salida, fecha }) {
  if (!esFechaValida(fecha)) {
    return 'La fecha debe tener formato AAAA-MM-DD';
  }
  if (!esHoraValida(hora_entrada) || !esHoraValida(hora_salida)) {
    return 'Las horas deben tener formato HH:MM';
  }
  if (horaAMinutos(hora_salida) <= horaAMinutos(hora_entrada)) {
    return 'La hora de salida debe ser posterior a la hora de entrada';
  }
  if (horaAMinutos(hora_salida) - horaAMinutos(hora_entrada) < DURACION_TURNO_MINUTOS) {
    return `El rango horario debe durar al menos ${DURACION_TURNO_MINUTOS} minutos (un turno)`;
  }
  return null;
}

// Verifica que la especialidad y la sede existan y que la especialidad sea del medico.
async function validarReferencias(id_medico, id_especialidad, id_sede) {
  const [especialidades] = await pool.query(
    'SELECT id FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?',
    [id_medico, id_especialidad]
  );
  if (especialidades.length === 0) {
    return 'La especialidad indicada no corresponde al médico';
  }

  const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
  if (sedes.length === 0) {
    return 'La sede indicada no existe';
  }
  return null;
}

// Un medico no puede tener dos rangos superpuestos el mismo dia, aunque sean en sedes distintas.
async function buscarSuperposicion(id_medico, fecha, hora_entrada, hora_salida, idExcluido = 0) {
  const [filas] = await pool.query(
    `SELECT agenda.hora_entrada, agenda.hora_salida, sede.nombre AS sede
     FROM agenda JOIN sede ON agenda.id_sede = sede.id
     WHERE agenda.id_medico = ? AND agenda.fecha = ? AND agenda.id <> ?
       AND agenda.hora_entrada < ? AND agenda.hora_salida > ?`,
    [id_medico, fecha, idExcluido, hora_salida, hora_entrada]
  );
  return filas[0];
}

function mensajeSuperposicion(rango) {
  return `El horario se superpone con otro rango del médico ese día (${rango.hora_entrada} a ${rango.hora_salida}, ${rango.sede})`;
}

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
    if (req.usuario.rol === 'operador' && Number(id_sede) !== req.usuario.id_sede) {
      return responder(res, 403, 'Un operador solo puede cargar agenda en su propia sede');
    }

    const errorHorario = validarHorario(req.body);
    if (errorHorario) {
      return responder(res, 400, errorHorario);
    }

    const [medicos] = await pool.query("SELECT id FROM usuario WHERE id = ? AND rol = 'medico'", [id_medico]);
    if (medicos.length === 0) {
      return responder(res, 400, 'El id_medico indicado no corresponde a un médico válido');
    }

    const errorReferencias = await validarReferencias(id_medico, id_especialidad, id_sede);
    if (errorReferencias) {
      return responder(res, 400, errorReferencias);
    }

    const superpuesto = await buscarSuperposicion(id_medico, fecha, hora_entrada, hora_salida);
    if (superpuesto) {
      return responder(res, 409, mensajeSuperposicion(superpuesto));
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
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede),
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al crear la agenda');
  }
}

// Listado con los nombres del medico, la especialidad y la sede, y la cantidad de
// turnos confirmados de cada rango (el front lo usa para avisar antes de eliminar).
async function listar(req, res) {
  try {
    const { id_sede, fecha, desde, hasta } = req.query;
    let { id_medico } = req.query;

    if (req.usuario.rol === 'medico') {
      id_medico = req.usuario.id;
    }

    const condiciones = [];
    const valores = [];

    if (id_medico) {
      condiciones.push('agenda.id_medico = ?');
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push('agenda.id_sede = ?');
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push('agenda.fecha = ?');
      valores.push(fecha);
    }
    if (desde) {
      condiciones.push('agenda.fecha >= ?');
      valores.push(desde);
    }
    if (hasta) {
      condiciones.push('agenda.fecha <= ?');
      valores.push(hasta);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [agenda] = await pool.query(
      `SELECT ${CAMPOS_LISTADO} FROM agenda ${JOINS_LISTADO} ${where}
       ORDER BY agenda.fecha, medico.apellido, medico.nombre, agenda.hora_entrada`,
      valores
    );

    return responder(
      res,
      200,
      'ok',
      agenda.map((fila) => ({ ...fila, turnos_confirmados: Number(fila.turnos_confirmados) }))
    );
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
    if (
      req.usuario.rol === 'operador' &&
      (registro.id_sede !== req.usuario.id_sede || Number(id_sede) !== req.usuario.id_sede)
    ) {
      return responder(res, 403, 'Un operador solo puede modificar la agenda de su propia sede');
    }

    if (!hora_entrada || !hora_salida || !fecha || !id_especialidad || !id_sede) {
      return responder(
        res,
        400,
        'Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_especialidad, id_sede'
      );
    }

    const errorHorario = validarHorario(req.body);
    if (errorHorario) {
      return responder(res, 400, errorHorario);
    }

    const errorReferencias = await validarReferencias(registro.id_medico, id_especialidad, id_sede);
    if (errorReferencias) {
      return responder(res, 400, errorReferencias);
    }

    const superpuesto = await buscarSuperposicion(registro.id_medico, fecha, hora_entrada, hora_salida, id);
    if (superpuesto) {
      return responder(res, 409, mensajeSuperposicion(superpuesto));
    }

    // Ningun turno confirmado puede quedar fuera del nuevo horario.
    const [confirmados] = await pool.query(
      "SELECT fecha, hora FROM turno WHERE id_agenda = ? AND estado = 'confirmado' ORDER BY fecha, hora",
      [id]
    );
    const cambiaContexto =
      fecha !== registro.fecha ||
      Number(id_sede) !== registro.id_sede ||
      Number(id_especialidad) !== registro.id_especialidad;
    const afuera = confirmados.filter(
      (turno) =>
        cambiaContexto ||
        turno.fecha !== fecha ||
        horaAMinutos(turno.hora) < horaAMinutos(hora_entrada) ||
        horaAMinutos(turno.hora) + DURACION_TURNO_MINUTOS > horaAMinutos(hora_salida)
    );
    if (afuera.length > 0) {
      const detalle = afuera.map((turno) => `${formatearFecha(turno.fecha)} ${turno.hora}`).join(', ');
      return responder(
        res,
        409,
        `No se puede modificar el rango: dejaría fuera turnos confirmados (${detalle}). Cancele esos turnos primero o elija un horario que los incluya.`
      );
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
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede),
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al modificar la agenda');
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const registro = await obtenerConNombres(id);
    if (!registro) {
      return responder(res, 404, 'Registro de agenda no encontrado');
    }

    if (req.usuario.rol === 'medico' && registro.id_medico !== req.usuario.id) {
      return responder(res, 403, 'Un médico solo puede eliminar turnos de su propia agenda');
    }
    if (req.usuario.rol === 'operador' && registro.id_sede !== req.usuario.id_sede) {
      return responder(res, 403, 'Un operador solo puede eliminar la agenda de su propia sede');
    }

    const [turnos] = await pool.query('SELECT estado FROM turno WHERE id_agenda = ?', [id]);
    const confirmados = turnos.filter((turno) => turno.estado === 'confirmado').length;

    if (confirmados > 0) {
      return responder(
        res,
        409,
        `No se puede eliminar el rango horario: tiene ${confirmados} turno(s) confirmado(s). Cancélelos primero.`
      );
    }
    if (turnos.length > 0) {
      return responder(
        res,
        409,
        'No se puede eliminar el rango horario: tiene turnos de pacientes asociados (atendidos o cancelados) que forman parte del historial'
      );
    }

    await pool.query('DELETE FROM agenda WHERE id = ?', [id]);
    return responder(res, 200, 'ok', {
      id: Number(id),
      fecha: registro.fecha,
      hora_entrada: registro.hora_entrada,
      hora_salida: registro.hora_salida,
      id_medico: registro.id_medico,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al eliminar la agenda');
  }
}

module.exports = { crear, listar, modificar, eliminar };
