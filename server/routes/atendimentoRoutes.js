const express = require('express');
const atendimento = require('../controllers/atendimentoController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Aluno: a própria conversa com o robô e a equipe.
router.get('/aluno/sessao', asyncHandler(atendimento.sessaoAluno));
router.post('/aluno/mensagens', asyncHandler(atendimento.enviarMensagemAluno));
router.post('/aluno/assunto', asyncHandler(atendimento.escolherAssunto));
router.post('/aluno/falar-com-equipe', asyncHandler(atendimento.falarComEquipe));
router.post('/aluno/anexo', asyncHandler(atendimento.anexoAluno));

// Anexos (imagem ou PDF): quem participa da conversa.
router.get('/anexos/:id', asyncHandler(atendimento.abrirAnexo));

// Acompanhamento: administração e atendentes veem a fila e as conversas.
const atendimentoRelatorio = require('../controllers/atendimentoRelatorioController');
router.get('/gestao/resumo', requireRole('admin', 'atendente', 'gestao'), asyncHandler(atendimento.resumoGestao));
router.get('/gestao/sessoes', requireRole('admin', 'atendente'), asyncHandler(atendimento.listarSessoes));
router.get('/gestao/sessoes/:id', requireRole('admin', 'atendente'), asyncHandler(atendimento.detalheSessao));

// Resposta e encerramento: só o atendente. A administração apenas acompanha.
router.post('/gestao/sessoes/:id/mensagens', requireRole('atendente'), asyncHandler(atendimento.responder));
router.post('/gestao/sessoes/:id/finalizar', requireRole('atendente'), asyncHandler(atendimento.finalizar));
router.post('/gestao/sessoes/:id/arquivar', requireRole('atendente'), asyncHandler(atendimento.arquivar));
router.post('/gestao/sessoes/:id/anexo', requireRole('atendente'), asyncHandler(atendimento.anexoEquipe));

// Perguntas do robô: configuração da administração.

router.get('/gestao/relatorio', requireRole('admin', 'gestao'), asyncHandler(atendimentoRelatorio.relatorioGestao));
router.get('/gestao/faq', requireRole('admin'), asyncHandler(atendimento.listarFaq));
router.post('/gestao/faq', requireRole('admin'), asyncHandler(atendimento.criarFaq));
router.patch('/gestao/faq/:id', requireRole('admin'), asyncHandler(atendimento.atualizarFaq));
router.delete('/gestao/faq/:id', requireRole('admin'), asyncHandler(atendimento.removerFaq));

module.exports = router;
