const { Router } = require('express');
const { registro, login, perfil, actualizarPerfil, panelAdmin } = require('../controllers/authController');
const { verificarToken, verificarRol, tokenOpcional } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

// Publico (registro del paciente) y reutilizado por el operador para dar de alta pacientes.
router.post('/registro', tokenOpcional, auditar('usuario'), registro);
router.post('/login', login);
router.get('/perfil', verificarToken, perfil);
// El paciente solo puede modificar email, contrasena, telefono y cobertura.
router.put('/perfil', verificarToken, verificarRol('paciente'), auditar('usuario'), actualizarPerfil);
router.get('/panel-admin', verificarToken, verificarRol('admin'), panelAdmin);

module.exports = router;
