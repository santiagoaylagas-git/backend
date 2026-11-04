const { Router } = require('express');
const { fechas, horarios } = require('../controllers/disponibilidadController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('paciente', 'operador'));

router.get('/fechas', fechas);
router.get('/horarios', horarios);

module.exports = router;
