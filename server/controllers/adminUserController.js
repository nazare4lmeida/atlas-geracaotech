const bcrypt = require('bcryptjs');
const authRepo = require('../db/authRepo');
const accessRepo = require('../db/accessRepo');
const httpError = require('../utils/httpError');
const { sanitizeUser } = require('../services/users');

// Gestão de contas (somente administradores), equivalente a "Contas de usuário" no Moodle.

const ROLES = ['admin', 'teacher', 'student', 'atendente'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['active', 'pending', 'inactive'];
const { listUsersFiltered } = require('../db/userAdminRepo');
const { importRows } = require('../services/userImport');
const { digitsOf, isValidCpf, hashCpf, encryptCpf, decryptCpf, formatCpf, maskCpf } = require('../services/cpf');
const { passwordProblems } = require('../services/passwordPolicy');
const userAdminRepo = require('../db/userAdminRepo');

// Filtros da listagem e da exportação: nome, e-mail ou CPF completo; papel; situação; curso; grupo.
function readFilters(query) {
  const q = String(query.q || '').trim().slice(0, 120);
  const digits = digitsOf(q);
  const cpfHash = digits.length === 11 && isValidCpf(digits) ? hashCpf(digits) : null;
  return {
    q: cpfHash ? '' : q,
    cpfHash,
    role: ROLES.includes(query.role) ? query.role : null,
    status: STATUSES.includes(query.status) ? query.status : null,
    courseSlug: query.courseSlug ? String(query.courseSlug).toLowerCase().slice(0, 120) : null,
    groupId: UUID_PATTERN.test(String(query.groupId || '')) ? String(query.groupId) : null
  };
}

exports.listUsers = async (req, res) => {
  const pageSize = [10, 25, 50, 100].includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 25;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const rows = await listUsersFiltered({ ...readFilters(req.query), limit: pageSize, offset: (page - 1) * pageSize });
  const total = rows.length ? Number(rows[0].total) : 0;
  const users = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    activated: row.activated,
    cpfMasked: maskCpf(row.cpf_last2),
    courses: row.courses,
    groups: row.groups,
    createdAt: row.created_at
  }));
  return res.json({ users, total, page, pageSize, pages: Math.max(Math.ceil(total / pageSize), 1) });
};

// Uma linha por matrícula (e por grupo dentro do curso), no mesmo formato da importação.
exports.exportUsers = async (req, res) => {
  const rows = await listUsersFiltered({ ...readFilters(req.query), includeCpf: true, limit: 5000 });
  const out = [];

  for (const row of rows) {
    const cpf = row.cpf_encrypted ? formatCpf(decryptCpf(row.cpf_encrypted)) : '';
    const base = { nome: row.name, email: row.email, cpf };

    if (row.courses.length === 0) {
      out.push({ ...base, papel_no_curso: '', curso: '', grupo: '' });
      continue;
    }
    for (const course of row.courses) {
      const papel = course.role === 'teacher' ? 'docente' : 'aluno';
      const groups = row.groups.filter((group) => group.courseSlug === course.slug);
      if (groups.length === 0) {
        out.push({ ...base, papel_no_curso: papel, curso: course.title, grupo: '' });
      } else {
        groups.forEach((group) => out.push({ ...base, papel_no_curso: papel, curso: course.title, grupo: group.name }));
      }
    }
  }

  return res.json({ rows: out });
};

exports.importUsers = async (req, res) => {
  const report = await importRows(req.body.rows);
  return res.json({ report });
};

exports.createUser = async (req, res) => {
  const { name, email, password, careerGoal } = req.body;
  const role = req.body.role || 'student';

  if (!ROLES.includes(role)) {
    throw httpError(400, 'Papel de conta inválido.');
  }
  if (!name || !email) {
    throw httpError(400, 'Nome e e-mail são obrigatórios.');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (await accessRepo.findUserByEmail(normalizedEmail)) {
    throw httpError(409, 'Já existe uma conta com este e-mail.');
  }

  // Aluno: entra com CPF. Sem senha definida; no primeiro acesso o CPF é a senha provisória
  // e a troca por uma senha forte é obrigatória.
  if (role === 'student') {
    const digits = digitsOf(req.body.cpf);
    if (!isValidCpf(digits)) throw httpError(400, 'Informe um CPF válido para o aluno.');
    if (await userAdminRepo.findUserByCpfHash(hashCpf(digits))) {
      throw httpError(409, 'Já existe uma conta com este CPF.');
    }
    const id = await userAdminRepo.insertImportedUser({
      name: String(name).trim(),
      email: normalizedEmail,
      cpfEncrypted: encryptCpf(digits),
      cpfHash: hashCpf(digits),
      cpfLast2: digits.slice(-2)
    });
    const user = await authRepo.findAuthUserById(id);
    return res.status(201).json({ user: sanitizeUser(user) });
  }

  // Professor e admin: senha definida pela gestão, sujeita à mesma política do sistema.
  const problems = passwordProblems(password, { email: normalizedEmail });
  if (problems.length) throw httpError(400, problems.join(' '));

  const user = await accessRepo.createUser({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    careerGoal: careerGoal || ''
  });

  return res.status(201).json({ user: sanitizeUser(user) });
};

exports.updateUser = async (req, res) => {
  const user = await accessRepo.findUserById(req.params.id);
  if (!user) throw httpError(404, 'Usuário não encontrado.');

  const isSelf = String(user.id) === String(req.user.id);
  const nextRole = req.body.role !== undefined ? req.body.role : user.role;
  const nextActive = req.body.active !== undefined ? Boolean(req.body.active) : user.active;

  if (!ROLES.includes(nextRole)) {
    throw httpError(400, 'Papel de conta inválido.');
  }

  const losesAdmin = user.role === 'admin' && (nextRole !== 'admin' || !nextActive);
  if (losesAdmin) {
    if (isSelf) {
      throw httpError(400, 'Você não pode remover o próprio acesso de administrador.');
    }
    if ((await accessRepo.countActiveAdminsExcept(user.id)) === 0) {
      throw httpError(400, 'O sistema precisa de pelo menos um administrador ativo.');
    }
  }

  if (isSelf && !nextActive) {
    throw httpError(400, 'Você não pode desativar a própria conta.');
  }

  const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
  if (name !== undefined && !name) {
    throw httpError(400, 'Informe o nome do usuário.');
  }

  if (req.body.email !== undefined) {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'E-mail inválido.');
    if (email !== user.email && (await userAdminRepo.findUserEmailTaken(email, user.id))) {
      throw httpError(409, 'Já existe uma conta com este e-mail.');
    }
    await userAdminRepo.updateUserContact(user.id, { email });
  }

  if (req.body.cpf !== undefined && String(req.body.cpf).trim() !== '') {
    const digits = digitsOf(req.body.cpf);
    if (!isValidCpf(digits)) throw httpError(400, 'CPF inválido. Confira os 11 dígitos.');
    const hash = hashCpf(digits);
    const owner = await userAdminRepo.findUserByCpfHash(hash);
    if (owner && String(owner.id) !== String(user.id)) throw httpError(409, 'Este CPF já está cadastrado em outra conta.');
    await userAdminRepo.setUserCpf(user.id, { cpfEncrypted: encryptCpf(digits), cpfHash: hash, cpfLast2: digits.slice(-2) });
  }

  if (req.body.active !== undefined || req.body.role !== undefined || name !== undefined) {
    await accessRepo.updateUser(user.id, { name, role: nextRole, active: nextActive });
  }

  const refreshed = await accessRepo.findUserById(user.id);
  return res.json({ user: sanitizeUser(refreshed) });
};

exports.deleteUser = async (req, res) => {
  const user = await accessRepo.findUserById(req.params.id);
  if (!user) throw httpError(404, 'Usuário não encontrado.');

  if (String(user.id) === String(req.user.id)) {
    throw httpError(400, 'Você não pode excluir a própria conta.');
  }
  if (user.role === 'admin' && user.active && (await accessRepo.countActiveAdminsExcept(user.id)) === 0) {
    throw httpError(400, 'O sistema precisa de pelo menos um administrador ativo.');
  }

  // Matrículas, grupos, progresso, certificados e anotações saem em cascata pelo banco.
  await accessRepo.deleteUser(user.id);
  return res.json({ message: 'Usuário excluído.' });
};
