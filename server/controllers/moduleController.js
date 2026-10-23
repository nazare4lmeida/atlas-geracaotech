const courseRepo = require('../db/courseRepo');
const accessRepo = require('../db/accessRepo');
const httpError = require('../utils/httpError');
const { findCourseBySlugOr404, requireManageAccess, buildAccess } = require('../services/access');
const { serializeCourse } = require('../services/courseView');

// Seções (módulos), recursos (aulas), questões do teste e projeto final.
// Todas as rotas exigem permissão de gestão no curso (admin ou docente do curso).

const LESSON_TYPES = ['video', 'page', 'link'];

async function loadManagedCourse(req) {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireManageAccess(course, req.user);
  return course;
}

function findModuleOr404(course, moduleId) {
  const section = course.modules.find((item) => item.id === moduleId);
  if (!section) {
    throw httpError(404, 'Seção não encontrada.');
  }
  return section;
}

function findLessonOr404(section, lessonId) {
  const lesson = section.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw httpError(404, 'Recurso não encontrado.');
  }
  return lesson;
}

function findQuestionOr404(section, questionId) {
  const question = section.quiz.find((item) => item.id === questionId);
  if (!question) {
    throw httpError(404, 'Questão não encontrada.');
  }
  return question;
}

// Devolve o curso completo já atualizado, com as permissões de quem fez a alteração.
async function respond(res, user, courseId, status = 200) {
  const course = await courseRepo.findCourseById(courseId);
  const enrolment = await accessRepo.findEnrollment(courseId, user.id);
  return res.status(status).json({
    course: serializeCourse(course, buildAccess(user, course, enrolment))
  });
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || '').trim());
}

// Valida e normaliza os campos de um recurso. Campos ausentes mantêm o valor atual (edição).
function normalizeLessonFields(body, current = {}) {
  const type = body.type !== undefined ? String(body.type) : current.type || 'video';
  if (!LESSON_TYPES.includes(type)) {
    throw httpError(400, 'Tipo de recurso inválido.');
  }

  const title = body.title !== undefined ? String(body.title).trim() : current.title || '';
  if (!title) {
    throw httpError(400, 'Informe o título do recurso.');
  }

  const unit = body.unit !== undefined ? String(body.unit).trim() : current.unit || '';
  if (unit.length > 160) {
    throw httpError(400, 'O nome da unidade é muito longo (máximo de 160 caracteres).');
  }

  const url = body.url !== undefined ? String(body.url).trim() : current.url || '';
  const content = body.content !== undefined ? String(body.content).trim() : current.content || '';

  if ((type === 'video' || type === 'link') && !isHttpUrl(url)) {
    throw httpError(400, 'Informe uma URL válida (começando com http:// ou https://).');
  }

  if (type === 'page' && !content) {
    throw httpError(400, 'Recursos do tipo página precisam de conteúdo.');
  }

  return {
    title,
    unit,
    type,
    url: type === 'page' ? '' : url,
    content,
    visible: body.visible !== undefined ? Boolean(body.visible) : current.visible !== false
  };
}

// Valida e normaliza uma questão do teste.
function normalizeQuestionFields(body, current = {}) {
  const question = body.question !== undefined ? String(body.question).trim() : current.question || '';
  if (!question) {
    throw httpError(400, 'Informe o enunciado da questão.');
  }

  const rawOptions = body.options !== undefined ? body.options : current.options || [];
  const options = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option) => String(option).trim())
    .filter(Boolean);

  if (options.length < 2) {
    throw httpError(400, 'Informe pelo menos duas alternativas.');
  }

  const answer = body.answer !== undefined ? Number(body.answer) : current.answer;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    throw httpError(400, 'Indique qual alternativa é a correta.');
  }

  const explanation = body.explanation !== undefined ? String(body.explanation).trim() : current.explanation || '';
  if (explanation.length > 1000) {
    throw httpError(400, 'A explicação da questão é muito longa (máximo de 1000 caracteres).');
  }

  // Feedback por alternativa: uma linha por alternativa, na mesma ordem (pode ficar vazio).
  const rawFeedback = body.optionFeedback !== undefined ? body.optionFeedback : current.optionFeedback || [];
  const optionFeedback = (Array.isArray(rawFeedback) ? rawFeedback : []).slice(0, options.length).map((item) => {
    const text = String(item ?? '').trim();
    if (text.length > 500) {
      throw httpError(400, 'Cada feedback de alternativa pode ter no máximo 500 caracteres.');
    }
    return text;
  });

  return { question, options, answer, explanation, optionFeedback };
}

// ---------- Seções ----------

exports.addModule = async (req, res) => {
  const course = await loadManagedCourse(req);
  const title = String(req.body.title || '').trim();
  if (!title) {
    throw httpError(400, 'Informe o título da seção.');
  }

  await courseRepo.createSection(course.id, {
    title,
    description: String(req.body.description || '').trim(),
    visible: req.body.visible !== undefined ? Boolean(req.body.visible) : true
  });

  return respond(res, req.user, course.id, 201);
};

exports.updateModule = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);

  const fields = {};
  if (req.body.title !== undefined) {
    fields.title = String(req.body.title).trim();
    if (!fields.title) throw httpError(400, 'Informe o título da seção.');
  }
  if (req.body.description !== undefined) fields.description = String(req.body.description).trim();
  if (req.body.visible !== undefined) fields.visible = Boolean(req.body.visible);

  await courseRepo.updateSection(section.id, fields);
  return respond(res, req.user, course.id);
};

exports.deleteModule = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);

  await courseRepo.deleteSection(section.id);
  return respond(res, req.user, course.id);
};

exports.moveModule = async (req, res) => {
  const course = await loadManagedCourse(req);
  const moved = await courseRepo.moveSection(course.id, req.params.moduleId, req.body.direction);
  if (!moved) throw httpError(404, 'Seção não encontrada.');

  return respond(res, req.user, course.id);
};

// ---------- Recursos (aulas) ----------

exports.addLesson = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);

  await courseRepo.createLesson(section.id, normalizeLessonFields(req.body));
  return respond(res, req.user, course.id, 201);
};

exports.updateLesson = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);
  const lesson = findLessonOr404(section, req.params.lessonId);

  await courseRepo.updateLesson(lesson.id, normalizeLessonFields(req.body, lesson));
  return respond(res, req.user, course.id);
};

exports.deleteLesson = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);
  const lesson = findLessonOr404(section, req.params.lessonId);

  await courseRepo.deleteLesson(lesson.id);
  return respond(res, req.user, course.id);
};

exports.moveLesson = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);

  const moved = await courseRepo.moveLesson(section.id, req.params.lessonId, req.body.direction);
  if (!moved) throw httpError(404, 'Recurso não encontrado.');

  return respond(res, req.user, course.id);
};

// ---------- Questões do teste (atividade de cada seção) ----------

exports.addQuestion = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);

  await courseRepo.createQuestion(section.id, normalizeQuestionFields(req.body));
  return respond(res, req.user, course.id, 201);
};

exports.updateQuestion = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);
  const question = findQuestionOr404(section, req.params.questionId);

  await courseRepo.updateQuestion(question.id, normalizeQuestionFields(req.body, question));
  return respond(res, req.user, course.id);
};

exports.deleteQuestion = async (req, res) => {
  const course = await loadManagedCourse(req);
  const section = findModuleOr404(course, req.params.moduleId);
  const question = findQuestionOr404(section, req.params.questionId);

  await courseRepo.deleteQuestion(question.id);
  return respond(res, req.user, course.id);
};

// ---------- Projeto final ----------

exports.updateFinalProject = async (req, res) => {
  const course = await loadManagedCourse(req);
  const current = course.finalProject || {};

  await courseRepo.updateCourse(course.id, {
    finalProject: {
      title: req.body.title !== undefined ? String(req.body.title).trim() : current.title || '',
      description:
        req.body.description !== undefined ? String(req.body.description).trim() : current.description || ''
    }
  });

  return respond(res, req.user, course.id);
};
