const express = require('express');
const ia = require('../controllers/iaController');
const rateLimit = require('../middleware/rateLimit');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Qualquer usuario logado consulta se a IA esta disponível (a tela so mostra o assistente se estiver).
router.get('/estado', asyncHandler(ia.estado));

// Liga/desliga a IA pelo sistema. So administracao.
router.put('/estado', requireRole('admin'), asyncHandler(ia.definirEstado));

// Tutor da aula: limite de 10 perguntas por minuto por IP, para conter custo.
router.post('/tutor', rateLimit({ windowMs: 60_000, max: 10 }), asyncHandler(ia.tutor));

module.exports = router;
