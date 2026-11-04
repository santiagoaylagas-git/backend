const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { ahoraLocal, esFechaValida, horariosDelRango, DURACION_TURNO_MINUTOS } = require('../utils/fechas');

function faltanParametros(query, nombres) {
  return nombres.filter((nombre) => !query[nombre]);
}

// Fechas (desde hoy) en las que el medico tiene agenda para la especialidad y la sede.
async function fechas(req, res) {
  try {
    const faltantes = faltanParametros(req.query, ['id_medico', 'id_especialidad', 'id_sede']);
    if (faltantes.length > 0) {
      return responder(res, 400, `Faltan parámetros obligatorios: ${faltantes.join(', ')}`);
    }

    const { id_medico, id_especialidad, id_sede } = req.query;
    const { fecha: hoy } = ahoraLocal();

    const [filas] = await pool.query(
      `SELECT DISTINCT fecha FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha >= ?
       ORDER BY fecha`,
      [id_medico, id_especialidad, id_sede, hoy]
    );

    // Se descartan los dias que ya no tienen ningun horario libre.
    const conLugar = [];
    for (const { fecha } of filas) {
      const libres = await calcularHorariosLibres(id_medico, fecha, id_especialidad, id_sede);
      if (libres.length > 0) conLugar.push(fecha);
    }

    return responder(res, 200, 'ok', conLugar);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar las fechas disponibles');
  }
}

// Horarios libres: los rangos de agenda del medico para esa especialidad y sede,
// menos los turnos confirmados del medico y, si la fecha es hoy, los horarios ya pasados.
async function calcularHorariosLibres(id_medico, fecha, id_especialidad, id_sede) {
  const [rangos] = await pool.query(
    `SELECT hora_entrada, hora_salida FROM agenda
     WHERE id_medico = ? AND fecha = ? AND id_especialidad = ? AND id_sede = ?
     ORDER BY hora_entrada`,
    [id_medico, fecha, id_especialidad, id_sede]
  );

  const [ocupados] = await pool.query(
    `SELECT turno.hora FROM turno
     JOIN agenda ON turno.id_agenda = agenda.id
     WHERE agenda.id_medico = ? AND turno.fecha = ? AND turno.estado = 'confirmado'`,
    [id_medico, fecha]
  );
  const horasOcupadas = new Set(ocupados.map((turno) => turno.hora));

  const ahora = ahoraLocal();
  const horarios = rangos
    .flatMap((rango) => horariosDelRango(rango.hora_entrada, rango.hora_salida))
    .filter((hora) => !horasOcupadas.has(hora))
    .filter((hora) => fecha > ahora.fecha || (fecha === ahora.fecha && hora > ahora.hora));

  return [...new Set(horarios)].sort();
}

async function horarios(req, res) {
  try {
    const faltantes = faltanParametros(req.query, ['id_medico', 'fecha', 'id_especialidad', 'id_sede']);
    if (faltantes.length > 0) {
      return responder(res, 400, `Faltan parámetros obligatorios: ${faltantes.join(', ')}`);
    }

    const { id_medico, fecha, id_especialidad, id_sede } = req.query;
    if (!esFechaValida(fecha)) {
      return responder(res, 400, 'El parámetro fecha debe tener formato AAAA-MM-DD');
    }

    const libres = await calcularHorariosLibres(id_medico, fecha, id_especialidad, id_sede);
    return responder(res, 200, 'ok', {
      fecha,
      duracion_minutos: DURACION_TURNO_MINUTOS,
      horarios: libres,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar los horarios disponibles');
  }
}

module.exports = { fechas, horarios };
