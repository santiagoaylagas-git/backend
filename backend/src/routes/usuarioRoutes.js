const { Router } = require('express');
const { listar, obtener, crear, modificar } = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

// Gestion de usuarios: exclusiva del administrador. Altas y modificaciones auditadas.
router.use(verificarToken, verificarRol('admin'), auditar('usuario'));

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', modificar);

module.exports = router;
