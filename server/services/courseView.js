const { DEFAULT_LAYOUT, effectiveTheme } = require('./layouts');
const { withMediaUrls } = require('./mediaStorage');
// Transforma cursos (objetos vindos de courseRepo) na representação enviada à API.
// A visão depende de quem consulta: quem gerencia vê tudo; alunos veem apenas o conteúdo visível.

function serializeCourse(course, access = {}) {
  const showAll = Boolean(access.canManage);

  const modules = (course.modules || [])
    .filter((module) => showAll || module.visible !== false)
    .map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description || '',
      visible: module.visible !== false,
      kind: module.kind || 'modulo',
      blockId: module.blockId || null,
      lessons: (module.lessons || [])
        .filter((lesson) => showAll || lesson.visible !== false)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type || 'video',
          unit: lesson.unit || '',
          url: lesson.url || '',
          content: withMediaUrls(lesson.content || ''),
          visible: lesson.visible !== false
        })),
      quiz: (module.quiz || []).map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options || [],
        // Gabarito, explicação e feedback só para quem gerencia o curso. O aluno recebe a correção ao responder.
        ...(showAll
          ? { answer: question.answer, explanation: question.explanation || '', optionFeedback: question.optionFeedback || [] }
          : {})
      }))
    }));

  return {
    id: course.id,
    slug: course.slug,
    key: course.key || '',
    title: course.title,
    summary: course.summary || '',
    banner: course.banner || '',
    level: course.level || '',
    estimatedHours: course.estimatedHours || 0,
    certificateTemplateId: course.certificateTemplateId || null,
    certificateParticipacaoTemplateId: course.certificateParticipacaoTemplateId || null,
    certificateReleaseAt: course.certificateReleaseAt || null,
    accent: course.accent || '#6366f1',
    layout: course.layout || DEFAULT_LAYOUT,
    theme: effectiveTheme(course),
    visible: course.visible !== false,
    selfEnrolment: course.selfEnrolment !== false,
    finalProject: {
      title: course.finalProject?.title || '',
      description: course.finalProject?.description || ''
    },
    blocks: (course.blocks || []).map((block) => ({
      id: block.id,
      title: block.title,
      description: block.description || '',
      position: block.position,
      unlockMode: block.unlockMode,
      workloadHours: block.workloadHours || 0,
      level: block.level || '',
      accent: block.accent || '#6366f1'
    })),
    modules,
    permissions: {
      canManage: showAll,
      canDelete: Boolean(access.canDelete),
      role: access.role || null,
      enrolled: Boolean(access.enrolment)
    }
  };
}

// Versão pública (página inicial), sem conteúdo nem respostas.
function serializeCatalogItem(course) {
  return {
    slug: course.slug,
    key: course.key || '',
    title: course.title,
    summary: course.summary || '',
    level: course.level || '',
    estimatedHours: course.estimatedHours || 0,
    certificateTemplateId: course.certificateTemplateId || null,
    certificateParticipacaoTemplateId: course.certificateParticipacaoTemplateId || null,
    certificateReleaseAt: course.certificateReleaseAt || null,
    accent: course.accent || '#6366f1',
    layout: course.layout || DEFAULT_LAYOUT,
    theme: effectiveTheme(course),
    modules: (course.modules || []).length
  };
}

// Mesma regra usada no front-end (utils/courseProgress.js):
// só conta aulas e quizzes que existem na visão consultada.
function summarizeProgress(courseView, entry) {
  // A prova de recuperação não entra no progresso de conteúdo; ela só habilita a participação.
  const modules = (courseView.modules || []).filter((module) => module.kind !== 'recuperacao');
  const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const completedSet = new Set(entry?.completedLessons || []);
  const quizResults = entry?.quizResults || {};

  const totalLessons = lessonIds.length;
  const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;
  const totalQuizzes = modules.length;
  const passedQuizzes = modules.filter((module) => quizResults[module.id]?.passed).length;
  const finalProjectDone = Boolean(entry?.finalProjectCompleted);

  const stepsDone = completedLessons + passedQuizzes + (finalProjectDone ? 1 : 0);
  const totalSteps = totalLessons + totalQuizzes + 1;

  return {
    totalLessons,
    completedLessons,
    totalQuizzes,
    passedQuizzes,
    finalProjectDone,
    percentage: Math.round((stepsDone / totalSteps) * 100) || 0,
    certificateEligible:
      completedLessons === totalLessons && passedQuizzes === totalQuizzes && finalProjectDone
  };
}

module.exports = {
  serializeCourse,
  serializeCatalogItem,
  summarizeProgress
};
