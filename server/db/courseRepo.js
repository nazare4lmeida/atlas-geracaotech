const { query, withTransaction } = require('./pool');
const { newId } = require('../utils/ids');
const { planForCourse, applyBlockPlan } = require('../services/blockPlans');

// Leitura e escrita de cursos, seções, recursos e questões.
// Os objetos retornados têm o mesmo formato usado pela API (camelCase, "modules" com "lessons" e "quiz").

const COURSE_COLUMNS = {
  title: 'title',
  key: 'key',
  summary: 'summary',
  banner: 'banner',
  level: 'level',
  estimatedHours: 'estimated_hours',
  accent: 'accent',
  visible: 'visible',
  selfEnrolment: 'self_enrolment',
  layout: 'layout',
  theme: 'theme',
  progressBar: 'barra_progresso'
};

const SECTION_COLUMNS = { title: 'title', description: 'description', visible: 'visible' };
const LESSON_COLUMNS = {
  title: 'title',
  unit: 'unit',
  type: 'type',
  url: 'url',
  content: 'content',
  visible: 'visible',
  countsProgress: 'conta_progresso'
};
const QUESTION_COLUMNS = {
  question: 'question',
  options: 'options',
  answer: 'answer',
  explanation: 'explanation',
  optionFeedback: 'option_feedback'
};

function mapCourseRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    key: row.key,
    title: row.title,
    summary: row.summary,
    banner: row.banner,
    level: row.level,
    estimatedHours: row.estimated_hours,
    accent: row.accent,
    layout: row.layout,
    theme: row.theme || {},
    progressBar: row.barra_progresso || {},
    visible: row.visible,
    selfEnrolment: row.self_enrolment,
    finalProject: {
      title: row.final_project_title,
      description: row.final_project_description
    },
    createdBy: row.created_by,
    certificateTemplateId: row.certificate_template_id || null,
    certificateParticipacaoTemplateId: row.certificate_participacao_template_id || null,
    certificateReleaseAt: row.certificate_release_at || null,
    createdAt: row.created_at,
    blocks: [],
    modules: []
  };
}

// Busca cursos completos. `whereSql` é montado pelo chamador com placeholders ($1, $2...).
async function fetchCourses(whereSql = '', params = []) {
  const { rows: courseRows } = await query(
    `select * from courses ${whereSql} order by created_at, slug`,
    params
  );
  if (courseRows.length === 0) return [];

  const courses = courseRows.map(mapCourseRow);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const ids = courses.map((course) => course.id);

  const [sectionsResult, lessonsResult, questionsResult, blocksResult] = await Promise.all([
    query('select * from sections where course_id = any($1::uuid[]) order by course_id, position', [ids]),
    query(
      `select l.*, s.course_id from lessons l
         join sections s on s.id = l.section_id
        where s.course_id = any($1::uuid[])
        order by l.section_id, l.position`,
      [ids]
    ),
    query(
      `select q.*, s.course_id from quiz_questions q
         join sections s on s.id = q.section_id
        where s.course_id = any($1::uuid[])
        order by q.section_id, q.position`,
      [ids]
    ),
    query(
      `select *, to_char(starts_at, 'YYYY-MM-DD') as starts_on, to_char(ends_at, 'YYYY-MM-DD') as ends_on
         from course_blocks where course_id = any($1::uuid[]) order by course_id, position`,
      [ids]
    )
  ]);

  blocksResult.rows.forEach((row) => {
    courseById.get(row.course_id).blocks.push({
      id: row.id,
      title: row.title,
      description: row.description,
      position: row.position,
      unlockMode: row.unlock_mode,
      workloadHours: row.workload_hours,
      level: row.level || '',
      accent: row.accent || '#6366f1',
      startsOn: row.starts_on || '',
      endsOn: row.ends_on || '',
      audience: row.audience || 'todas'
    });
  });

  const moduleById = new Map();
  sectionsResult.rows.forEach((row) => {
    const module = {
      id: row.id,
      title: row.title,
      description: row.description,
      visible: row.visible,
      kind: row.kind || 'modulo',
      blockId: row.block_id || null,
      lessons: [],
      quiz: []
    };
    moduleById.set(row.id, module);
    courseById.get(row.course_id).modules.push(module);
  });

  lessonsResult.rows.forEach((row) => {
    moduleById.get(row.section_id).lessons.push({
      id: row.id,
      title: row.title,
      type: row.type,
      url: row.url,
      unit: row.unit || '',
      content: row.content,
      visible: row.visible,
      countsProgress: row.conta_progresso !== false
    });
  });

  questionsResult.rows.forEach((row) => {
    moduleById.get(row.section_id).quiz.push({
      id: row.id,
      question: row.question,
      options: row.options,
      answer: row.answer,
      explanation: row.explanation || '',
      optionFeedback: row.option_feedback || []
    });
  });

  return courses;
}

async function findCourseBySlug(slug) {
  const [course] = await fetchCourses('where slug = $1', [slug]);
  return course || null;
}

async function findCourseById(id) {
  const [course] = await fetchCourses('where id = $1', [id]);
  return course || null;
}

async function slugExists(slug) {
  const { rowCount } = await query('select 1 from courses where slug = $1', [slug]);
  return rowCount > 0;
}

// Escrita genérica de colunas. As colunas vêm de um mapeamento fixo no código, nunca do usuário.
async function updateRow(client, table, id, columnMap, fields) {
  const sets = [];
  const params = [id];

  Object.entries(columnMap).forEach(([field, column]) => {
    if (fields[field] === undefined) return;
    const isJson = column === 'options' || column === 'option_feedback' || column === 'barra_progresso';
    params.push(isJson ? JSON.stringify(fields[field]) : fields[field]);
    const cast = isJson ? '::jsonb' : '';
    sets.push(`${column} = $${params.length}${cast}`);
  });

  if (sets.length === 0) return;
  await client.query(`update ${table} set ${sets.join(', ')} where id = $1`, params);
}

// Reordena um item dentro do seu grupo (curso, seção...) trocando as posições com o vizinho.
// Retorna false se o item não existir no grupo.
async function moveRow(table, scopeColumn, scopeId, itemId, direction) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `select id, position from ${table} where ${scopeColumn} = $1 order by position`,
      [scopeId]
    );

    const index = rows.findIndex((row) => row.id === itemId);
    if (index === -1) return false;

    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return true;

    const current = rows[index];
    const neighbour = rows[target];
    // As restrições de posição são DEFERRABLE, então a troca é válida dentro da transação.
    await client.query(`update ${table} set position = $2 where id = $1`, [current.id, neighbour.position]);
    await client.query(`update ${table} set position = $2 where id = $1`, [neighbour.id, current.position]);
    return true;
  });
}

async function nextPosition(client, table, scopeColumn, scopeId) {
  const { rows } = await client.query(
    `select coalesce(max(position) + 1, 0) as next from ${table} where ${scopeColumn} = $1`,
    [scopeId]
  );
  return rows[0].next;
}

// ---------- Cursos ----------

// Insere um curso completo (usado pela criação manual, pela importação do catálogo e pelo seed).
async function insertCourseTree(client, doc, createdBy = null) {
  const { rows: [course] } = await client.query(
    `insert into courses (slug, key, title, summary, banner, level, estimated_hours, accent,
                          visible, self_enrolment, final_project_title, final_project_description, created_by,
                          layout, theme)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
     returning id`,
    [
      doc.slug,
      doc.key || '',
      doc.title,
      doc.summary || '',
      doc.banner || '',
      doc.level || 'Iniciante',
      doc.estimatedHours || 0,
      doc.accent || '#6366f1',
      doc.visible !== false,
      doc.selfEnrolment !== false,
      doc.finalProject?.title || '',
      doc.finalProject?.description || '',
      createdBy,
      doc.layout || 'caderno',
      JSON.stringify(doc.theme || {})
    ]
  );

  await insertModules(client, course.id, doc.modules || []);

  // Backup com blocos: usa os blocos do arquivo (cor, modo e datas). Caso contrário, segue o plano ou o padrão.
  if (doc.blocks && doc.blocks.length) {
    await insertBackupBlocks(client, course.id, doc.blocks, doc.modules || []);
    await createDefaultBlocks(client, course.id);
  } else {
    await createDefaultBlocks(client, course.id);
    // Formações com plano próprio (ex.: Fullstack) são organizadas pelo plano logo na importação.
    const plan = planForCourse(doc);
    if (plan) {
      await applyBlockPlan(client, course.id, plan);
    }
  }

  return course.id;
}

// Histórico de alterações do curso.
async function recordHistory(courseId, userId, acao, detalhe) {
  await query(
    'insert into course_history (course_id, user_id, acao, detalhe) values ($1, $2, $3, $4)',
    [courseId, userId, acao, detalhe || '']
  );
}

async function listHistory(courseId, limit = 100) {
  const { rows } = await query(
    `select h.created_at, h.acao, h.detalhe, u.name as autor
       from course_history h left join users u on u.id = h.user_id
      where h.course_id = $1
      order by h.created_at desc
      limit $2`,
    [courseId, limit]
  );
  return rows;
}

// Alunos matriculados (ativos) no curso.
async function studentsOfCourse(courseId) {
  const { rows } = await query(
    `select u.id, u.name from enrollments e join users u on u.id = e.user_id
      where e.course_id = $1 and e.role = 'student' and e.status = 'active'
      order by u.name`,
    [courseId]
  );
  return rows;
}

// Atualiza a apresentação e a liberação de um bloco. Os demais campos do bloco não mudam aqui.
async function updateBlockSettings(courseId, blockId, { accent, unlockMode, startsOn, endsOn, audience }) {
  await query(
    `update course_blocks
        set accent = $3, unlock_mode = $4, starts_at = $5::date, ends_at = $6::date, audience = $7, updated_at = now()
      where id = $1 and course_id = $2`,
    [blockId, courseId, accent, unlockMode, startsOn || null, endsOn || null, audience]
  );
}

// Cria os blocos de um backup e liga cada módulo ao seu bloco (pelo índice no arquivo).
// Módulos sem bloco no arquivo continuam sem bloco e recebem o bloco padrão depois.
async function insertBackupBlocks(client, courseId, blocks, modules) {
  const ids = [];
  for (const [index, block] of blocks.entries()) {
    const { rows } = await client.query(
      `insert into course_blocks
         (course_id, position, title, description, workload_hours, level, accent, unlock_mode, starts_at, ends_at, audience)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11)
       returning id`,
      [
        courseId, index, block.title, block.description || '', block.workloadHours || 0, block.level || '',
        block.accent || '#6366f1', block.unlockMode || 'sequential', block.startsOn || null, block.endsOn || null,
        block.audience || 'todas'
      ]
    );
    ids.push(rows[0].id);
  }
  for (const module of modules) {
    if (module.blockIndex === null || module.blockIndex === undefined) continue;
    await client.query('update sections set block_id = $2 where id = $1', [module.id, ids[module.blockIndex]]);
  }
}

// Cada módulo sem bloco vira um bloco próprio, na mesma ordem (padrão para todo curso sem plano).
async function createDefaultBlocks(client, courseId) {
  await client.query(
    `with pending as (
       select s.position, s.title from sections s
        where s.course_id = $1 and s.block_id is null and s.kind = 'modulo'
     ),
     created as (
       insert into course_blocks (course_id, position, title, unlock_mode)
       select $1, p.position, p.title, 'sequential' from pending p
       returning id, position
     )
     update sections s set block_id = c.id
       from created c
      where s.course_id = $1 and s.position = c.position and s.block_id is null`,
    [courseId]
  );
}

// Insere seções, recursos e questões de um curso já existente.
// Os IDs devem ser únicos no banco (as seções, aulas e questões usam chave primária global).
async function insertModules(client, courseId, modules) {
  for (const [sectionIndex, module] of modules.entries()) {
    await client.query(
      `insert into sections (id, course_id, position, title, description, visible)
       values ($1, $2, $3, $4, $5, $6)`,
      [module.id, courseId, sectionIndex, module.title, module.description || '', module.visible !== false]
    );

    for (const [lessonIndex, lesson] of (module.lessons || []).entries()) {
      await client.query(
        `insert into lessons (id, section_id, position, title, unit, type, url, content, visible)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          lesson.id,
          module.id,
          lessonIndex,
          lesson.title,
          lesson.unit || '',
          lesson.type || 'video',
          lesson.url || '',
          lesson.content || '',
          lesson.visible !== false
        ]
      );
    }

    for (const [questionIndex, question] of (module.quiz || []).entries()) {
      await client.query(
        `insert into quiz_questions (id, section_id, position, question, options, answer, explanation, option_feedback)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb)`,
        [
          question.id,
          module.id,
          questionIndex,
          question.question,
          JSON.stringify(question.options),
          question.answer,
          question.explanation || '',
          JSON.stringify(question.optionFeedback || [])
        ]
      );
    }
  }
}

// Substitui todo o conteúdo (seções, recursos, questões) de um curso. Progresso dos alunos nesse conteúdo é removido em cascata.
async function replaceModules(client, courseId, modules, blocks = []) {
  await client.query('delete from sections where course_id = $1', [courseId]);
  await client.query('delete from course_blocks where course_id = $1', [courseId]);
  await insertModules(client, courseId, modules);
  if (blocks.length) {
    await insertBackupBlocks(client, courseId, blocks, modules);
  }
  await createDefaultBlocks(client, courseId);
  await client.query('update courses set updated_at = now() where id = $1', [courseId]);
}

async function createCourse(doc, createdBy) {
  return withTransaction(async (client) => {
    const id = await insertCourseTree(client, doc, createdBy);
    return id;
  });
}

async function updateCourse(courseId, fields) {
  await withTransaction(async (client) => {
    await updateRow(client, 'courses', courseId, COURSE_COLUMNS, fields);
    if (fields.finalProject) {
      await client.query(
        `update courses set final_project_title = $2, final_project_description = $3 where id = $1`,
        [courseId, fields.finalProject.title || '', fields.finalProject.description || '']
      );
    }
    await client.query('update courses set updated_at = now() where id = $1', [courseId]);
  });
}

// Exclusão em cascata: seções, recursos, questões, matrículas, grupos e progresso são removidos pelo banco.
async function deleteCourse(courseId) {
  await query('delete from courses where id = $1', [courseId]);
}

// ---------- Seções ----------

async function createSection(courseId, fields) {
  return withTransaction(async (client) => {
    const id = newId('mod');
    const position = await nextPosition(client, 'sections', 'course_id', courseId);
    await client.query(
      `insert into sections (id, course_id, position, title, description, visible)
       values ($1, $2, $3, $4, $5, $6)`,
      [id, courseId, position, fields.title, fields.description || '', fields.visible !== false]
    );
    // Módulo novo ganha o próprio bloco, no fim da trilha.
    const blockPosition = await nextPosition(client, 'course_blocks', 'course_id', courseId);
    await client.query(
      `with created as (
         insert into course_blocks (course_id, position, title, unlock_mode)
         values ($1, $2, $3, 'sequential') returning id
       )
       update sections set block_id = (select id from created) where id = $4`,
      [courseId, blockPosition, fields.title, id]
    );
    return id;
  });
}

async function updateSection(sectionId, fields) {
  return withTransaction((client) => updateRow(client, 'sections', sectionId, SECTION_COLUMNS, fields));
}

async function deleteSection(sectionId) {
  await withTransaction(async (client) => {
    const { rows: [section] } = await client.query('select block_id from sections where id = $1', [sectionId]);
    await client.query('delete from sections where id = $1', [sectionId]);
    // Bloco que ficou sem módulos sai junto.
    if (section?.block_id) {
      await client.query(
        'delete from course_blocks b where b.id = $1 and not exists (select 1 from sections s where s.block_id = b.id)',
        [section.block_id]
      );
    }
  });
}

function moveSection(courseId, sectionId, direction) {
  return moveRow('sections', 'course_id', courseId, sectionId, direction);
}

// ---------- Recursos ----------

async function createLesson(sectionId, fields) {
  return withTransaction(async (client) => {
    const id = newId('les');
    const position = await nextPosition(client, 'lessons', 'section_id', sectionId);
    await client.query(
      `insert into lessons (id, section_id, position, title, unit, type, url, content, visible, conta_progresso)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, sectionId, position, fields.title, fields.unit || '', fields.type, fields.url, fields.content, fields.visible, fields.countsProgress !== false]
    );
    return id;
  });
}

async function updateLesson(lessonId, fields) {
  return withTransaction((client) => updateRow(client, 'lessons', lessonId, LESSON_COLUMNS, fields));
}

async function deleteLesson(lessonId) {
  await query('delete from lessons where id = $1', [lessonId]);
}

function moveLesson(sectionId, lessonId, direction) {
  return moveRow('lessons', 'section_id', sectionId, lessonId, direction);
}

// ---------- Questões ----------

async function createQuestion(sectionId, fields) {
  return withTransaction(async (client) => {
    const id = newId('q');
    const position = await nextPosition(client, 'quiz_questions', 'section_id', sectionId);
    await client.query(
      `insert into quiz_questions (id, section_id, position, question, options, answer, explanation, option_feedback)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb)`,
      [
        id,
        sectionId,
        position,
        fields.question,
        JSON.stringify(fields.options),
        fields.answer,
        fields.explanation || '',
        JSON.stringify(fields.optionFeedback || [])
      ]
    );
    return id;
  });
}

async function updateQuestion(questionId, fields) {
  return withTransaction((client) => updateRow(client, 'quiz_questions', questionId, QUESTION_COLUMNS, fields));
}

async function deleteQuestion(questionId) {
  await query('delete from quiz_questions where id = $1', [questionId]);
}

module.exports = {
  fetchCourses,
  findCourseBySlug,
  findCourseById,
  slugExists,
  insertCourseTree,
  insertModules,
  replaceModules,
  createDefaultBlocks,
  updateBlockSettings,
  recordHistory,
  listHistory,
  studentsOfCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  createLesson,
  updateLesson,
  deleteLesson,
  moveLesson,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
