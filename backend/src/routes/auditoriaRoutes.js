const { Router } = require('express');
const { listar } = require('../controllers/auditoriaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('admin'));

router.get('/', listar);

module.exports = router;
