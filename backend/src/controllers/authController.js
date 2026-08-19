const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { responder } = require('../utils/respuesta');

const SALT_ROUNDS = 10;

async function registro(req, res) {
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura } = req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !id_cobertura) {
      return responder(res, 400, 'Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura');
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
      'SELECT id, apellido, nombre, fecha_nacimiento, rol, email, telefono, dni, id_sede, id_cobertura FROM usuario WHERE id = ?',
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

async function panelAdmin(req, res) {
  return responder(res, 200, 'ok', { mensaje: `Acceso concedido para el rol '${req.usuario.rol}'` });
}

module.exports = { registro, login, perfil, panelAdmin };
