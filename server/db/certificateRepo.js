const { query } = require('./pool');

const UNIQUE_VIOLATION = '23505';

// Modelos de certificado e o vínculo modelo <-> curso.

function mapTemplate(row, { withBackground = false } = {}) {
  const base = {
    id: row.id,
    name: row.name,
    config: row.config || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (withBackground) {
    base.background = row.background;
    base.verso = row.verso || null;
  }
  return base;
}

async function listTemplates() {
  const { rows } = await query(
    `select t.id, t.name, t.config, t.created_at, t.updated_at,
            coalesce(json_agg(json_build_object('slug', c.slug, 'title', c.title)
              order by c.title) filter (where c.id is not null), '[]') as courses
       from certificate_templates t
       left join courses c on c.certificate_template_id = t.id
      group by t.id
      order by t.name`
  );
  return rows.map((row) => ({ ...mapTemplate(row), courses: row.courses }));
}

async function findTemplateById(id) {
  const { rows } = await query('select * from certificate_templates where id = $1', [id]);
  return rows[0] ? mapTemplate(rows[0], { withBackground: true }) : null;
}

async function findTemplateForCourse(courseId, tipo = 'conclusao') {
  const column = tipo === 'participacao' ? 'certificate_participacao_template_id' : 'certificate_template_id';
  const { rows } = await query(
    `select t.* from certificate_templates t
       join courses c on c.${column} = t.id
      where c.id = $1`,
    [courseId]
  );
  return rows[0] ? mapTemplate(rows[0], { withBackground: true }) : null;
}

async function createTemplate({ name, background, config, verso, createdBy }) {
  const { rows } = await query(
    `insert into certificate_templates (name, background, config, verso, created_by)
     values ($1, $2, $3, $4, $5) returning *`,
    [name, background, JSON.stringify(config), verso ? JSON.stringify(verso) : null, createdBy]
  );
  return mapTemplate(rows[0]);
}

async function updateTemplate(id, { name, background, config, verso }) {
  const { rows } = await query(
    `update certificate_templates
        set name = coalesce($2, name),
            background = coalesce($3, background),
            config = coalesce($4::jsonb, config),
            verso = case when $5::boolean then $6::jsonb else verso end,
            updated_at = now()
      where id = $1
      returning *`,
    [
      id,
      name ?? null,
      background ?? null,
      config === undefined ? null : JSON.stringify(config),
      verso !== undefined,
      verso === undefined ? null : JSON.stringify(verso)
    ]
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

async function deleteTemplate(id) {
  await query('delete from certificate_templates where id = $1', [id]);
}

// Atualiza só os campos enviados (null limpa o campo).
async function updateCourseCertificateSettings(courseId, fields) {
  const sets = [];
  const params = [courseId];
  if ('templateId' in fields) {
    params.push(fields.templateId);
    sets.push(`certificate_template_id = $${params.length}`);
  }
  if ('participacaoTemplateId' in fields) {
    params.push(fields.participacaoTemplateId);
    sets.push(`certificate_participacao_template_id = $${params.length}`);
  }
  if ('releaseAt' in fields) {
    params.push(fields.releaseAt);
    sets.push(`certificate_release_at = $${params.length}`);
  }
  if (sets.length === 0) return;
  await query(`update courses set ${sets.join(', ')} where id = $1`, params);
}

async function setCourseTemplate(courseId, templateId) {
  await updateCourseCertificateSettings(courseId, { templateId });
}

// Emite (ou atualiza) o certificado do aluno. Não rebaixa: conclusão nunca vira participação.
async function issueCertificate(userId, courseId, courseName, tipo) {
  const { rows } = await query(
    `insert into certificates (user_id, course_id, course_name, issued_at, tipo)
     values ($1, $2, $3, now(), $4)
     on conflict (user_id, course_id)
     do update set course_name = excluded.course_name, issued_at = now(), tipo = excluded.tipo
       where certificates.tipo <> 'conclusao' or excluded.tipo = 'conclusao'
     returning user_id`,
    [userId, courseId, courseName, tipo]
  );
  return rows.length > 0;
}

async function findIssuedCertificate(userId, courseId) {
  const { rows } = await query(
    'select tipo, issued_at, auth_code from certificates where user_id = $1 and course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

async function requestCertificate(userId, courseId) {
  await query(
    `insert into certificate_requests (user_id, course_id) values ($1, $2)
     on conflict (user_id, course_id) do nothing`,
    [userId, courseId]
  );
}

async function listRequestsForCourse(courseId) {
  const { rows } = await query(
    'select user_id, requested_at from certificate_requests where course_id = $1',
    [courseId]
  );
  return rows;
}

async function listIssuedForCourse(courseId) {
  const { rows } = await query(
    'select user_id, tipo, issued_at, auth_code from certificates where course_id = $1',
    [courseId]
  );
  return rows;
}

async function listRequestsForUser(userId) {
  const { rows } = await query(
    `select c.slug, r.requested_at from certificate_requests r
       join courses c on c.id = r.course_id where r.user_id = $1`,
    [userId]
  );
  return rows;
}


// Código de autenticação: GT-<CURSO>-<ANO>-<SEQUÊNCIA>. Gerado uma vez por certificado e mantido nas regenerações.
async function ensureAuthCode(userId, courseId, courseSlug) {
  const current = await query('select auth_code from certificates where user_id = $1 and course_id = $2', [userId, courseId]);
  if (current.rows[0]?.auth_code) return current.rows[0].auth_code;

  const year = new Date().getFullYear();
  const base = `GT-${courseSlug.replace(/-/g, '').slice(0, 6).toUpperCase()}-${year}-`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { rows } = await query('select auth_code from certificates where auth_code like $1', [`${base}%`]);
    const max = rows.reduce((best, row) => {
      const n = Number(row.auth_code.slice(base.length));
      return Number.isInteger(n) && n > best ? n : best;
    }, 0);
    const code = `${base}${String(max + 1 + attempt).padStart(4, '0')}`;
    try {
      const updated = await query(
        `update certificates set auth_code = $3
          where user_id = $1 and course_id = $2 and auth_code is null
          returning auth_code`,
        [userId, courseId, code]
      );
      if (updated.rows[0]) return updated.rows[0].auth_code;
      const again = await query('select auth_code from certificates where user_id = $1 and course_id = $2', [userId, courseId]);
      return again.rows[0]?.auth_code || null;
    } catch (error) {
      if (error.code !== UNIQUE_VIOLATION) throw error;
    }
  }
  throw new Error('Não foi possível gerar um código de autenticação único.');
}

// Dados públicos para verificação: nome, curso, carga horária e data de emissão.
async function findCertificateByAuthCode(authCode) {
  const { rows } = await query(
    `select ce.auth_code, ce.course_name, ce.issued_at, u.name as student_name, c.estimated_hours
       from certificates ce
       join users u on u.id = ce.user_id
       join courses c on c.id = ce.course_id
      where ce.auth_code = $1`,
    [authCode]
  );
  return rows[0] || null;
}

module.exports = {
  updateCourseCertificateSettings,
  issueCertificate,
  findIssuedCertificate,
  requestCertificate,
  listRequestsForCourse,
  listIssuedForCourse,
  listRequestsForUser,
  ensureAuthCode,
  findCertificateByAuthCode,
  listTemplates,
  findTemplateById,
  findTemplateForCourse,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setCourseTemplate
};
