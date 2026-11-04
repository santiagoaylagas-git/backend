const pool = require('../database/db');

// Metodo HTTP -> accion registrada en log_auditoria.
const ACCIONES = {
  POST: 'ALTA',
  PUT: 'MODIFICACION',
  DELETE: 'BAJA',
};

const LARGO_MAX_DETALLE = 255;

function armarDetalle(accion, entidad, datos) {
  const partes = [`${accion} de ${entidad}`];

  if (datos && typeof datos === 'object') {
    const descripcion = Object.entries(datos)
      .filter(([clave]) => clave !== 'id' && clave !== 'password')
      .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
      .filter(([, valor]) => !Array.isArray(valor) || valor.length > 0)
      .map(([clave, valor]) => `${clave}=${valor}`)
      .join(', ');

    if (descripcion) {
      partes.push(descripcion);
    }
  }

  return partes.join(': ').slice(0, LARGO_MAX_DETALLE);
}

async function registrar(id_usuario, accion, entidad, id_entidad, detalle) {
  try {
    await pool.query(
      'INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, accion, entidad, id_entidad, detalle]
    );
  } catch (error) {
    // La auditoria nunca debe romper la operacion principal, que ya se respondio.
    console.error('No se pudo registrar la auditoria:', error.message);
  }
}

// Registra automaticamente altas, bajas y modificaciones de la entidad indicada.
// Se monta a nivel de router, por lo que los controladores no necesitan saber que existe.
function auditar(entidad) {
  return (req, res, next) => {
    const accion = ACCIONES[req.method];

    if (!accion) {
      return next();
    }

    const jsonOriginal = res.json.bind(res);

    res.json = (cuerpo) => {
      const exitosa = res.statusCode >= 200 && res.statusCode < 300;

      if (exitosa) {
        const datos = cuerpo && cuerpo.datos;
        const id_entidad = datos && datos.id ? datos.id : null;
        // En el alta publica de pacientes no hay usuario autenticado: el responsable
        // de la accion es el propio usuario que acaba de crearse.
        const id_usuario = req.usuario ? req.usuario.id : id_entidad;

        if (id_usuario) {
          registrar(id_usuario, accion, entidad, id_entidad, armarDetalle(accion, entidad, datos));
        }
      }

      return jsonOriginal(cuerpo);
    };

    next();
  };
}

module.exports = { auditar };
