const { Router } = require('express');
const { listar } = require('../controllers/medicoController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', listar);

module.exports = router;
