const bcrypt = require('bcryptjs');
const authRepo = require('../db/authRepo');
const { query } = require('../db/pool');
const httpError = require('../utils/httpError');
const { passwordProblems } = require('../services/passwordPolicy');

// Ações de gestão sobre a conta do aluno (somente admin, via rota protegida).
async function loadTarget(req) {
  const { rows } = await query('select id, role, email, cpf_hash from users where id = $1', [req.params.userId]);
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

// Define uma senha nova para a conta, feita pela gestão. Por padrão o usuário troca no próximo acesso.
// A senha segue a mesma política do sistema; o admin a entrega ao usuário por fora do Atlas.
async function setPassword(req, res) {
  const target = await loadTarget(req);
  const password = String(req.body.password || '');
  const problems = passwordProblems(password, { email: target.email });
  if (problems.length) throw httpError(400, problems.join(' '));

  const mustChangePassword = req.body.mustChangePassword !== false;
  await authRepo.setPasswordHash(target.id, await bcrypt.hash(password, 10), { mustChangePassword });
  res.json({
    message: mustChangePassword
      ? 'Senha definida. O usuário vai precisar trocá-la no próximo acesso.'
      : 'Senha definida. Sessões antigas foram encerradas.'
  });
}

module.exports = { resetFirstAccess, unlock, setPassword };
