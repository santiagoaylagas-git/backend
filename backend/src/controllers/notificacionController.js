const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

async function listar(req, res) {
  try {
    const [notificaciones] = await pool.query(
      'SELECT id, id_usuario, tipo, mensaje, leida, fecha FROM notificacion WHERE id_usuario = ? ORDER BY fecha DESC, id DESC',
      [req.usuario.id]
    );
    return responder(res, 200, 'ok', notificaciones);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar las notificaciones');
  }
}

async function marcarLeida(req, res) {
  try {
    const { id } = req.params;

    const [notificaciones] = await pool.query('SELECT id, id_usuario FROM notificacion WHERE id = ?', [id]);
    if (notificaciones.length === 0) {
      return responder(res, 404, 'Notificación no encontrada');
    }
    if (notificaciones[0].id_usuario !== req.usuario.id) {
      return responder(res, 403, 'No puede marcar como leída una notificación que no es suya');
    }

    await pool.query('UPDATE notificacion SET leida = 1 WHERE id = ?', [id]);
    return responder(res, 200, 'ok', { id: Number(id), leida: true });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al marcar la notificación como leída');
  }
}

module.exports = { listar, marcarLeida };
