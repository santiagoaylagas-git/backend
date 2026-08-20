const { Router } = require('express');
const { crear, cancelar, atender, misTurnos, turnosMedico, turnosSede } = require('../controllers/turnoController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.post('/', verificarRol('paciente', 'operador'), crear);
router.get('/mios', verificarRol('paciente'), misTurnos);
router.get('/medico', verificarRol('medico'), turnosMedico);
router.get('/sede', verificarRol('operador'), turnosSede);
router.put('/:id/cancelar', verificarRol('paciente', 'operador', 'medico'), cancelar);
router.put('/:id/atender', verificarRol('medico'), atender);

module.exports = router;
