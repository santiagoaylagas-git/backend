const { Router } = require('express');
const { registro, login, perfil, panelAdmin } = require('../controllers/authController');
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

router.post('/registro', auditar('usuario'), registro);
router.post('/login', login);
router.get('/perfil', verificarToken, perfil);
router.get('/panel-admin', verificarToken, verificarRol('admin'), panelAdmin);

module.exports = router;
