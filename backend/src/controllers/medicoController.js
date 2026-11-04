const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { ahoraLocal } = require('../utils/fechas');

// Listado de medicos con sus especialidades, sin datos personales.
// Filtros opcionales (query):
//   - id_especialidad: medicos que tienen esa especialidad.
//   - id_sede: medicos de esa sede, o que tienen agenda vigente en ella.
//   - disponibles=1: solo medicos con agenda desde hoy en adelante para la
//     especialidad y la sede indicadas (lo usa la solicitud de turno).
async function listar(req, res) {
  try {
    const { id_especialidad, id_sede, disponibles } = req.query;
    const hoy = ahoraLocal().fecha;

    const condiciones = ["usuario.rol = 'medico'"];
    const valores = [];

    if (id_especialidad) {
      condiciones.push(
        'EXISTS (SELECT 1 FROM medico_especialidad me WHERE me.id_medico = usuario.id AND me.id_especialidad = ?)'
      );
      valores.push(id_especialidad);
    }

    if (disponibles === '1' || disponibles === 'true') {
      const filtroAgenda = ['a.id_medico = usuario.id', 'a.fecha >= ?'];
      const valoresAgenda = [hoy];
      if (id_sede) {
        filtroAgenda.push('a.id_sede = ?');
        valoresAgenda.push(id_sede);
      }
      if (id_especialidad) {
        filtroAgenda.push('a.id_especialidad = ?');
        valoresAgenda.push(id_especialidad);
      }
      condiciones.push(`EXISTS (SELECT 1 FROM agenda a WHERE ${filtroAgenda.join(' AND ')})`);
      valores.push(...valoresAgenda);
    } else if (id_sede) {
      condiciones.push(
        '(usuario.id_sede = ? OR EXISTS (SELECT 1 FROM agenda a WHERE a.id_medico = usuario.id AND a.id_sede = ? AND a.fecha >= ?))'
      );
      valores.push(id_sede, id_sede, hoy);
    }

    const [medicos] = await pool.query(
      `SELECT usuario.id, usuario.nombre, usuario.apellido, usuario.id_sede
       FROM usuario
       WHERE ${condiciones.join(' AND ')}
       ORDER BY usuario.apellido, usuario.nombre`,
      valores
    );

    if (medicos.length === 0) {
      return responder(res, 200, 'ok', []);
    }

    const [especialidades] = await pool.query(
      `SELECT me.id_medico, especialidad.id, especialidad.descripcion
       FROM medico_especialidad me
       JOIN especialidad ON me.id_especialidad = especialidad.id
       WHERE me.id_medico IN (?)
       ORDER BY especialidad.descripcion`,
      [medicos.map((medico) => medico.id)]
    );

    const resultado = medicos.map((medico) => ({
      ...medico,
      especialidades: especialidades
        .filter((esp) => esp.id_medico === medico.id)
        .map(({ id, descripcion }) => ({ id, descripcion })),
    }));

    return responder(res, 200, 'ok', resultado);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los médicos');
  }
}

module.exports = { listar };
