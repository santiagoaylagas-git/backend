const { Router } = require('express');
const {
  turnosPorEspecialidad,
  turnosPorSede,
  rankingMedicos,
  tasaCancelacion,
} = require('../controllers/reporteController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarRol('admin'));

router.get('/turnos-por-especialidad', turnosPorEspecialidad);
router.get('/turnos-por-sede', turnosPorSede);
router.get('/ranking-medicos', rankingMedicos);
router.get('/tasa-cancelacion', tasaCancelacion);

module.exports = router;
