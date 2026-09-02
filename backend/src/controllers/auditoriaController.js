const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { esFechaValida } = require('../utils/fechas');

async function listar(req, res) {
  try {
    const { id_usuario, entidad, desde, hasta } = req.query;

    if (desde && !esFechaValida(desde)) {
      return responder(res, 400, 'El parámetro desde debe tener formato AAAA-MM-DD');
    }
    if (hasta && !esFechaValida(hasta)) {
      return responder(res, 400, 'El parámetro hasta debe tener formato AAAA-MM-DD');
    }

    const condiciones = [];
    const valores = [];

    if (id_usuario) {
      condiciones.push('log_auditoria.id_usuario = ?');
      valores.push(id_usuario);
    }
    if (entidad) {
      condiciones.push('log_auditoria.entidad = ?');
      valores.push(entidad);
    }
    if (desde) {
      condiciones.push('log_auditoria.fecha >= ?');
      valores.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      condiciones.push('log_auditoria.fecha <= ?');
      valores.push(`${hasta} 23:59:59`);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [logs] = await pool.query(
      `SELECT log_auditoria.id, log_auditoria.id_usuario, usuario.nombre, usuario.apellido, usuario.rol,
              log_auditoria.accion, log_auditoria.entidad, log_auditoria.id_entidad,
              log_auditoria.detalle, log_auditoria.fecha
       FROM log_auditoria
       JOIN usuario ON log_auditoria.id_usuario = usuario.id
       ${where}
       ORDER BY log_auditoria.fecha DESC, log_auditoria.id DESC`,
      valores
    );

    return responder(res, 200, 'ok', logs);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar los logs de auditoría');
  }
}

module.exports = { listar };
