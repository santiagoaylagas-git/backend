const { Router } = require('express');
const { listar } = require('../controllers/coberturaController');

const router = Router();

router.get('/', listar);

module.exports = router;
