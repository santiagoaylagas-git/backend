const { Router } = require('express');
const { health } = require('../controllers/healthController');

const router = Router();

router.get('/', health);

module.exports = router;
