const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { esFechaValida, filtroRangoFechas } = require('../utils/fechas');

// Valida los parametros de rango y arma el WHERE comun a todos los reportes.
// Devuelve null si algun parametro es invalido, respondiendo el error controlado.
function prepararRango(req, res, condicionesPrevias = [], valoresPrevios = []) {
  const { desde, hasta } = req.query;

  if (desde && !esFechaValida(desde)) {
    responder(res, 400, 'El parámetro desde debe tener formato AAAA-MM-DD');
    return null;
  }
  if (hasta && !esFechaValida(hasta)) {
    responder(res, 400, 'El parámetro hasta debe tener formato AAAA-MM-DD');
    return null;
  }
  if (desde && hasta && desde > hasta) {
    responder(res, 400, 'El parámetro desde no puede ser posterior a hasta');
    return null;
  }

  const rango = filtroRangoFechas('turno.fecha', desde, hasta);
  const condiciones = [...condicionesPrevias, ...rango.condiciones];
  const valores = [...valoresPrevios, ...rango.valores];

  return {
    where: condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '',
    valores,
    periodo: { desde: desde || null, hasta: hasta || null },
  };
}

async function turnosPorEspecialidad(req, res) {
  try {
    const rango = prepararRango(req, res);
    if (!rango) return;

    const [filas] = await pool.query(
      `SELECT especialidad.id AS id_especialidad, especialidad.descripcion,
              COUNT(turno.id) AS cantidad
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       JOIN especialidad ON agenda.id_especialidad = especialidad.id
       ${rango.where}
       GROUP BY especialidad.id, especialidad.descripcion
       ORDER BY cantidad DESC, especialidad.descripcion`,
      rango.valores
    );

    return responder(res, 200, 'ok', { periodo: rango.periodo, especialidades: filas });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al generar el reporte de turnos por especialidad');
  }
}

async function turnosPorSede(req, res) {
  try {
    const rango = prepararRango(req, res);
    if (!rango) return;

    const [filas] = await pool.query(
      `SELECT sede.id AS id_sede, sede.nombre,
              COUNT(turno.id) AS cantidad
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       JOIN sede ON agenda.id_sede = sede.id
       ${rango.where}
       GROUP BY sede.id, sede.nombre
       ORDER BY cantidad DESC, sede.nombre`,
      rango.valores
    );

    return responder(res, 200, 'ok', { periodo: rango.periodo, sedes: filas });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al generar el reporte de turnos por sede');
  }
}

async function rankingMedicos(req, res) {
  try {
    const rango = prepararRango(req, res, ["turno.estado = 'atendido'"]);
    if (!rango) return;

    const [filas] = await pool.query(
      `SELECT usuario.id AS id_medico, usuario.nombre, usuario.apellido,
              COUNT(turno.id) AS turnos_atendidos
       FROM turno
       JOIN agenda ON turno.id_agenda = agenda.id
       JOIN usuario ON agenda.id_medico = usuario.id
       ${rango.where}
       GROUP BY usuario.id, usuario.nombre, usuario.apellido
       ORDER BY turnos_atendidos DESC, usuario.apellido, usuario.nombre`,
      rango.valores
    );

    return responder(res, 200, 'ok', { periodo: rango.periodo, ranking: filas });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al generar el ranking de médicos');
  }
}

async function tasaCancelacion(req, res) {
  try {
    const rango = prepararRango(req, res);
    if (!rango) return;

    const [filas] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN turno.estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
       FROM turno
       ${rango.where}`,
      rango.valores
    );

    const total = Number(filas[0].total);
    const cancelados = Number(filas[0].cancelados) || 0;
    const tasa = total > 0 ? Number(((cancelados / total) * 100).toFixed(2)) : 0;

    return responder(res, 200, 'ok', {
      periodo: rango.periodo,
      total,
      cancelados,
      tasa_cancelacion_porcentaje: tasa,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al calcular la tasa de cancelación');
  }
}

module.exports = { turnosPorEspecialidad, turnosPorSede, rankingMedicos, tasaCancelacion };
