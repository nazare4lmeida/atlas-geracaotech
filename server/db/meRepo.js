const crypto = require('crypto');
const { query } = require('./pool');

// Dados do próprio aluno (perfil, lembretes e declarações) e a gestão das declarações.

function mapReminder(row) {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
    done: row.done,
    createdAt: row.created_at
  };
}

function mapDeclaration(row) {
  return {
    id: row.id,
    userId: row.user_id,
    studentName: row.student_name || '',
    studentEmail: row.student_email || '',
    courseId: row.course_id,
    courseTitle: row.course_title || '',
    purpose: row.purpose,
    status: row.status,
    adminNote: row.admin_note,
    verificationCode: row.verification_code,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at
  };
}

async function updateProfile(userId, fields) {
  const { rows } = await query(
    `update users
        set name = coalesce($2, name),
            phone = coalesce($3, phone),
            city = coalesce($4, city),
            state = coalesce($5, state),
            career_goal = coalesce($6, career_goal),
            avatar = coalesce($7, avatar),
            updated_at = now()
      where id = $1
      returning *`,
    [userId, fields.name ?? null, fields.phone ?? null, fields.city ?? null, fields.state ?? null, fields.careerGoal ?? null, fields.avatar ?? null]
  );
  return rows[0] || null;
}

async function listReminders(userId) {
  const { rows } = await query(
    `select * from reminders where user_id = $1
      order by done, due_date nulls last, created_at desc`,
    [userId]
  );
  return rows.map(mapReminder);
}

async function createReminder(userId, { title, dueDate }) {
  const { rows } = await query(
    'insert into reminders (user_id, title, due_date) values ($1, $2, $3) returning *',
    [userId, title, dueDate || null]
  );
  return mapReminder(rows[0]);
}

async function updateReminder(userId, reminderId, fields) {
  const { rows } = await query(
    `update reminders
        set title = coalesce($3, title),
            due_date = case when $4::boolean then $5::date else due_date end,
            done = coalesce($6, done),
            updated_at = now()
      where id = $1 and user_id = $2
      returning *`,
    [reminderId, userId, fields.title ?? null, Object.prototype.hasOwnProperty.call(fields, 'dueDate'), fields.dueDate ?? null, fields.done ?? null]
  );
  return rows[0] ? mapReminder(rows[0]) : null;
}

async function deleteReminder(userId, reminderId) {
  const { rowCount } = await query('delete from reminders where id = $1 and user_id = $2', [reminderId, userId]);
  return rowCount > 0;
}

async function listDeclarationsForUser(userId) {
  const { rows } = await query(
    `select d.*, c.title as course_title
       from declaration_requests d
       left join courses c on c.id = d.course_id
      where d.user_id = $1
      order by d.requested_at desc`,
    [userId]
  );
  return rows.map(mapDeclaration);
}

async function createDeclaration(userId, { purpose, courseId }) {
  const { rows } = await query(
    `insert into declaration_requests (user_id, purpose, course_id)
     values ($1, $2, $3) returning *`,
    [userId, purpose, courseId || null]
  );
  return mapDeclaration(rows[0]);
}

// Lista para a gestão, com filtros de situação e busca por nome, e-mail ou texto do pedido.
async function listDeclarationsForAdmin({ status, search, limit = 500 }) {
  const params = [Math.min(Number(limit) || 500, 2000)];
  const conditions = [];
  if (status) {
    params.push(status);
    conditions.push(`d.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ilike $${params.length} or u.email ilike $${params.length} or d.purpose ilike $${params.length})`);
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await query(
    `select d.*, u.name as student_name, u.email as student_email, c.title as course_title
       from declaration_requests d
       join users u on u.id = d.user_id
       left join courses c on c.id = d.course_id
       ${where}
      order by d.requested_at desc
      limit $1`,
    params
  );
  return rows.map(mapDeclaration);
}

// Aprovar gera um código de verificação único (usado na declaração impressa e na página pública).
async function decideDeclaration(declarationId, { status, adminNote, decidedBy }) {
  const code = status === 'aprovada' ? crypto.randomBytes(6).toString('hex').toUpperCase() : null;
  const { rows } = await query(
    `update declaration_requests
        set status = $2,
            admin_note = $3,
            decided_at = now(),
            decided_by = $4,
            verification_code = coalesce($5, verification_code)
      where id = $1
      returning id`,
    [declarationId, status, adminNote || '', decidedBy, code]
  );
  return rows[0] ? declarationById(declarationId) : null;
}

async function declarationById(id) {
  const { rows } = await query(
    `select d.*, u.name as student_name, u.email as student_email, c.title as course_title
       from declaration_requests d
       join users u on u.id = d.user_id
       left join courses c on c.id = d.course_id
      where d.id = $1`,
    [id]
  );
  return rows[0] ? mapDeclaration(rows[0]) : null;
}

async function findApprovedDeclarationByCode(code) {
  const { rows } = await query(
    `select d.*, u.name as student_name, u.email as student_email, c.title as course_title
       from declaration_requests d
       join users u on u.id = d.user_id
       left join courses c on c.id = d.course_id
      where d.verification_code = $1 and d.status = 'aprovada'`,
    [code]
  );
  return rows[0] ? mapDeclaration(rows[0]) : null;
}

// Próximas aulas do usuário (aluno matriculado ou professor da turma), com o link ao vivo da turma.
async function proximasAulas(userId, hoje, limite = 5) {
  const { rows } = await query(
    `select s.id, s.session_date, s.horario, s.title, t.nome as turma, c.title as curso, t.link_ao_vivo
       from attendance_sessions s
       join turmas t on t.id = s.turma_id
       join courses c on c.id = t.curso_id
      where s.turma_id is not null
        and s.session_date >= $2::date
        and s.status_aula = 'ativa'
        and (
          exists (select 1 from turma_alunos ta join matriculas m on m.id = ta.matricula_id
                   where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo' and m.user_id = $1)
          or exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $1)
        )
      order by s.session_date, s.horario, t.nome
      limit $3`,
    [userId, hoje, limite]
  );
  return rows.map((row) => ({
    sessionId: row.id,
    date: row.session_date instanceof Date ? row.session_date.toISOString().slice(0, 10) : String(row.session_date).slice(0, 10),
    horario: row.horario || '',
    titulo: row.title || '',
    turma: row.turma,
    curso: row.curso,
    linkAoVivo: row.link_ao_vivo || ''
  }));
}

module.exports = {
  proximasAulas,
  updateProfile,
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  listDeclarationsForUser,
  createDeclaration,
  listDeclarationsForAdmin,
  decideDeclaration,
  declarationById,
  findApprovedDeclarationByCode
};
