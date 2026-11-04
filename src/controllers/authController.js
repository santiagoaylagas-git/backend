const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { responder } = require('../utils/respuesta');
const { validarDatosPersonales } = require('../utils/validaciones');

const SALT_ROUNDS = 10;

async function registro(req, res) {
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura } = req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !id_cobertura) {
      return responder(res, 400, 'Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura');
    }

    // Mismas reglas de formato que el formulario del front y la gestion de usuarios.
    const errorDatos = validarDatosPersonales(req.body, { passwordObligatoria: true });
    if (errorDatos) {
      return responder(res, 400, errorDatos);
    }

    const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id_cobertura]);
    if (coberturas.length === 0) {
      return responder(res, 400, 'La cobertura indicada no existe');
    }

    const [duplicados] = await pool.query('SELECT id FROM usuario WHERE dni = ? OR email = ?', [dni, email]);
    if (duplicados.length > 0) {
      return responder(res, 409, 'Ya existe un usuario con ese DNI o email');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, 'paciente', ?, ?, ?, NULL, ?)`,
      [apellido, nombre, fecha_nacimiento, passwordHash, email, req.body.telefono || '', dni, id_cobertura]
    );

    return responder(res, 201, 'ok', {
      id: resultado.insertId,
      nombre,
      apellido,
      dni,
      email,
      rol: 'paciente',
      id_cobertura,
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al registrar el usuario');
  }
}

async function login(req, res) {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return responder(res, 400, 'Faltan datos obligatorios: dni, password');
    }

    const [usuarios] = await pool.query('SELECT * FROM usuario WHERE dni = ?', [dni]);
    if (usuarios.length === 0) {
      return responder(res, 401, 'Credenciales inválidas');
    }

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return responder(res, 401, 'Credenciales inválidas');
    }

    const payload = {
      id: usuario.id,
      rol: usuario.rol,
      id_sede: usuario.id_sede,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return responder(res, 200, 'ok', { token, usuario: payload });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al iniciar sesión');
  }
}

async function perfil(req, res) {
  try {
    const [usuarios] = await pool.query(
      `SELECT usuario.id, usuario.apellido, usuario.nombre, usuario.fecha_nacimiento, usuario.rol, usuario.email,
              usuario.telefono, usuario.dni, usuario.id_sede, sede.nombre AS sede,
              usuario.id_cobertura, cobertura.nombre AS cobertura
       FROM usuario
       LEFT JOIN sede ON usuario.id_sede = sede.id
       LEFT JOIN cobertura ON usuario.id_cobertura = cobertura.id
       WHERE usuario.id = ?`,
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return responder(res, 404, 'Usuario no encontrado');
    }

    return responder(res, 200, 'ok', usuarios[0]);
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al obtener el perfil');
  }
}

// El paciente actualiza sus propios datos: solo email, contrasena, telefono y cobertura.
// Cualquier otro campo del body se ignora.
async function actualizarPerfil(req, res) {
  try {
    const { email, telefono, id_cobertura, password } = req.body;

    if (!email || !id_cobertura) {
      return responder(res, 400, 'Faltan datos obligatorios: email, id_cobertura');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || String(email).length > 30) {
      return responder(res, 400, 'El email no es válido (máximo 30 caracteres)');
    }
    if (telefono && !/^\d{6,10}$/.test(String(telefono))) {
      return responder(res, 400, 'El teléfono debe tener entre 6 y 10 dígitos');
    }
    if (password !== undefined && password !== null && password !== '' && String(password).length < 6) {
      return responder(res, 400, 'La contraseña debe tener al menos 6 caracteres');
    }

    const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id_cobertura]);
    if (coberturas.length === 0) {
      return responder(res, 400, 'La cobertura indicada no existe');
    }

    const [duplicados] = await pool.query('SELECT id FROM usuario WHERE email = ? AND id <> ?', [
      email,
      req.usuario.id,
    ]);
    if (duplicados.length > 0) {
      return responder(res, 409, 'Ya existe otro usuario con ese email');
    }

    await pool.query('UPDATE usuario SET email = ?, telefono = ?, id_cobertura = ? WHERE id = ?', [
      email,
      telefono || '',
      id_cobertura,
      req.usuario.id,
    ]);

    if (password) {
      const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
      await pool.query('UPDATE usuario SET password = ? WHERE id = ?', [passwordHash, req.usuario.id]);
    }

    return responder(res, 200, 'ok', {
      id: req.usuario.id,
      email,
      telefono: telefono || '',
      id_cobertura: Number(id_cobertura),
      ...(password ? { cambio_password: 'si' } : {}),
    });
  } catch (error) {
    console.error(error);
    return responder(res, 500, 'Error interno al actualizar los datos personales');
  }
}

async function panelAdmin(req, res) {
  return responder(res, 200, 'ok', { mensaje: `Acceso concedido para el rol '${req.usuario.rol}'` });
}

module.exports = { registro, login, perfil, actualizarPerfil, panelAdmin };
