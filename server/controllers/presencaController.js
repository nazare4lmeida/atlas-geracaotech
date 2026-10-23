const presenca = require('../db/presencaRepo');
const httpError = require('../utils/httpError');
const docente = require('../db/docenteRepo');

// Dia da aula no fuso de Brasília (a marcação vale do dia da aula, de 00:00:01 a 23:59:59).
const FUSO = process.env.PRESENCA_FUSO || 'America/Sao_Paulo';

function hojeNoFuso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function resumo(aulas) {
  const realizadas = aulas.filter((aula) => aula.status !== null);
  const presentes = realizadas.filter((aula) => aula.status === 'presente').length;
  const justificadas = realizadas.filter((aula) => aula.status === 'justificado' && aula.tipoJustificativa === 'aceita').length;
  const abonadas = realizadas.filter((aula) => aula.status === 'justificado' && aula.tipoJustificativa === 'abonada').length;
  const faltas = realizadas.filter((aula) => aula.status === 'ausente').length;
  const contam = presentes + justificadas + abonadas;
  return {
    realizadas: realizadas.length,
    presentes,
    justificadas,
    abonadas,
    faltas,
    percentual: realizadas.length ? Math.round((contam / realizadas.length) * 100) : null
  };
}

// Aulas de hoje do aluno. O pop-up de presença usa esta lista.
exports.aulasHoje = async (req, res) => {
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  const aulas = await presenca.aulasDoDia(req.user.id, hoje);
  return res.json({
    data: hoje,
    aulas,
    pendentes: aulas.filter((aula) => aula.status === null).length
  });
};

// Marcação de presença pelo aluno (somente no dia da aula e uma vez).
exports.marcarPresenca = async (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  if (!sessionId) throw httpError(400, 'Informe a aula.');
  const resultado = await presenca.marcarPresenca(req.user.id, sessionId, hojeNoFuso());
  if (resultado === 'fora_da_turma') throw httpError(404, 'Aula não encontrada.');
  if (resultado === 'fora_do_dia') throw httpError(400, 'A presença só pode ser marcada no dia da aula.');
  if (resultado === 'ja_registrada') throw httpError(409, 'A presença desta aula já foi registrada.');
  return res.status(201).json({ status: 'presente' });
};

// Gestão: turmas e aulas (calendário com presença).
// Administração vê todas as turmas; professor vê só as que ministra.
exports.gestaoTurmas = async (req, res) => {
  const turmas = req.user.role === 'admin'
    ? await presenca.listarTurmasGestao()
    : await docente.turmasDoProfessor(req.user.id);
  return res.json({ turmas });
};

exports.gestaoAulas = async (req, res) => {
  const turmaId = String(req.params.turmaId || '');
  if (!/^[0-9a-f-]{36}$/i.test(turmaId)) throw httpError(404, 'Turma não encontrada.');
  if (req.user.role !== 'admin' && !(await docente.professorDaTurma(req.user.id, turmaId))) {
    throw httpError(403, 'Você não ministra esta turma.');
  }
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  return res.json({ aulas: await presenca.aulasDaTurma(turmaId, hoje), hoje });
};

// Cronograma do aluno (aba Cronogramas).
exports.cronogramaAluno = async (req, res) => {
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  return res.json({ aulas: await presenca.cronogramaDoAluno(req.user.id, hoje), hoje });
};

// Histórico do aluno, com resumo de presenças, faltas e justificativas.
exports.historico = async (req, res) => {
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  const aulas = await presenca.historicoDoAluno(req.user.id, hoje);
  return res.json({ aulas, resumo: resumo(aulas) });
};

// Justificativa de falta enviada pelo aluno. Fica pendente até a gestão decidir.
exports.justificar = async (req, res) => {
  const motivo = String(req.body?.motivo || '').trim();
  if (motivo.length < 5) throw httpError(400, 'Descreva o motivo da falta (mínimo de 5 caracteres).');
  if (motivo.length > 1000) throw httpError(400, 'O motivo pode ter no máximo 1000 caracteres.');

  const { resultado, justificativa } = await presenca.criarJustificativa(req.user.id, req.params.sessionId, motivo);
  if (resultado === 'fora_da_turma') throw httpError(404, 'Aula não encontrada.');
  if (resultado === 'sem_falta') throw httpError(400, 'Só é possível justificar uma falta registrada.');
  if (resultado === 'ja_enviada') throw httpError(409, 'Esta falta já tem uma justificativa enviada.');
  return res.status(201).json({ justificativa });
};

// Gestão: justificativas pendentes (ou todas, com ?status=todas).
exports.listarJustificativas = async (req, res) => {
  const status = ['pendente', 'aceita', 'abonada', 'recusada', 'todas'].includes(req.query.status) ? req.query.status : 'pendente';
  return res.json({ justificativas: await presenca.listarJustificativas(status) });
};

// Gestão: aceitar (justificada), abonar ou recusar a justificativa.
exports.decidirJustificativa = async (req, res) => {
  const decisao = String(req.body?.decisao || '');
  const resposta = String(req.body?.resposta || '').trim();
  if (!['aceitar', 'abonar', 'recusar'].includes(decisao)) throw httpError(400, 'Decisão inválida. Use aceitar, abonar ou recusar.');
  const { resultado, status } = await presenca.decidirJustificativa(req.params.id, { decisao, resposta }, req.user.id);
  if (resultado === 'nao_pendente') throw httpError(409, 'Esta justificativa já foi decidida.');
  return res.json({ status });
};
