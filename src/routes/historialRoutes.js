const { Router } = require('express');
const { crear, consultar } = require('../controllers/historialController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.post('/', verificarRol('medico'), crear);
router.get('/:idPaciente', verificarRol('paciente', 'medico'), consultar);

module.exports = router;
