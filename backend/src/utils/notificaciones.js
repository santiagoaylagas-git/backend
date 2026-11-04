const pool = require('../database/db');

async function crearNotificacion(id_usuario, tipo, mensaje, conexion = pool) {
  await conexion.query(
    'INSERT INTO notificacion (id_usuario, tipo, mensaje, leida) VALUES (?, ?, ?, 0)',
    [id_usuario, tipo, mensaje]
  );
}

// Envia una notificacion a cada destinatario una sola vez. Se usa en los cambios de
// estado de un turno: el paciente, el medico y, si es otra persona, quien hizo la accion
// (por ejemplo, el operador), para que su contador tambien se actualice.
async function notificarVarios(destinatarios, conexion = pool) {
  const enviados = new Set();
  for (const { id_usuario, tipo, mensaje } of destinatarios) {
    if (!id_usuario || enviados.has(id_usuario)) continue;
    enviados.add(id_usuario);
    await crearNotificacion(id_usuario, tipo, mensaje, conexion);
  }
}

module.exports = { crearNotificacion, notificarVarios };
