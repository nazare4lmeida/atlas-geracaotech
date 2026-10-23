const authRepo = require('../db/authRepo');
const { query } = require('../db/pool');
const httpError = require('../utils/httpError');

// Ações de gestão sobre a conta do aluno (somente admin, via rota protegida).
async function loadTarget(req) {
  const { rows } = await query('select id, role, cpf_hash from users where id = $1', [req.params.userId]);
  if (!rows[0]) throw httpError(404, 'Usuário não encontrado.');
  if (rows[0].id === req.user.id) throw httpError(422, 'Você não pode alterar a própria conta por aqui.');
  return rows[0];
}

async function resetFirstAccess(req, res) {
  const target = await loadTarget(req);
  if (!target.cpf_hash) throw httpError(422, 'Este usuário não tem CPF cadastrado, então não há primeiro acesso por CPF.');
  await authRepo.resetToFirstAccess(target.id);
  res.json({ message: 'Conta devolvida ao primeiro acesso. Login e senha iniciais são o CPF.' });
}

async function unlock(req, res) {
  const target = await loadTarget(req);
  await authRepo.unlockAccount(target.id);
  res.json({ message: 'Conta desbloqueada.' });
}

module.exports = { resetFirstAccess, unlock };
