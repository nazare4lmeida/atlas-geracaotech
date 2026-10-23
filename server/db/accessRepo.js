const { query } = require('./pool');

// Matrículas (participantes com papel no curso), grupos e contas de usuário.

function mapEnrollment(row) {
  return {
    courseId: row.course_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    enrolledAt: row.enrolled_at
  };
}

// ---------- Matrículas ----------

async function findEnrollment(courseId, userId) {
  const { rows } = await query(
    'select * from enrollments where course_id = $1 and user_id = $2',
    [courseId, userId]
  );
  return rows[0] ? mapEnrollment(rows[0]) : null;
}

// Aluna com matrícula ativa no curso (ou em turma ativa dele, sincronizada do site) pode acessar o curso,
// mesmo quando a trilha não tem autoinscrição. Usado para criar a inscrição na primeira visita.
async function hasActiveMatriculaInCourse(courseId, userId) {
  const { rows } = await query(
    `select 1 from matriculas m
      where m.user_id = $2
        and m.situacao in ('ativo', 'concluido')
        and (
          m.curso_id = $1
          or exists (
            select 1 from turma_alunos ta
              join turmas t on t.id = ta.turma_id
             where ta.matricula_id = m.id and ta.situacao = 'ativo' and t.curso_id = $1
          )
        )
      limit 1`,
    [courseId, userId]
  );
  return rows.length > 0;
}

async function listEnrollmentsForUser(userId) {
  const { rows } = await query('select * from enrollments where user_id = $1', [userId]);
  return rows.map(mapEnrollment);
}

// Cria a matrícula. Se já existir (requisições simultâneas), devolve a existente.
async function createEnrollment(courseId, userId, role = 'student') {
  const { rows } = await query(
    `insert into enrollments (course_id, user_id, role, status)
     values ($1, $2, $3, 'active')
     on conflict (course_id, user_id) do nothing
     returning *`,
    [courseId, userId, role]
  );
  return rows[0] ? mapEnrollment(rows[0]) : findEnrollment(courseId, userId);
}

async function updateEnrollment(courseId, userId, fields) {
  const { rows } = await query(
    `update enrollments
        set role = coalesce($3, role), status = coalesce($4, status)
      where course_id = $1 and user_id = $2
      returning *`,
    [courseId, userId, fields.role ?? null, fields.status ?? null]
  );
  return rows[0] ? mapEnrollment(rows[0]) : null;
}

// Remover a matrícula também remove o aluno dos grupos do curso (chave composta no banco).
async function deleteEnrollment(courseId, userId) {
  await query('delete from enrollments where course_id = $1 and user_id = $2', [courseId, userId]);
}

async function listParticipants(courseId) {
  const { rows } = await query(
    `select e.*, u.name, u.email, u.role as account_role, u.active
       from enrollments e
       join users u on u.id = e.user_id
      where e.course_id = $1
      order by e.enrolled_at, u.name`,
    [courseId]
  );
  return rows.map((row) => ({
    ...mapEnrollment(row),
    name: row.name,
    email: row.email,
    accountRole: row.account_role,
    active: row.active
  }));
}

// ---------- Grupos ----------

async function listGroupsWithMembers(courseId) {
  const { rows: groups } = await query(
    'select * from course_groups where course_id = $1 order by name',
    [courseId]
  );

  const { rows: members } = await query(
    `select gm.group_id, u.id, u.name, u.email
       from group_members gm
       join users u on u.id = gm.user_id
      where gm.course_id = $1
      order by u.name`,
    [courseId]
  );

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    members: members
      .filter((member) => member.group_id === group.id)
      .map((member) => ({ id: member.id, name: member.name, email: member.email }))
  }));
}

async function listGroupsForUser(courseId, userId) {
  const { rows } = await query(
    `select g.id, g.name, g.description from course_groups g
       join group_members gm on gm.group_id = g.id
      where g.course_id = $1 and gm.user_id = $2
      order by g.name`,
    [courseId, userId]
  );
  return rows;
}

// Mapa userId -> grupos, usado no relatório de participantes.
async function listGroupMembershipsByUser(courseId) {
  const { rows } = await query(
    `select gm.user_id, g.id, g.name from group_members gm
       join course_groups g on g.id = gm.group_id
      where gm.course_id = $1`,
    [courseId]
  );
  const byUser = new Map();
  rows.forEach((row) => {
    const list = byUser.get(row.user_id) || [];
    list.push({ id: row.id, name: row.name });
    byUser.set(row.user_id, list);
  });
  return byUser;
}

async function findGroup(courseId, groupId) {
  const { rows } = await query('select * from course_groups where id = $1 and course_id = $2', [groupId, courseId]);
  return rows[0] || null;
}

async function groupNameExists(courseId, name, ignoreGroupId = null) {
  const { rowCount } = await query(
    `select 1 from course_groups
      where course_id = $1 and lower(name) = lower($2) and ($3::uuid is null or id <> $3::uuid)`,
    [courseId, name, ignoreGroupId]
  );
  return rowCount > 0;
}

async function createGroup(courseId, fields) {
  const { rows } = await query(
    `insert into course_groups (course_id, name, description) values ($1, $2, $3) returning *`,
    [courseId, fields.name, fields.description]
  );
  return rows[0];
}

async function updateGroup(groupId, fields) {
  await query(
    `update course_groups
        set name = coalesce($2, name), description = coalesce($3, description), updated_at = now()
      where id = $1`,
    [groupId, fields.name ?? null, fields.description ?? null]
  );
}

async function deleteGroup(groupId) {
  await query('delete from course_groups where id = $1', [groupId]);
}

// IDs de alunos matriculados (papel student) entre os informados.
async function filterEnrolledStudents(courseId, userIds) {
  const { rows } = await query(
    `select user_id from enrollments
      where course_id = $1 and role = 'student' and user_id = any($2::uuid[])`,
    [courseId, userIds]
  );
  return rows.map((row) => row.user_id);
}

async function addGroupMembers(courseId, groupId, userIds) {
  await query(
    `insert into group_members (group_id, course_id, user_id)
     select $1, $2, unnest($3::uuid[])
     on conflict (group_id, user_id) do nothing`,
    [groupId, courseId, userIds]
  );
}

async function removeGroupMember(groupId, userId) {
  await query('delete from group_members where group_id = $1 and user_id = $2', [groupId, userId]);
}

// ---------- Contas de usuário ----------

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: row.active,
    careerGoal: row.career_goal,
    createdAt: row.created_at
  };
}

async function findUserById(id) {
  const { rows } = await query('select * from users where id = $1', [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

async function findUserByEmail(email) {
  const { rows } = await query('select * from users where email = $1', [email]);
  return rows[0] ? mapUser(rows[0]) : null;
}

async function createUser({ name, email, passwordHash, role = 'student', careerGoal = '' }) {
  const { rows } = await query(
    `insert into users (name, email, password_hash, role, career_goal)
     values ($1, $2, $3, $4, $5)
     returning *`,
    [name, email, passwordHash, role, careerGoal]
  );
  return mapUser(rows[0]);
}

async function listUsers({ role, search }) {
  const params = [];
  const conditions = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    conditions.push(`(name ilike $${params.length} or email ilike $${params.length})`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await query(
    `select * from users ${where} order by created_at desc limit 300`,
    params
  );
  return rows.map(mapUser);
}

async function updateUser(userId, fields) {
  const { rows } = await query(
    `update users
        set name = coalesce($2, name),
            role = coalesce($3, role),
            active = coalesce($4, active),
            updated_at = now()
      where id = $1
      returning *`,
    [userId, fields.name ?? null, fields.role ?? null, fields.active ?? null]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

async function countActiveAdminsExcept(userId) {
  const { rows } = await query(
    `select count(*)::int as total from users
      where role = 'admin' and active and id <> $1`,
    [userId]
  );
  return rows[0].total;
}

async function deleteUser(userId) {
  await query('delete from users where id = $1', [userId]);
}

module.exports = {
  findEnrollment,
  listEnrollmentsForUser,
  hasActiveMatriculaInCourse,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  listParticipants,
  listGroupsWithMembers,
  listGroupsForUser,
  listGroupMembershipsByUser,
  findGroup,
  groupNameExists,
  createGroup,
  updateGroup,
  deleteGroup,
  filterEnrolledStudents,
  addGroupMembers,
  removeGroupMember,
  findUserById,
  findUserByEmail,
  createUser,
  listUsers,
  updateUser,
  countActiveAdminsExcept,
  deleteUser
};
