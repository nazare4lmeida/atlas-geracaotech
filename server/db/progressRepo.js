const { query } = require('./pool');

// Progresso do aluno: aulas concluídas, resultados de quizzes, projeto final e certificados.
// Cada entrada tem o formato antigo da API: { completedLessons, quizResults: { [sectionId]: {score,total,passed} }, finalProjectCompleted }.

function emptyEntry() {
  return { completedLessons: [], quizResults: {}, finalProjectCompleted: false };
}

// Progresso de todos os alunos de um curso: Map(userId -> entry).
async function progressEntriesForCourse(courseId) {
  const entries = new Map();
  const ensure = (userId) => {
    if (!entries.has(userId)) entries.set(userId, emptyEntry());
    return entries.get(userId);
  };

  const [lessons, quizzes, projects] = await Promise.all([
    query(
      `select lc.user_id, lc.lesson_id from lesson_completions lc
         join lessons l on l.id = lc.lesson_id
         join sections s on s.id = l.section_id
        where s.course_id = $1
        order by lc.completed_at`,
      [courseId]
    ),
    query(
      `select qr.user_id, qr.section_id, qr.score, qr.total, qr.passed from quiz_results qr
         join sections s on s.id = qr.section_id
        where s.course_id = $1`,
      [courseId]
    ),
    query('select user_id, final_project_completed from course_progress where course_id = $1', [courseId])
  ]);

  lessons.rows.forEach((row) => ensure(row.user_id).completedLessons.push(row.lesson_id));
  quizzes.rows.forEach((row) => {
    ensure(row.user_id).quizResults[row.section_id] = {
      score: row.score,
      total: row.total,
      passed: row.passed
    };
  });
  projects.rows.forEach((row) => {
    ensure(row.user_id).finalProjectCompleted = row.final_project_completed;
  });

  return entries;
}

// Progresso de um aluno em todos os cursos: { [courseSlug]: entry }.
async function progressMapForUser(userId) {
  const [lessons, quizzes, projects] = await Promise.all([
    query(
      `select c.slug, lc.lesson_id from lesson_completions lc
         join lessons l on l.id = lc.lesson_id
         join sections s on s.id = l.section_id
         join courses c on c.id = s.course_id
        where lc.user_id = $1
        order by lc.completed_at`,
      [userId]
    ),
    query(
      `select c.slug, qr.section_id, qr.score, qr.total, qr.passed from quiz_results qr
         join sections s on s.id = qr.section_id
         join courses c on c.id = s.course_id
        where qr.user_id = $1`,
      [userId]
    ),
    query(
      `select c.slug, cp.final_project_completed from course_progress cp
         join courses c on c.id = cp.course_id
        where cp.user_id = $1`,
      [userId]
    )
  ]);

  const map = {};
  const ensure = (slug) => {
    if (!map[slug]) map[slug] = emptyEntry();
    return map[slug];
  };

  lessons.rows.forEach((row) => ensure(row.slug).completedLessons.push(row.lesson_id));
  quizzes.rows.forEach((row) => {
    ensure(row.slug).quizResults[row.section_id] = { score: row.score, total: row.total, passed: row.passed };
  });
  projects.rows.forEach((row) => {
    ensure(row.slug).finalProjectCompleted = row.final_project_completed;
  });

  return map;
}

// Progresso de um aluno em um curso específico.
async function progressEntryForUser(userId, courseId) {
  const entries = await progressEntriesForCourse(courseId);
  return entries.get(userId) || emptyEntry();
}

// Registra a conclusão de uma aula (ignora se já estiver concluída).
async function markLessonCompleted(userId, lessonId) {
  await query(
    `insert into lesson_completions (user_id, lesson_id) values ($1, $2)
     on conflict (user_id, lesson_id) do nothing`,
    [userId, lessonId]
  );
}

// Avaliação da unidade: uma por aluna e unidade (regravar substitui a anterior).
async function saveUnitRating(userId, sectionId, unidade, nota, comentario) {
  await query(
    `insert into avaliacoes_unidade (user_id, section_id, unidade, nota, comentario)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, section_id, unidade)
     do update set nota = excluded.nota, comentario = excluded.comentario, created_at = now()`,
    [userId, sectionId, unidade, nota, comentario]
  );
}

async function saveQuizResult(userId, sectionId, result) {
  await query(
    `insert into quiz_results (user_id, section_id, score, total, passed)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, section_id)
     do update set score = excluded.score, total = excluded.total, passed = excluded.passed, updated_at = now()`,
    [userId, sectionId, result.score, result.total, result.passed]
  );
}

async function markProjectCompleted(userId, courseId) {
  await query(
    `insert into course_progress (user_id, course_id, final_project_completed)
     values ($1, $2, true)
     on conflict (user_id, course_id)
     do update set final_project_completed = true, updated_at = now()`,
    [userId, courseId]
  );
}

async function upsertCertificate(userId, courseId, courseName) {
  const { rows } = await query(
    `insert into certificates (user_id, course_id, course_name, issued_at)
     values ($1, $2, $3, now())
     on conflict (user_id, course_id)
     do update set course_name = excluded.course_name, issued_at = now()
     returning course_id, course_name, issued_at`,
    [userId, courseId, courseName]
  );
  return rows[0];
}

async function findCertificate(userId, courseId) {
  const { rows } = await query(
    'select course_name, issued_at from certificates where user_id = $1 and course_id = $2',
    [userId, courseId]
  );
  return rows[0] ? { course_name: rows[0].course_name, issued_at: rows[0].issued_at } : null;
}

async function getQuizAnswers(userId, sectionId) {
  const { rows } = await query(
    'select answers from quiz_attempts where user_id = $1 and section_id = $2',
    [userId, sectionId]
  );
  return rows[0] ? rows[0].answers : {};
}

// Grava a correção de uma questão. Não troca uma resposta já dada na mesma tentativa.
async function saveQuizAnswer(userId, sectionId, questionId, feedback) {
  await query(
    `insert into quiz_attempts (user_id, section_id, answers) values ($1, $2, jsonb_build_object($3::text, $4::jsonb))
     on conflict (user_id, section_id) do update
       set answers = quiz_attempts.answers || jsonb_build_object($3::text, $4::jsonb), updated_at = now()
       where not (quiz_attempts.answers ? $3::text)`,
    [userId, sectionId, questionId, JSON.stringify(feedback)]
  );
}

async function resetQuizAnswers(userId, sectionId) {
  await query(
    `insert into quiz_attempts (user_id, section_id, answers) values ($1, $2, '{}'::jsonb)
     on conflict (user_id, section_id) do update set answers = '{}'::jsonb, updated_at = now()`,
    [userId, sectionId]
  );
}

async function listCertificatesForUser(userId) {
  const { rows } = await query(
    `select c.slug as course_slug, ce.course_name, ce.issued_at, ce.tipo, ce.auth_code
       from certificates ce
       join courses c on c.id = ce.course_id
      where ce.user_id = $1
      order by ce.issued_at`,
    [userId]
  );
  return rows.map((row) => ({
    courseSlug: row.course_slug,
    courseName: row.course_name,
    issuedAt: row.issued_at,
    tipo: row.tipo,
    authCode: row.auth_code
  }));
}

// Última aula aberta no modo leitura (null se o aluno ainda não abriu nenhuma).
async function getReadingPosition(userId, courseId) {
  const { rows } = await query(
    'select lesson_id from posicao_leitura where user_id = $1 and course_id = $2',
    [userId, courseId]
  );
  return rows[0] ? rows[0].lesson_id : null;
}

async function saveReadingPosition(userId, courseId, lessonId) {
  await query(
    `insert into posicao_leitura (user_id, course_id, lesson_id, updated_at)
     values ($1, $2, $3, now())
     on conflict (user_id, course_id)
     do update set lesson_id = excluded.lesson_id, updated_at = now()`,
    [userId, courseId, lessonId]
  );
}

module.exports = {
  getReadingPosition,
  saveReadingPosition,
  progressEntriesForCourse,
  findCertificate,
  getQuizAnswers,
  saveQuizAnswer,
  resetQuizAnswers,
  progressMapForUser,
  progressEntryForUser,
  markLessonCompleted,
  saveUnitRating,
  saveQuizResult,
  markProjectCompleted,
  upsertCertificate,
  listCertificatesForUser
};
