const { query, withTransaction } = require('../db/pool');
const { insertCourseTree } = require('../db/courseRepo');
const { coursesCatalog } = require('../data/courses');
const { formacoesCatalog } = require('../data/formacoes');

// Converte o catálogo estático original (data/courses.js) no formato do banco.
// Os IDs de seções e aulas são mantidos, pois o progresso dos alunos depende deles.
function toCourseDocument(course) {
  return {
    slug: course.slug,
    key: course.key,
    title: course.title,
    summary: course.summary,
    banner: course.banner,
    level: course.level,
    estimatedHours: course.estimatedHours,
    accent: course.accent,
    visible: true,
    selfEnrolment: true,
    finalProject: {
      title: course.finalProject?.title || '',
      description: course.finalProject?.description || ''
    },
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description || '',
      visible: true,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.videoUrl ? 'video' : 'page',
        url: lesson.videoUrl || '',
        content: lesson.content || '',
        visible: true
      })),
      quiz: module.quiz.map((question, index) => ({
        id: `${module.id}-q${index + 1}`,
        question: question.question,
        options: question.options,
        answer: question.answer
      }))
    }))
  };
}

// Catálogo completo: cursos originais de demonstração + formações do Geração Tech.
function getCatalogDocuments() {
  return [...coursesCatalog.map(toCourseDocument), ...formacoesCatalog];
}

// Insere o catálogo. Usado na primeira execução (banco sem cursos) e no seed (que apaga tudo antes).
async function importCatalog() {
  const documents = getCatalogDocuments();
  await withTransaction(async (client) => {
    for (const document of documents) {
      await insertCourseTree(client, document, null);
    }
  });
  return documents.length;
}

// Insere apenas os cursos do catálogo que ainda não existem (pelo slug). Não apaga nada.
// Serve para atualizar um banco que já tem dados, sem perder cursos, matrículas ou progresso.
async function syncCatalog() {
  const { rows } = await query('select slug from courses');
  const existing = new Set(rows.map((row) => row.slug));
  const missing = getCatalogDocuments().filter((document) => !existing.has(document.slug));

  if (missing.length === 0) return [];

  await withTransaction(async (client) => {
    for (const document of missing) {
      await insertCourseTree(client, document, null);
    }
  });
  return missing.map((document) => document.slug);
}

async function importCatalogIfEmpty() {
  const { rows } = await query('select count(*)::int as total from courses');
  if (rows[0].total > 0) return 0;
  return importCatalog();
}

module.exports = {
  toCourseDocument,
  getCatalogDocuments,
  importCatalog,
  importCatalogIfEmpty,
  syncCatalog
};
