const authRepo = require('../db/authRepo');

// Acessos (log de logins), visíveis somente à gestão.
// As declarações agora são geradas pelo próprio aluno (ver meController.matriculaPdf).
async function listLogins(req, res) {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  res.json({ events: await authRepo.listLoginEvents({ limit }) });
}

module.exports = { listLogins };