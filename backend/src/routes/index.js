const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const coberturaRoutes = require('./coberturaRoutes');
const sedeRoutes = require('./sedeRoutes');
const especialidadRoutes = require('./especialidadRoutes');
const agendaRoutes = require('./agendaRoutes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/coberturas', coberturaRoutes);
router.use('/sedes', sedeRoutes);
router.use('/especialidades', especialidadRoutes);
router.use('/agenda', agendaRoutes);

module.exports = router;
