const { query } = require('./pool');

// Consultas usadas pelo login, bloqueio de tentativas, troca de senha e auditoria.

function mapAuthUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    careerGoal: row.career_goal,
    createdAt: row.created_at,
    passwordHash: row.password_hash,
    cpfHash: row.cpf_hash,
    cpfEncrypted: row.cpf_encrypted,
    cpfLast2: row.cpf_last2,
    mustChangePassword: row.must_change_password,
    welcomeSeenAt: row.boas_vindas_em,
    failedLoginCount: row.failed_login_count,
    lockedUntil: row.locked_until,
    tokenVersion: row.token_version,
    lastLoginAt: row.last_login_at,
    avatar: row.avatar,
    phone: row.phone,
    city: row.city,
    state: row.state
  };
}

// Aluno entra com CPF (só dígitos, a partir da busca pelo hash); gestão entra com e-mail.
async function findAuthUserByIdentifier({ email, cpfHash }) {
  if (email) {
    const { rows } = await query('select * from users where email = $1', [email]);
    return rows[0] ? mapAuthUser(rows[0]) : null;
  }
  if (cpfHash) {
    const { rows } = await query('select * from users where cpf_hash = $1', [cpfHash]);
    return rows[0] ? mapAuthUser(rows[0]) : null;
  }
  return null;
}

async function findAuthUserById(id) {
  const { rows } = await query('select * from users where id = $1', [id]);
  return rows[0] ? mapAuthUser(rows[0]) : null;
}

// CPF nunca é gravado completo na auditoria: só os dois últimos dígitos.
function auditIdentifier(identifier) {
  const raw = String(identifier || '');
  const digits = raw.replace(/\D/g, '');
  if (!raw.includes('@') && digits.length === 11) return `***.***.***-${digits.slice(-2)}`;
  return raw.slice(0, 120);
}

async function recordLoginEvent({ userId, identifier, ip, success, reason = '' }) {
  await query(
    `insert into login_events (user_id, identifier, ip, success, reason)
     values ($1, $2, $3, $4, $5)`,
    [userId || null, auditIdentifier(identifier), String(ip || '').slice(0, 64), success, reason]
  );
}

// Contagem de falhas; ao atingir o limite, bloqueia a conta por um tempo.
async function registerLoginFailure(userId, { maxAttempts, lockMinutes }) {
  const { rows } = await query(
    `update users
        set failed_login_count = case when failed_login_count + 1 >= $2 then 0 else failed_login_count + 1 end,
            locked_until = case when failed_login_count + 1 >= $2
                                then now() + make_interval(mins => $3)
                                else locked_until end
      where id = $1
      returning failed_login_count, locked_until`,
    [userId, maxAttempts, lockMinutes]
  );
  return rows[0] || null;
}

async function clearLoginFailures(userId) {
  await query(
    `update users set failed_login_count = 0, locked_until = null, last_login_at = now()
      where id = $1`,
    [userId]
  );
}

// Troca de senha: invalida tokens antigos (token_version) e marca se a troca era obrigatória.
async function setPasswordHash(userId, passwordHash, { mustChangePassword = false } = {}) {
  const { rows } = await query(
    `update users
        set password_hash = $2,
            must_change_password = $3,
            password_changed_at = now(),
            token_version = token_version + 1,
            failed_login_count = 0,
            locked_until = null,
            activated_at = coalesce(activated_at, now()),
            updated_at = now()
      where id = $1
      returning token_version`,
    [userId, passwordHash, mustChangePassword]
  );
  return rows[0] ? rows[0].token_version : null;
}

async function listLoginEvents({ userId = null, limit = 200 } = {}) {
  const params = [Math.min(Number(limit) || 200, 1000)];
  let where = '';
  if (userId) {
    params.push(userId);
    where = 'where e.user_id = $2';
  }
  const { rows } = await query(
    `select e.id, e.identifier, e.ip, e.success, e.reason, e.created_at, u.name, u.email
       from login_events e
       left join users u on u.id = e.user_id
       ${where}
      order by e.created_at desc
      limit $1`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    identifier: row.identifier,
    ip: row.ip,
    success: row.success,
    reason: row.reason,
    createdAt: row.created_at,
    name: row.name || '',
    email: row.email || ''
  }));
}

module.exports = {
  mapAuthUser,
  findAuthUserByIdentifier,
  findAuthUserById,
  recordLoginEvent,
  registerLoginFailure,
  clearLoginFailures,
  setPasswordHash,
  listLoginEvents
};

// Gestão: devolve a conta ao primeiro acesso (login e senha = CPF) e derruba sessões antigas.
async function resetToFirstAccess(userId) {
  const { rows } = await query(
    `update users
        set password_hash = null,
            must_change_password = true,
            password_changed_at = null,
            token_version = token_version + 1,
            failed_login_count = 0,
            locked_until = null,
            updated_at = now()
      where id = $1
      returning id`,
    [userId]
  );
  return Boolean(rows[0]);
}

async function unlockAccount(userId) {
  const { rows } = await query(
    `update users set failed_login_count = 0, locked_until = null, updated_at = now()
      where id = $1 returning id`,
    [userId]
  );
  return Boolean(rows[0]);
}

module.exports.resetToFirstAccess = resetToFirstAccess;
module.exports.unlockAccount = unlockAccount;
