const express = require('express');
const presenca = require('../controllers/presencaController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Aluno: marca a própria presença, vê o histórico e envia justificativas.
router.get('/aluno/hoje', asyncHandler(presenca.aulasHoje));
router.post('/aluno/marcar', asyncHandler(presenca.marcarPresenca));
router.get('/aluno/historico', asyncHandler(presenca.historico));
router.post('/aluno/aulas/:sessionId/justificativa', asyncHandler(presenca.justificar));

// Cronograma do aluno: aulas das turmas em que está matriculado.
router.get('/aluno/cronograma', asyncHandler(presenca.cronogramaAluno));

// Gestão: calendário de presença por turma (administração e docentes).
router.get('/gestao/turmas', requireRole('admin', 'teacher'), asyncHandler(presenca.gestaoTurmas));
router.get('/gestao/turmas/:turmaId/aulas', requireRole('admin', 'teacher'), asyncHandler(presenca.gestaoAulas));

// Gestão: a decisão sobre justificativas é só da administração.
router.get('/gestao/justificativas', requireRole('admin'), asyncHandler(presenca.listarJustificativas));
router.post('/gestao/justificativas/:id/decisao', requireRole('admin'), asyncHandler(presenca.decidirJustificativa));

module.exports = router;
