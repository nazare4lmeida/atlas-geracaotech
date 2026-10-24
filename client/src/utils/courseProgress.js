// Mesma regra do servidor (services/courseView.js): só conta aulas e quizzes que existem
// no curso recebido. Assim, conteúdo removido não distorce o percentual.

export function getLessonCount(course) {
  return (course.modules || []).reduce((total, module) => total + (module.lessons || []).length, 0);
}

export function getCourseProgress(course, progress = {}) {
  const modules = course.modules || [];
  const lessonIds = modules.flatMap((module) => (module.lessons || []).map((lesson) => lesson.id));
  const completedSet = new Set(progress.completedLessons || []);
  const quizResults = progress.quizResults || {};

  const totalLessons = lessonIds.length;
  const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;
  // A barra conta só as aulas marcadas como "conta na barra". O certificado continua usando o total acima.
  const countedIds = modules.flatMap((module) =>
    (module.lessons || []).filter((lesson) => lesson.countsProgress !== false).map((lesson) => lesson.id)
  );
  const countedLessons = countedIds.length;
  const countedCompleted = countedIds.filter((id) => completedSet.has(id)).length;
  const totalQuizzes = modules.length;
  const passedQuizzes = modules.filter((module) => quizResults[module.id]?.passed).length;
  const finalProjectDone = Boolean(progress.finalProjectCompleted);

  const stepsDone = countedCompleted + passedQuizzes + (finalProjectDone ? 1 : 0);
  const totalSteps = countedLessons + totalQuizzes + 1;
  const exactPercentage = totalSteps > 0 ? (stepsDone / totalSteps) * 100 : 0;
  const percentage = Math.round(exactPercentage);

  const certificateEligible =
    completedLessons === totalLessons && passedQuizzes === totalQuizzes && finalProjectDone;

  return {
    totalLessons,
    completedLessons,
    countedLessons,
    countedCompleted,
    totalQuizzes,
    passedQuizzes,
    finalProjectDone,
    percentage,
    exactPercentage,
    certificateEligible
  };
}

export function getBadgeLabel(percentage) {
  if (percentage >= 100) return 'Mestre';
  if (percentage >= 70) return 'Em destaque';
  if (percentage >= 40) return 'Consistente';
  return 'Começando';
}
