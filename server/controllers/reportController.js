const { buildEnrollmentReport } = require('../services/reports');
const relatorios = require('../services/relatoriosOperacao');
const { isoDate } = require('../services/validators');
const httpError = require('../utils/httpError');

// Acompanhamento da gestão: uma linha por aluno e curso, já com progresso, notas, presença e certificado.
async function enrollmentReport(req, res) {
  const report = await buildEnrollmentReport();
  res.json(report);
}

// Marcos do período (datas AAAA-MM-DD). Padrão: do início do ano até hoje.
async function operacaoMarcos(req, res) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const de = isoDate(req.query.de || `${hoje.slice(0, 4)}-01-01`);
  const ate = isoDate(req.query.ate || hoje);
  if (!de || !ate) throw httpError(400, 'Informe o período.');
  if (de > ate) throw httpError(400, 'A data inicial é posterior à final.');
  res.json(await relatorios.marcos({ de, ate }));
}

// Lista de alunos com filtros. curso aceita o id do curso; situacao aceita ativo, concluido, desistente, removido ou todos.
async function operacaoAlunos(req, res) {
  const situacao = ['todos', ...relatorios.SITUACOES].includes(req.query.situacao) ? req.query.situacao : 'todos';
  const cursoId = /^[0-9a-f-]{36}$/i.test(String(req.query.curso || '')) ? String(req.query.curso) : null;
  res.json(await relatorios.listaAlunos({
    q: String(req.query.q || '').slice(0, 120),
    cursoId,
    modalidade: ['Online', 'Presencial'].includes(req.query.modalidade) ? req.query.modalidade : '',
    turno: ['Manhã', 'Tarde', 'Noite'].includes(req.query.turno) ? req.query.turno : '',
    situacao
  }));
}

module.exports = { enrollmentReport, operacaoMarcos, operacaoAlunos };
