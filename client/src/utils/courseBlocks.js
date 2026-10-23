// Módulos do curso na ordem da trilha, com o estado de cada um (desbloqueio e progresso).
// Cada módulo tem um bloco próprio por padrão, então o estado vem do bloco ligado ao módulo.
// `blockStates` vem do servidor (progress.blocks). Sem estado, tudo fica liberado.
// Módulos de recuperação ficam de fora da trilha.

const FREE_STATE = { unlocked: true, completed: false, percentage: 0, totalSteps: 0, doneSteps: 0 };

export function trailModules(course, blockStates = []) {
  const states = new Map((blockStates || []).map((state) => [state.id, state]));
  const blocks = [...(course.blocks || [])].sort((a, b) => a.position - b.position);
  const modules = (course.modules || []).filter((module) => module.kind !== 'recuperacao');

  const ordered = [];
  blocks.forEach((block) => {
    modules
      .filter((module) => module.blockId === block.id)
      .forEach((module) => ordered.push({ module, state: states.get(block.id) || FREE_STATE }));
  });
  // Módulos sem bloco (cursos muito antigos) entram no fim, sem bloqueio.
  const placed = new Set(ordered.map((item) => item.module.id));
  modules.filter((module) => !placed.has(module.id)).forEach((module) => ordered.push({ module, state: FREE_STATE }));

  return ordered.map((item, index) => ({ ...item, number: index + 1 }));
}

export function moduleStatusLabel(state, getBadgeLabel) {
  if (!state.unlocked) return 'Bloqueado';
  if (state.completed) return 'Concluído';
  return getBadgeLabel(state.percentage);
}

// Progresso de um conjunto de passos (aulas e, se houver, o teste). Usado para módulos e unidades.
export function stepSummary(lessons = [], quiz = [], completedSet = new Set(), quizPassed = false) {
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => completedSet.has(lesson.id)).length;
  const totalQuizzes = quiz.length ? 1 : 0;
  const passedQuizzes = totalQuizzes && quizPassed ? 1 : 0;
  const total = totalLessons + totalQuizzes;
  const done = completedLessons + passedQuizzes;
  return {
    exactPercentage: total ? (done / total) * 100 : 0,
    completedLessons,
    totalLessons,
    passedQuizzes,
    totalQuizzes,
    finalProjectDone: null
  };
}
