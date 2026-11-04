const { Router } = require('express');
const { listar, filtros } = require('../controllers/auditoriaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('admin'));

router.get('/', listar);
router.get('/filtros', filtros);

module.exports = router;
