const { Router } = require('express');
const { crear, listar, modificar, eliminar } = require('../controllers/agendaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('medico', 'operador'));

router.post('/', crear);
router.get('/', listar);
router.put('/:id', modificar);
router.delete('/:id', eliminar);

module.exports = router;
