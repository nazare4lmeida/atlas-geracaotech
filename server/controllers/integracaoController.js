const integracaoRepo = require('../db/integracaoRepo');
const { upsertMatricula } = require('../services/matriculaIngest');
const { digitsOf } = require('../services/cpf');

// Teste de conexão: o site usa para confirmar que a chave funciona.
exports.ping = async (req, res) => {
  res.json({ ok: true, integracao: req.integration.nome, versao: 1 });
};

// Recebe ou atualiza um aluno aprovado e matriculado. 201 quando cria, 200 quando atualiza.
exports.receberMatricula = async (req, res) => {
  const digits = digitsOf(req.body?.cpf);
  const cpfMascarado = digits.length >= 2 ? `***.***.***-${digits.slice(-2)}` : '';
  try {
    const { id, created, contaCriada } = await upsertMatricula(req.body || {});
    await integracaoRepo.recordEvent({
      clientId: req.integration.id,
      tipo: 'matricula',
      referencia: cpfMascarado,
      sucesso: true,
      mensagem: `${created ? 'criada' : 'atualizada'}${contaCriada ? ' (conta de aluno criada)' : ''}`
    });
    return res.status(created ? 201 : 200).json({ id, status: created ? 'criada' : 'atualizada', contaCriada });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      await integracaoRepo.recordEvent({
        clientId: req.integration.id,
        tipo: 'matricula',
        referencia: cpfMascarado,
        sucesso: false,
        mensagem: error.message
      });
    }
    throw error;
  }
};

// Cadastra ou atualiza uma turma (sem alterar alunos). Os alunos vêm pela matrícula.
exports.receberTurma = async (req, res) => {
  const { withTransaction } = require('../db/pool');
  const { upsertTurma } = require('../services/turmaSync');
  try {
    const { id, created } = await withTransaction(async (client) => {
      const before = await client.query('select id from turmas where external_id = $1', [req.body?.codigo || '']);
      const turmaId = await upsertTurma(client, req.body || {});
      return { id: turmaId, created: before.rows.length === 0 };
    });
    await integracaoRepo.recordEvent({ clientId: req.integration.id, tipo: 'turma', referencia: String(req.body?.codigo || '').slice(0, 60), sucesso: true, mensagem: created ? 'criada' : 'atualizada' });
    return res.status(created ? 201 : 200).json({ id, status: created ? 'criada' : 'atualizada' });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      await integracaoRepo.recordEvent({ clientId: req.integration.id, tipo: 'turma', referencia: String(req.body?.codigo || '').slice(0, 60), sucesso: false, mensagem: error.message });
    }
    throw error;
  }
};

// Recebe o calendário de aulas de uma turma (somente leitura no Atlas). Repetir o envio atualiza.
// Desativado: o Atlas é a fonte das aulas. O site do GT não envia mais o cronograma.
exports.receberAulas = async (req, res) => {
  return res.status(410).json({ message: 'Sincronização de aulas desativada: o Atlas é a fonte do cronograma.' });
};

