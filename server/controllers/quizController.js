const progressRepo = require('../db/progressRepo');
const httpError = require('../utils/httpError');
const { findCourseBySlugOr404, requireViewAccess } = require('../services/access');
const { serializeProgress, studentView } = require('./courseController');
const { computeBlocks, assertModuleUnlocked } = require('../services/blockProgress');

// Quiz corrigido pelo servidor: a resposta é conferida com o gabarito do banco, que nunca vai para o aluno.
// Uma resposta por questão por tentativa; ao responder todas, o resultado (nota e aprovado) é gravado.

function findModule(course, moduleId) {
  const module = (course.modules || []).find((item) => String(item.id) === String(moduleId));
  if (!module) throw httpError(400, 'Seção não encontrada neste curso.');
  return module;
}

// Prova de recuperação: uma única tentativa. Depois de começar, não é possível reiniciar nem responder de novo.
function isRecovery(module) {
  return module.kind === 'recuperacao';
}

// Feedback que a aluna pode ver depois de responder.
function feedbackFor(question, option, correct) {
  return {
    option,
    correct,
    correctIndex: question.answer,
    explanation: question.explanation || '',
    optionFeedback: question.optionFeedback || []
  };
}

// Resumo da tentativa a partir das respostas guardadas.
function summarize(module, answers) {
  const total = (module.quiz || []).length;
  const answered = (module.quiz || []).filter((question) => answers[question.id]);
  const score = answered.filter((question) => answers[question.id].correct).length;
  const finished = total > 0 && answered.length === total;
  return { total, score, finished, passed: finished && score === total };
}

exports.getQuizAttempt = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);
  const module = findModule(course, req.params.moduleId);

  const answers = await progressRepo.getQuizAnswers(req.user.id, module.id);
  return res.json({ answers, ...summarize(module, answers) });
};

exports.answerQuiz = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);
  const module = findModule(course, req.body.moduleId);

  const question = (module.quiz || []).find((item) => String(item.id) === String(req.body.questionId));
  if (!question) throw httpError(400, 'Questão não encontrada neste quiz.');

  const option = Number(req.body.option);
  if (!Number.isInteger(option) || option < 0 || option >= (question.options || []).length) {
    throw httpError(400, 'Alternativa inválida.');
  }

  const current = await progressRepo.getQuizAnswers(req.user.id, module.id);

  // Quiz de bloco bloqueado não pode ser respondido.
  const view = studentView(course);
  const before = await progressRepo.progressEntryForUser(req.user.id, course.id);
  assertModuleUnlocked(view, computeBlocks(view, before), module.id, { alreadyCompleted: Boolean(before.quizResults?.[module.id]) });

  // Recuperação: se o resultado já foi registrado, a única tentativa acabou.
  if (isRecovery(module)) {
    const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
    if (entry?.quizResults?.[module.id]) {
      throw httpError(409, 'A prova de recuperação tem uma única tentativa, e ela já foi registrada.');
    }
  }

  if (!current[question.id]) {
    current[question.id] = feedbackFor(question, option, option === question.answer);
    await progressRepo.saveQuizAnswer(req.user.id, module.id, question.id, current[question.id]);
  }

  const summary = summarize(module, current);
  let progress = null;
  if (summary.finished) {
    await progressRepo.saveQuizResult(req.user.id, module.id, {
      score: summary.score,
      total: summary.total,
      passed: summary.passed
    });
    const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
    progress = serializeProgress(course.slug, entry, view);
  }

  return res.json({ feedback: current[question.id], answers: current, ...summary, progress });
};

exports.resetQuiz = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);
  const module = findModule(course, req.body.moduleId);

  if (isRecovery(module)) {
    throw httpError(409, 'A prova de recuperação tem uma única tentativa e não pode ser reiniciada.');
  }
  await progressRepo.resetQuizAnswers(req.user.id, module.id);
  return res.json({ answers: {}, total: (module.quiz || []).length, score: 0, finished: false, passed: false });
};
