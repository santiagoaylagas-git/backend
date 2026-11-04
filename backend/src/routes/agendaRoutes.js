const { Router } = require('express');
const { crear, listar, modificar, eliminar } = require('../controllers/agendaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

router.use(verificarToken, verificarRol('medico', 'operador'), auditar('agenda'));

router.post('/', crear);
router.get('/', listar);
router.put('/:id', modificar);
router.delete('/:id', eliminar);

module.exports = router;
