const express = require('express');
const docente = require('../controllers/docenteController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// Área do professor (montada em /api/docente, com autenticação). Administração também acessa.
const router = express.Router();
router.get('/gestao/ponto', requireRole('admin', 'gestao'), asyncHandler(docente.gestaoPonto));
router.get('/gestao/ponto/exportar', requireRole('admin', 'gestao'), asyncHandler(docente.exportarPontoGestao));
router.use(requireRole('admin', 'teacher'));

// Turmas e cronograma das turmas que ministra. Editar o cronograma é só da administração.
router.get('/turmas', asyncHandler(docente.turmas));
router.get('/turmas/:turmaId/aulas', asyncHandler(docente.aulasDaTurma));
router.put('/turmas/:turmaId/link', requireRole('admin'), asyncHandler(docente.definirLink));
router.post('/turmas/:turmaId/aulas/gerar', requireRole('admin'), asyncHandler(docente.gerarAulas));
router.post('/turmas/:turmaId/aulas/lote', requireRole('admin'), asyncHandler(docente.editarLote));
router.post('/turmas/:turmaId/aulas/importar', requireRole('admin'), asyncHandler(docente.importarAulas));
router.post('/turmas/:turmaId/aulas/preencher-modulos', requireRole('admin'), asyncHandler(docente.preencherModulos));
router.post('/turmas/:turmaId/aulas', requireRole('admin'), asyncHandler(docente.criarAulaAvulsa));
router.patch('/aulas/:sessionId', requireRole('admin'), asyncHandler(docente.atualizarAula));
router.post('/aulas/:sessionId/cancelamento', requireRole('admin'), asyncHandler(docente.cancelarAula));
router.delete('/aulas/:sessionId', requireRole('admin'), asyncHandler(docente.removerAula));

// Presença por aula.
router.get('/aulas/:sessionId/presenca', asyncHandler(docente.presencaDaAula));
router.put('/aulas/:sessionId/presenca/:userId', asyncHandler(docente.marcarPresenca));

// Professores da turma: quem vê, e a administração define.
router.get('/turmas/:turmaId/professores', asyncHandler(docente.professoresDaTurma));
router.put('/turmas/:turmaId/professores', requireRole('admin'), asyncHandler(docente.definirProfessores));
router.get('/professores', requireRole('admin'), asyncHandler(docente.listarProfessores));

// Perfil do professor: aulas que ministra, turmas como o aluno vê, e arquivos.
router.get('/perfil', asyncHandler(docente.perfil));
router.get('/perfil/turmas/:turmaId/cronograma', asyncHandler(docente.cronogramaComoAluno));
router.get('/arquivos', asyncHandler(docente.listarArquivos));
router.post('/arquivos', asyncHandler(docente.enviarArquivo));
router.get('/arquivos/:arquivoId', asyncHandler(docente.baixarArquivo));
router.delete('/arquivos/:arquivoId', asyncHandler(docente.removerArquivo));

// Ponto sem GPS: entrada e saída na aula de hoje, aula extra e histórico.
router.get('/ponto/hoje', asyncHandler(docente.pontoHoje));
router.post('/ponto/entrada', asyncHandler(docente.entrada));
router.post('/ponto/:pontoId/saida', asyncHandler(docente.saida));
router.post('/ponto/extra', asyncHandler(docente.aulaExtra));
router.get('/ponto', asyncHandler(docente.historicoPonto));

// Administração: ponto de todos os professores, só para visualizar e exportar (a gestão não altera os registros).

module.exports = router;