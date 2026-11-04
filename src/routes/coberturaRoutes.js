const { Router } = require('express');
const { listar, crear, modificar, eliminar } = require('../controllers/coberturaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { auditar } = require('../middlewares/auditoria');

const router = Router();

// Listado público: reutilizado desde el registro de pacientes (semana 1).
router.get('/', listar);

// El alta, la modificacion y la baja quedan restringidas a admin y auditadas;
// el listado de arriba sigue siendo publico.
router.use(verificarToken, verificarRol('admin'), auditar('cobertura'));

router.post('/', crear);
router.put('/:id', modificar);
router.delete('/:id', eliminar);

module.exports = router;
