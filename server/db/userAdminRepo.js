const { query } = require('./pool');

// Consultas da gestão de usuários: listagem com filtros, exportação, importação e primeiro acesso.

function escapeLike(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

// Lista usuários com cursos e grupos. Filtros opcionais; quando há curso, cursos e grupos mostram só esse curso.
async function listUsersFiltered({ q, cpfHash, role, status, courseSlug, groupId, includeCpf = false, limit = 1000, offset = 0 }) {
  const params = [];
  const conditions = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (cpfHash) {
    conditions.push(`u.cpf_hash = ${add(cpfHash)}`);
  } else if (q) {
    const pattern = add(`%${escapeLike(q)}%`);
    conditions.push(`(u.name ilike ${pattern} or u.email ilike ${pattern})`);
  }
  if (role) conditions.push(`u.role = ${add(role)}`);
  if (status === 'active') conditions.push('u.active and u.password_hash is not null');
  if (status === 'pending') conditions.push('u.active and u.password_hash is null');
  if (status === 'inactive') conditions.push('not u.active');
  let courseFilter = '';
  if (courseSlug) {
    const courseParam = add(courseSlug);
    conditions.push(`exists (select 1 from enrollments e join courses c on c.id = e.course_id
                              where e.user_id = u.id and c.slug = ${courseParam})`);
    courseFilter = `and c.slug = ${courseParam}`;
  }
  if (groupId) {
    conditions.push(`exists (select 1 from group_members gm where gm.user_id = u.id and gm.group_id = ${add(groupId)})`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await query(
    `select u.id, u.name, u.email, u.role, u.active, (u.password_hash is not null) as activated,
            u.cpf_last2, u.created_at, count(*) over() as total ${includeCpf ? ', u.cpf_encrypted' : ''},
            coalesce((select json_agg(json_build_object('slug', c.slug, 'title', c.title, 'role', e.role, 'status', e.status)
                                      order by c.title)
                        from enrollments e join courses c on c.id = e.course_id
                       where e.user_id = u.id ${courseFilter}), '[]') as courses,
            coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name, 'course', c.title, 'courseSlug', c.slug)
                                      order by c.title, g.name)
                        from group_members gm
                        join course_groups g on g.id = gm.group_id
                        join courses c on c.id = g.course_id
                       where gm.user_id = u.id ${courseFilter}), '[]') as groups
       from users u
       ${where}
      order by u.name
      limit ${Math.min(Number(limit) || 1000, 5000)} offset ${Math.max(Number(offset) || 0, 0)}`,
    params
  );
  return rows;
}

async function listCoursesLookup() {
  const { rows } = await query('select id, slug, title from courses');
  return rows;
}

async function listGroupsOfCourse(courseId) {
  const { rows } = await query('select id, name from course_groups where course_id = $1', [courseId]);
  return rows;
}

async function createGroupForCourse(courseId, name) {
  const { rows } = await query(
    `insert into course_groups (course_id, name) values ($1, $2)
     on conflict (course_id, name) do update set name = excluded.name
     returning id`,
    [courseId, name]
  );
  return rows[0].id;
}

async function findUserByEmailLite(email) {
  const { rows } = await query('select id, email, cpf_hash, password_hash, active from users where email = $1', [email]);
  return rows[0] || null;
}

async function findUserByCpfHash(hash) {
  const { rows } = await query('select id, email from users where cpf_hash = $1', [hash]);
  return rows[0] || null;
}

async function insertImportedUser({ name, email, cpfEncrypted, cpfHash, cpfLast2 }) {
  const { rows } = await query(
    `insert into users (name, email, password_hash, role, active, cpf_encrypted, cpf_hash, cpf_last2)
     values ($1, $2, null, 'student', true, $3, $4, $5)
     returning id`,
    [name, email, cpfEncrypted, cpfHash, cpfLast2]
  );
  return rows[0].id;
}

// Matrícula sem sobrescrever uma existente. Retorna true se criou agora.
async function enrollIfMissing(courseId, userId, role) {
  const { rowCount } = await query(
    `insert into enrollments (course_id, user_id, role, status) values ($1, $2, $3, 'active')
     on conflict (course_id, user_id) do nothing`,
    [courseId, userId, role]
  );
  return rowCount === 1;
}

async function addGroupMemberIfMissing(groupId, courseId, userId) {
  await query(
    `insert into group_members (group_id, course_id, user_id) values ($1, $2, $3)
     on conflict (group_id, user_id) do nothing`,
    [groupId, courseId, userId]
  );
}

async function updateUserContact(userId, { email }) {
  await query('update users set email = $2, updated_at = now() where id = $1', [userId, email]);
}

async function setUserCpf(userId, { cpfEncrypted, cpfHash, cpfLast2 }) {
  await query(
    'update users set cpf_encrypted = $2, cpf_hash = $3, cpf_last2 = $4, updated_at = now() where id = $1',
    [userId, cpfEncrypted, cpfHash, cpfLast2]
  );
}

async function findUserEmailTaken(email, exceptUserId) {
  const { rows } = await query('select id from users where email = $1 and id <> $2', [email, exceptUserId]);
  return rows.length > 0;
}

async function setPasswordOnActivation(userId, passwordHash) {
  await query(
    'update users set password_hash = $2, activated_at = now(), updated_at = now() where id = $1',
    [userId, passwordHash]
  );
}

module.exports = {
  listUsersFiltered,
  listCoursesLookup,
  listGroupsOfCourse,
  createGroupForCourse,
  findUserByEmailLite,
  findUserByCpfHash,
  insertImportedUser,
  enrollIfMissing,
  addGroupMemberIfMissing,
  setPasswordOnActivation,
  updateUserContact,
  setUserCpf,
  findUserEmailTaken
};
