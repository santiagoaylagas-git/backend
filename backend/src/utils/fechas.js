// Duracion de cada turno, en minutos. La usan tanto la consulta de horarios libres
// como la validacion del alta de turno, para que ambas sean coherentes.
const DURACION_TURNO_MINUTOS = 30;

// Valida el formato AAAA-MM-DD usado en todos los filtros por rango de fechas.
function esFechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// Valida el formato HH:MM (24 h).
function esHoraValida(valor) {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function horaAMinutos(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function minutosAHora(total) {
  const horas = String(Math.floor(total / 60)).padStart(2, '0');
  const minutos = String(total % 60).padStart(2, '0');
  return `${horas}:${minutos}`;
}

// Horarios de inicio de turno dentro de un rango de agenda [entrada, salida).
function horariosDelRango(horaEntrada, horaSalida) {
  const horarios = [];
  const fin = horaAMinutos(horaSalida);
  for (let inicio = horaAMinutos(horaEntrada); inicio + DURACION_TURNO_MINUTOS <= fin; inicio += DURACION_TURNO_MINUTOS) {
    horarios.push(minutosAHora(inicio));
  }
  return horarios;
}

// Fecha y hora actuales del servidor, en hora local (no UTC).
function ahoraLocal() {
  const ahora = new Date();
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('-');
  const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  return { fecha, hora };
}

// AAAA-MM-DD -> DD/MM/AAAA, para los mensajes que lee el usuario.
function formatearFecha(valor) {
  if (!valor) return '';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// Arma las condiciones SQL del filtro por rango de fechas sobre el campo indicado.
function filtroRangoFechas(campo, desde, hasta) {
  const condiciones = [];
  const valores = [];

  if (desde) {
    condiciones.push(`${campo} >= ?`);
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push(`${campo} <= ?`);
    valores.push(hasta);
  }

  return { condiciones, valores };
}

module.exports = {
  DURACION_TURNO_MINUTOS,
  esFechaValida,
  esHoraValida,
  horaAMinutos,
  minutosAHora,
  horariosDelRango,
  ahoraLocal,
  formatearFecha,
  filtroRangoFechas,
};
