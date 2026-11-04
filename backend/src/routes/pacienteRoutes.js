const { Router } = require('express');
const { buscar } = require('../controllers/pacienteController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('operador', 'medico', 'admin'));

router.get('/', buscar);

module.exports = router;
