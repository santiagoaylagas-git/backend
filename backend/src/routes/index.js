const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const coberturaRoutes = require('./coberturaRoutes');
const sedeRoutes = require('./sedeRoutes');
const especialidadRoutes = require('./especialidadRoutes');
const agendaRoutes = require('./agendaRoutes');
const turnoRoutes = require('./turnoRoutes');
const historialRoutes = require('./historialRoutes');
const notificacionRoutes = require('./notificacionRoutes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/coberturas', coberturaRoutes);
router.use('/sedes', sedeRoutes);
router.use('/especialidades', especialidadRoutes);
router.use('/agenda', agendaRoutes);
router.use('/turnos', turnoRoutes);
router.use('/historial', historialRoutes);
router.use('/notificaciones', notificacionRoutes);

module.exports = router;
