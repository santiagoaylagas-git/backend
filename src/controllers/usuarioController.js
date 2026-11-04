const bcrypt = require('bcrypt');
const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { esFechaValida, ahoraLocal } = require('../utils/fechas');

const SALT_ROUNDS = 10;
// Desde la gestion de usuarios el administrador da de alta personal de la clinica;
// los pacientes se registran solos o los da de alta un operador.
const ROLES_ALTA = ['medico', 'operador', 'admin'];
const ROLES_CON_SEDE = ['medico', 'operador'];

// Valida los datos comunes a alta y modificacion. Devuelve el mensaje de error o null.
function validarDatosPersonales(datos, { passwordObligatoria }) {
  const { nombre, apellido, dni, email, fecha_nacimiento, telefono, password } = datos;

  if (!nombre || !apellido || !dni || !email || !fecha_nacimiento) {
    return 'Faltan datos obligatorios: nombre, apellido, dni, email, fecha_nacimiento';
  }
  if (String(nombre).length > 30 || String(apellido).length > 30) {
    return 'El nombre y el apellido no pueden superar los 30 caracteres';
  }
  if (!/^\d{7,8}$/.test(String(dni))) {
    return 'El DNI debe tener 7 u 8 dígitos numéricos';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || String(email).length > 30) {
    return 'El email no es válido (máximo 30 caracteres)';
  }
  if (!esFechaValida(fecha_nacimiento) || fecha_nacimiento > ahoraLocal().fecha) {
    return 'La fecha de nacimiento debe tener formato AAAA-MM-DD y no puede ser futura';
  }
  if (telefono && !/^\d{6,10}$/.test(String(telefono))) {
    return 'El teléfono debe tener entre 6 y 10 dígitos';
  }
  if (passwordObligatoria && !password) {
    return 'Falta el dato obligatorio: password';
  }
  if (password && String(password).length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
}

async function existeDuplicado(dni, email, idExcluido = 0) {
  const [filas] = await pool.query(
    'SELECT id FROM usuario WHERE (dni = ? OR email = ?) AND id <> ?',
    [dni, email, idExcluido]
  );
  return filas.length > 0;
}

// Normaliza y valida la lista de especialidades de un medico.
async function validarEspecialidades(especialidades) {
  if (!Array.isArray(especialidades) || especialidades.length === 0) {
    return { error: 'Un médico debe tener al menos una especialidad' };
  }
  const ids = [...new Set(especialidades.map(Number))];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: 'Las especialidades indicadas no son válidas' };
  }
  const [existentes] = await pool.query('SELECT id FROM especialidad WHERE id IN (?)', [ids]);
  if (existentes.length !== ids.length) {
    return { error: 'Alguna de las especialidades indicadas no existe' };
  }
  return { ids };
}

async function existeSede(id_sede) {
  const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
  return sedes.length > 0;
}

async function existeCobertura(id_cobertura) {
  const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id_cobertura]);
  return coberturas.length > 0;
}

async function especialidadesDe(id_medico) {
  const [filas] = await pool.query(
    'SELECT id_especialidad FROM medico_especialidad WHERE id_medico = ? ORDER BY id_especialidad',
    [id_medico]
  );
  return filas.map((fila) => fila.id_especialidad);
}

async function listar(req, res) {
  try {
    const { nombre, apellido, rol, id_sede } = req.query;
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 10));

    const condiciones = [];
    const valores = [];

    if (nombre) {
      condiciones.push('usuario.nombre LIKE ?');
      valores.push(`%${nombre}%`);
    }
    if (apellido) {
      condiciones.push('usuario.apellido LIKE ?');
      valores.push(`%${apellido}%`);
    }
    if (rol) {
      condiciones.push('usuario.rol = ?');
      valores.push(rol);
    }
    if (id_sede) {
      condiciones.push('usuario.id_sede = ?');
      valores.push(id_sede);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM usuario ${where}`, valores);

    const [usuarios] = await pool.query(
      `SELECT usuario.id, usuario.nombre, usuario.apellido, usuario.dni, usuario.email, usuario.telefono,
              usuario.fecha_nacimiento, usuario.rol, usuario.id_sede, sede.nombre AS sede,
              usuario.id_cobertura, cobertura.nombre AS cobertura
       FROM usuario
       LEFT JOIN sede ON usuario.id_sede = sede.id
       LEFT JOIN cobertura ON usuario.id_cobertura = cobertura.id
       ${where}
       ORDER BY usuario.apellido, usuario.nombre, usuario.id
       LIMIT ? OFFSET ?`,
      [...valores, limite, (pagina - 1) * limite]
    );

    return responder(res, 200, 'ok', { usuarios, total: Number(total), pagina, limite });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al listar los usuarios');
  }
}

async function obtener(req, res) {
  try {
    const [usuarios] = await pool.query(
      `SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, rol, id_sede, id_cobertura
       FROM usuario WHERE id = ?`,
      [req.params.id]
    );
    if (usuarios.length === 0) {
      return responder(res, 404, 'Usuario no encontrado');
    }
    const usuario = usuarios[0];
    usuario.especialidades = usuario.rol === 'medico' ? await especialidadesDe(usuario.id) : [];
    return responder(res, 200, 'ok', usuario);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al obtener el usuario');
  }
}

async function crear(req, res) {
  const conexion = await pool.getConnection();
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, rol, id_sede, especialidades } = req.body;
    const telefono = req.body.telefono || '';

    if (!ROLES_ALTA.includes(rol)) {
      return responder(res, 400, `El rol debe ser uno de: ${ROLES_ALTA.join(', ')}`);
    }

    const error = validarDatosPersonales(req.body, { passwordObligatoria: true });
    if (error) {
      return responder(res, 400, error);
    }

    let sede = null;
    if (ROLES_CON_SEDE.includes(rol)) {
      if (!id_sede) {
        return responder(res, 400, 'Los médicos y operadores deben tener una sede asignada');
      }
      if (!(await existeSede(id_sede))) {
        return responder(res, 400, 'La sede indicada no existe');
      }
      sede = Number(id_sede);
    }

    let idsEspecialidades = [];
    if (rol === 'medico') {
      const resultado = await validarEspecialidades(especialidades);
      if (resultado.error) {
        return responder(res, 400, resultado.error);
      }
      idsEspecialidades = resultado.ids;
    }

    if (await existeDuplicado(dni, email)) {
      return responder(res, 409, 'Ya existe un usuario con ese DNI o email');
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

    await conexion.beginTransaction();
    const [resultado] = await conexion.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [apellido, nombre, fecha_nacimiento, passwordHash, rol, email, telefono, dni, sede]
    );
    const id = resultado.insertId;

    for (const id_especialidad of idsEspecialidades) {
      await conexion.query(
        'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
        [id, id_especialidad]
      );
    }
    await conexion.commit();

    return responder(res, 201, 'ok', {
      id,
      nombre,
      apellido,
      dni,
      email,
      rol,
      id_sede: sede,
      especialidades: idsEspecialidades,
    });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error(error);
    return responder(res, 500, 'Error interno al crear el usuario');
  } finally {
    conexion.release();
  }
}

async function modificar(req, res) {
  const conexion = await pool.getConnection();
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, email, password, fecha_nacimiento, id_sede, id_cobertura, especialidades } = req.body;
    const telefono = req.body.telefono || '';

    const [usuarios] = await pool.query('SELECT id, rol FROM usuario WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return responder(res, 404, 'Usuario no encontrado');
    }
    const { rol } = usuarios[0];

    if (req.body.rol && req.body.rol !== rol) {
      return responder(res, 400, 'El tipo de usuario no se puede modificar');
    }

    const error = validarDatosPersonales(req.body, { passwordObligatoria: false });
    if (error) {
      return responder(res, 400, error);
    }

    let sede = null;
    if (ROLES_CON_SEDE.includes(rol)) {
      if (!id_sede) {
        return responder(res, 400, 'Los médicos y operadores deben tener una sede asignada');
      }
      if (!(await existeSede(id_sede))) {
        return responder(res, 400, 'La sede indicada no existe');
      }
      sede = Number(id_sede);
    }

    let cobertura = null;
    if (rol === 'paciente') {
      if (!id_cobertura) {
        return responder(res, 400, 'Un paciente debe tener una cobertura');
      }
      if (!(await existeCobertura(id_cobertura))) {
        return responder(res, 400, 'La cobertura indicada no existe');
      }
      cobertura = Number(id_cobertura);
    }

    let idsEspecialidades = [];
    if (rol === 'medico') {
      const resultado = await validarEspecialidades(especialidades);
      if (resultado.error) {
        return responder(res, 400, resultado.error);
      }
      idsEspecialidades = resultado.ids;

      // No se puede quitar una especialidad que el medico tiene en agenda vigente.
      const [enUso] = await pool.query(
        `SELECT DISTINCT especialidad.descripcion
         FROM agenda JOIN especialidad ON agenda.id_especialidad = especialidad.id
         WHERE agenda.id_medico = ? AND agenda.fecha >= ? AND agenda.id_especialidad NOT IN (?)`,
        [id, ahoraLocal().fecha, idsEspecialidades]
      );
      if (enUso.length > 0) {
        return responder(
          res,
          409,
          `No se puede quitar la especialidad ${enUso.map((e) => e.descripcion).join(', ')}: el médico tiene agenda cargada con ella`
        );
      }
    }

    if (await existeDuplicado(dni, email, id)) {
      return responder(res, 409, 'Ya existe otro usuario con ese DNI o email');
    }

    await conexion.beginTransaction();
    await conexion.query(
      `UPDATE usuario SET nombre = ?, apellido = ?, dni = ?, email = ?, telefono = ?, fecha_nacimiento = ?,
              id_sede = ?, id_cobertura = ?
       WHERE id = ?`,
      [nombre, apellido, dni, email, telefono, fecha_nacimiento, sede, cobertura, id]
    );

    if (password) {
      const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
      await conexion.query('UPDATE usuario SET password = ? WHERE id = ?', [passwordHash, id]);
    }

    if (rol === 'medico') {
      await conexion.query('DELETE FROM medico_especialidad WHERE id_medico = ?', [id]);
      for (const id_especialidad of idsEspecialidades) {
        await conexion.query(
          'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
          [id, id_especialidad]
        );
      }
    }
    await conexion.commit();

    return responder(res, 200, 'ok', {
      id: Number(id),
      nombre,
      apellido,
      dni,
      email,
      rol,
      id_sede: sede,
      id_cobertura: cobertura,
      especialidades: idsEspecialidades,
      ...(password ? { cambio_password: 'si' } : {}),
    });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error(error);
    return responder(res, 500, 'Error interno al modificar el usuario');
  } finally {
    conexion.release();
  }
}

module.exports = { listar, obtener, crear, modificar };
