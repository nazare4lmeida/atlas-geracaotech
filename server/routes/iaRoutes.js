const express = require('express');
const ia = require('../controllers/iaController');
const rateLimit = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Tutor da aula: limite de 10 perguntas por minuto por IP, para conter custo.
router.post('/tutor', rateLimit({ windowMs: 60_000, max: 10 }), asyncHandler(ia.tutor));

module.exports = router;
