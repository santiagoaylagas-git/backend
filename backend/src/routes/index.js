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
const auditoriaRoutes = require('./auditoriaRoutes');
const reporteRoutes = require('./reporteRoutes');
const medicoRoutes = require('./medicoRoutes');
const disponibilidadRoutes = require('./disponibilidadRoutes');
const pacienteRoutes = require('./pacienteRoutes');
const usuarioRoutes = require('./usuarioRoutes');

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
router.use('/auditoria', auditoriaRoutes);
router.use('/reportes', reporteRoutes);
router.use('/medicos', medicoRoutes);
router.use('/disponibilidad', disponibilidadRoutes);
router.use('/pacientes', pacienteRoutes);
router.use('/usuarios', usuarioRoutes);

module.exports = router;
