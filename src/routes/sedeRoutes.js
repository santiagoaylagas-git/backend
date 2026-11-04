const { Router } = require('express');
const { crear, listar, modificar, eliminar } = require('../controllers/sedeController');
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

router.use(verificarToken);

// El listado es de lectura para cualquier usuario con sesion: lo usan los
// desplegables de agenda, turnos y usuarios de los demas roles.
router.get('/', listar);

// El alta, la modificacion y la baja siguen siendo exclusivas del administrador.
router.use(verificarRol('admin'), auditar('sede'));

router.post('/', crear);
router.put('/:id', modificar);
router.delete('/:id', eliminar);

module.exports = router;
