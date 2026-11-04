const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

// Busqueda de pacientes por DNI (exacto o por prefijo) o por apellido (parcial).
async function buscar(req, res) {
  try {
    const texto = String(req.query.q || '').trim();

    if (texto.length < 2) {
      return responder(res, 400, 'Ingrese al menos 2 caracteres del DNI o del apellido');
    }

    const [pacientes] = await pool.query(
      `SELECT usuario.id, usuario.nombre, usuario.apellido, usuario.dni, usuario.fecha_nacimiento,
              usuario.email, usuario.telefono, usuario.id_cobertura, cobertura.nombre AS cobertura
       FROM usuario
       LEFT JOIN cobertura ON usuario.id_cobertura = cobertura.id
       WHERE usuario.rol = 'paciente' AND (usuario.dni LIKE ? OR usuario.apellido LIKE ?)
       ORDER BY usuario.apellido, usuario.nombre
       LIMIT 50`,
      [`${texto}%`, `%${texto}%`]
    );

    return responder(res, 200, 'ok', pacientes);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al buscar pacientes');
  }
}

module.exports = { buscar };
