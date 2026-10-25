const espacos = require('../db/presencaEspacosRepo');
const presenca = require('../db/presencaRepo');
const httpError = require('../utils/httpError');
const { isoDate } = require('../services/validators');

// Presença de turmas e grupos de curso. Admin gerencia tudo; professor gerencia os seus espaços;
// gestão acompanha (vê e exporta, sem alterar). A permissão por espaço é conferida em cada rota.

const FUSO = process.env.PRESENCA_FUSO || 'America/Sao_Paulo';
const STATUS = ['presente', 'ausente', 'justificado'];

function hojeNoFuso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function tipoValido(tipo) {
  if (tipo !== 'turma' && tipo !== 'grupo') throw httpError(404, 'Espaço não encontrado.');
  return tipo;
}

async function exigirEspaco(user, tipo, id, { gerenciar = false } = {}) {
  tipoValido(tipo);
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw httpError(404, 'Espaço não encontrado.');
  const acesso = await espacos.acessoEspaco(user, tipo, id);
  if (!acesso) throw httpError(404, 'Espaço não encontrado.');
  if (gerenciar && !acesso.gerenciar) throw httpError(403, 'Você não gerencia a presença deste espaço.');
  return acesso;
}

async function exigirAula(user, sessionId, { gerenciar = false } = {}) {
  const espaco = await espacos.espacoDaAula(sessionId);
  if (!espaco) throw httpError(404, 'Aula não encontrada.');
  await exigirEspaco(user, espaco.tipo, espaco.id, { gerenciar });
  return espaco;
}

exports.listarEspacos = async (req, res) => {
  return res.json(await espacos.listarEspacos(req.user));
};

exports.aulasDoEspaco = async (req, res) => {
  const { tipo, id } = req.params;
  const acesso = await exigirEspaco(req.user, tipo, id);
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  return res.json({
    aulas: await espacos.aulasDoEspaco(tipo, id, hoje),
    hoje,
    podeGerenciar: acesso.gerenciar,
    nome: acesso.nome
  });
};

exports.criarAula = async (req, res) => {
  const { tipo, id } = req.params;
  await exigirEspaco(req.user, tipo, id, { gerenciar: true });
  const data = isoDate(req.body?.data);
  if (!data) throw httpError(400, 'Informe a data da aula.');
  const titulo = String(req.body?.titulo || '').trim().slice(0, 200);
  const horario = String(req.body?.horario || '').trim().slice(0, 60);
  const resultado = await espacos.criarAula(tipo, id, { data, titulo, horario });
  if (resultado.erro === 'data_ocupada') throw httpError(409, 'Já existe uma aula desta turma nesta data.');
  if (resultado.erro) throw httpError(404, 'Espaço não encontrado.');
  return res.status(201).json({ id: resultado.id });
};

exports.cancelarAula = async (req, res) => {
  await exigirAula(req.user, req.params.sessionId, { gerenciar: true });
  const resultado = await espacos.definirCancelamento(req.params.sessionId, Boolean(req.body?.cancelada));
  if (resultado !== 'ok') throw httpError(404, 'Aula não encontrada.');
  return res.json({ ok: true });
};

exports.removerAula = async (req, res) => {
  await exigirAula(req.user, req.params.sessionId, { gerenciar: true });
  const resultado = await espacos.removerAula(req.params.sessionId);
  if (resultado === 'inexistente') throw httpError(404, 'Aula não encontrada.');
  if (resultado === 'com_registros') {
    throw httpError(409, 'Esta aula já tem presença registrada. Cancele a aula em vez de remover.');
  }
  return res.json({ ok: true });
};

exports.presencaDaAula = async (req, res) => {
  await exigirAula(req.user, req.params.sessionId);
  return res.json({ alunos: await espacos.presencaDaAula(req.params.sessionId) });
};

exports.marcarPresenca = async (req, res) => {
  await exigirAula(req.user, req.params.sessionId, { gerenciar: true });
  const status = req.body?.status === null || req.body?.status === '' ? null : String(req.body?.status || '');
  if (status !== null && !STATUS.includes(status)) throw httpError(400, 'Status de presença inválido.');
  const resultado = await espacos.marcarPresenca(req.params.sessionId, req.params.userId, status, req.user.id);
  if (resultado === 'fora_da_aula') throw httpError(404, 'Este aluno não participa desta aula.');
  return res.json({ ok: true });
};

// Relatório por aluno e espaço, com filtros. Exportado em planilha ou HTML pela própria tela.
exports.relatorio = async (req, res) => {
  const hoje = hojeNoFuso();
  await presenca.fecharAulasVencidas(hoje);
  const tipo = ['turma', 'grupo'].includes(req.query.tipo) ? req.query.tipo : null;
  const modalidade = ['Online', 'Presencial', 'Grupo'].includes(req.query.modalidade) ? req.query.modalidade : null;
  const cursoId = /^[0-9a-f-]{36}$/i.test(String(req.query.cursoId || '')) ? String(req.query.cursoId) : null;
  const de = isoDate(req.query.de) || null;
  const ate = isoDate(req.query.ate) || null;
  const busca = String(req.query.busca || '').trim().slice(0, 120) || null;
  const escopo = req.user.role === 'teacher' ? req.user.id : null;
  const linhas = await espacos.relatorio({ tipo, modalidade, cursoId, de, ate, busca }, hoje, escopo);
  return res.json({ linhas, hoje });
};
