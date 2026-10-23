const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepo = require('../db/authRepo');
const { digitsOf, hashCpf, decryptCpf } = require('../services/cpf');
const { passwordProblems } = require('../services/passwordPolicy');
const { sanitizeUser } = require('../services/users');
const httpError = require('../utils/httpError');

// Bloqueio: 5 senhas erradas seguidas travam a conta por 15 minutos.
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_FAILURE = 'CPF/e-mail ou senha inválidos.';

// Um hash fixo para comparar mesmo quando a conta não existe (evita revelar quais contas existem pelo tempo).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

function createToken(user) {
  return jwt.sign({ id: user.id, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

// Identificador: e-mail (gestão) ou CPF com ou sem máscara (aluno). Devolve { email } ou { cpfHash, digits }.
function parseIdentifier(raw) {
  const value = String(raw || '').trim();
  if (value.includes('@')) return { email: value.toLowerCase() };
  const digits = digitsOf(value);
  if (digits.length === 11) return { cpfHash: hashCpf(digits), digits };
  return null;
}

// Senha conferida. Enquanto a troca de senha estiver pendente (primeiro acesso), o CPF com ou sem máscara
// também vale, porque a senha inicial é o próprio CPF.
async function passwordMatches(user, typed) {
  if (await bcrypt.compare(typed, user.passwordHash)) return true;
  const cpfDigits = user.cpfEncrypted ? decryptCpf(user.cpfEncrypted) : '';
  if (user.mustChangePassword && cpfDigits && digitsOf(typed) === cpfDigits) {
    return bcrypt.compare(cpfDigits, user.passwordHash);
  }
  return false;
}

function lockedMessage(lockedUntil) {
  const minutes = Math.max(1, Math.ceil((new Date(lockedUntil) - Date.now()) / 60000));
  return `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`;
}

exports.login = async (req, res) => {
  const ip = req.ip;
  const identifierRaw = String(req.body.identifier ?? req.body.email ?? '').trim();
  const password = String(req.body.password ?? '');

  const parsed = parseIdentifier(identifierRaw);
  if (!parsed || !password || password.length > 256) {
    await authRepo.recordLoginEvent({ identifier: identifierRaw, ip, success: false, reason: 'formato' });
    throw httpError(401, GENERIC_FAILURE);
  }

  const user = await authRepo.findAuthUserByIdentifier(parsed);

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    await authRepo.recordLoginEvent({ identifier: identifierRaw, ip, success: false, reason: 'desconhecido' });
    throw httpError(401, GENERIC_FAILURE);
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    await authRepo.recordLoginEvent({ userId: user.id, identifier: identifierRaw, ip, success: false, reason: 'bloqueada' });
    return res.status(423).json({ message: lockedMessage(user.lockedUntil) });
  }

  if (user.active === false) {
    await authRepo.recordLoginEvent({ userId: user.id, identifier: identifierRaw, ip, success: false, reason: 'desativada' });
    throw httpError(403, 'Conta desativada. Procure a administração.');
  }

  let valid = false;

  if (!user.passwordHash) {
    // Primeiro acesso: conta importada sem senha. O CPF digitado (com ou sem máscara) é a senha inicial,
    // e a pessoa é obrigada a trocá-la logo em seguida.
    if (parsed.digits && digitsOf(password) === parsed.digits) {
      const passwordHash = await bcrypt.hash(password.replace(/\D/g, ''), 10);
      await authRepo.setPasswordHash(user.id, passwordHash, { mustChangePassword: true });
      user.passwordHash = passwordHash;
      user.mustChangePassword = true;
      valid = true;
    }
  } else {
    valid = await passwordMatches(user, password);
  }

  if (!valid) {
    const failure = await authRepo.registerLoginFailure(user.id, { maxAttempts: MAX_ATTEMPTS, lockMinutes: LOCK_MINUTES });
    await authRepo.recordLoginEvent({ userId: user.id, identifier: identifierRaw, ip, success: false, reason: 'senha' });
    if (failure && failure.locked_until && new Date(failure.locked_until) > new Date()) {
      return res.status(423).json({ message: lockedMessage(failure.locked_until) });
    }
    throw httpError(401, GENERIC_FAILURE);
  }

  await authRepo.clearLoginFailures(user.id);
  await authRepo.recordLoginEvent({ userId: user.id, identifier: identifierRaw, ip, success: true, reason: 'ok' });

  const fresh = await authRepo.findAuthUserById(user.id);
  return res.json({
    token: createToken(fresh),
    user: sanitizeUser(fresh),
    mustChangePassword: Boolean(fresh.mustChangePassword)
  });
};

// Troca de senha (inclusive a obrigatória do primeiro acesso). Exige a senha atual.
exports.changePassword = async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  const user = await authRepo.findAuthUserById(req.user.id);
  if (!user || !user.passwordHash) {
    throw httpError(400, 'Não foi possível trocar a senha. Entre novamente.');
  }

  const valid = await passwordMatches(user, currentPassword);
  if (!valid) {
    await authRepo.recordLoginEvent({ userId: user.id, identifier: user.email || '', ip: req.ip, success: false, reason: 'troca-senha' });
    throw httpError(400, 'A senha atual não confere.');
  }

  if (newPassword === currentPassword) {
    throw httpError(400, 'A nova senha precisa ser diferente da atual.');
  }

  const cpfDigits = user.cpfEncrypted ? decryptCpf(user.cpfEncrypted) : '';
  const problems = passwordProblems(newPassword, { cpfDigits, email: user.email });
  if (problems.length) {
    throw httpError(400, problems.join(' '));
  }

  const tokenVersion = await authRepo.setPasswordHash(user.id, await bcrypt.hash(newPassword, 10), { mustChangePassword: false });
  const fresh = await authRepo.findAuthUserById(user.id);
  fresh.tokenVersion = tokenVersion;
  await authRepo.recordLoginEvent({ userId: user.id, identifier: user.email || '', ip: req.ip, success: true, reason: 'senha-trocada' });

  return res.json({
    message: 'Senha atualizada com sucesso.',
    token: createToken(fresh),
    user: sanitizeUser(fresh),
    mustChangePassword: false
  });
};

exports.me = async (req, res) => {
  return res.json({
    user: sanitizeUser(req.user)
  });
};
