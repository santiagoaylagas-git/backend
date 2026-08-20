const { Router } = require('express');
const { listar, crear, modificar, eliminar } = require('../controllers/coberturaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

// Listado público: reutilizado desde el registro de pacientes (semana 1).
router.get('/', listar);

router.post('/', verificarToken, verificarRol('admin'), crear);
router.put('/:id', verificarToken, verificarRol('admin'), modificar);
router.delete('/:id', verificarToken, verificarRol('admin'), eliminar);

module.exports = router;
