const jwt = require('jsonwebtoken');
const { responder } = require('../utils/respuesta');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return responder(res, 401, 'Token no provisto');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return responder(res, 401, 'Token inválido o vencido');
    }
    req.usuario = payload;
    next();
  });
}

// Si la peticion trae un token valido, deja cargado req.usuario; si no trae, sigue igual.
// Se usa en el registro de pacientes, que es publico pero tambien lo usa el operador:
// asi la auditoria registra al operador como responsable del alta.
function tokenOpcional(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (!err) {
      req.usuario = payload;
    }
    next();
  });
}

function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return responder(res, 403, 'No tiene permisos para acceder a este recurso');
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol, tokenOpcional };
