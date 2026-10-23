const { summarizeProgress } = require('./courseView');

// Aptidão a certificado (regras da gestão):
// - Conclusão: todas as aulas, todos os quizzes aprovados e projeto final entregue.
// - Participação: presença de pelo menos 75%, projeto final entregue e progresso geral acima de 50%.
// Presença usa as aulas concluídas como referência até existir controle de frequência nas aulas.
const PRESENCE_MIN = 0.75;
const PROGRESS_MIN = 50;

function evaluateCertificate(courseView, entry) {
  const summary = summarizeProgress(courseView, entry);
  const presence = summary.totalLessons ? summary.completedLessons / summary.totalLessons : 0;

  let tipo = null;
  if (summary.certificateEligible) {
    tipo = 'conclusao';
  } else if (presence >= PRESENCE_MIN && summary.finalProjectDone && summary.percentage > PROGRESS_MIN) {
    tipo = 'participacao';
  }

  return {
    tipo,
    percentage: summary.percentage,
    presence: Math.round(presence * 100),
    finalProjectDone: summary.finalProjectDone,
    completedLessons: summary.completedLessons,
    totalLessons: summary.totalLessons,
    passedQuizzes: summary.passedQuizzes,
    totalQuizzes: summary.totalQuizzes
  };
}

module.exports = { evaluateCertificate, PRESENCE_MIN, PROGRESS_MIN };
