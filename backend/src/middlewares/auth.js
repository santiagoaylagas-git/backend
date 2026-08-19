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

function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return responder(res, 403, 'No tiene permisos para acceder a este recurso');
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
