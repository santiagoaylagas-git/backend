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

    const consulta = `SELECT log_auditoria.id, log_auditoria.id_usuario, usuario.nombre, usuario.apellido, usuario.rol,
              log_auditoria.accion, log_auditoria.entidad, log_auditoria.id_entidad,
              log_auditoria.detalle, log_auditoria.fecha
       FROM log_auditoria
       JOIN usuario ON log_auditoria.id_usuario = usuario.id
       ${where}
       ORDER BY log_auditoria.fecha DESC, log_auditoria.id DESC`;

    // Sin "pagina" responde el array completo (compatibilidad con la semana 4).
    // Con "pagina" (y opcionalmente "limite") responde una pagina y el total.
    if (req.query.pagina === undefined) {
      const [logs] = await pool.query(consulta, valores);
      return responder(res, 200, 'ok', logs);
    }

    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 10));

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM log_auditoria JOIN usuario ON log_auditoria.id_usuario = usuario.id ${where}`,
      valores
    );
    const [registros] = await pool.query(`${consulta} LIMIT ? OFFSET ?`, [...valores, limite, (pagina - 1) * limite]);

    return responder(res, 200, 'ok', { registros, total: Number(total), pagina, limite });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al consultar los logs de auditoría');
  }
}

// Valores disponibles para los filtros de la pantalla de auditoria: los usuarios que
// tienen acciones registradas y las entidades auditadas.
async function filtros(req, res) {
  try {
    const [usuarios] = await pool.query(
      `SELECT DISTINCT usuario.id, usuario.nombre, usuario.apellido, usuario.rol
       FROM log_auditoria JOIN usuario ON log_auditoria.id_usuario = usuario.id
       ORDER BY usuario.apellido, usuario.nombre`
    );
    const [entidades] = await pool.query('SELECT DISTINCT entidad FROM log_auditoria ORDER BY entidad');

    return responder(res, 200, 'ok', { usuarios, entidades: entidades.map((fila) => fila.entidad) });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al obtener los filtros de auditoría');
  }
}

module.exports = { listar, filtros };
