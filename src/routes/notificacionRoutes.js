const { Router } = require('express');
const { listar, marcarLeida } = require('../controllers/notificacionController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', listar);
router.put('/:id/leida', marcarLeida);

module.exports = router;
