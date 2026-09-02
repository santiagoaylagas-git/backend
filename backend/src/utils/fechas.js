// Valida el formato AAAA-MM-DD usado en todos los filtros por rango de fechas.
function esFechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
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

module.exports = { esFechaValida, filtroRangoFechas };
