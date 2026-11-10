const httpError = require('../utils/httpError');

// Estado dos blocos (fases) para um aluno. Regra única, usada pelo painel e pelas validações de progresso.
//
// - Bloco 'sequential' só libera quando todos os blocos sequenciais anteriores estão concluídos.
// - Bloco 'open' fica sempre liberado e não bloqueia os seguintes (avisos, apresentação, apoio).
// - Bloco concluído: todas as aulas e todos os quizzes (módulos que têm questões) aprovados.
// - Bloco sem nenhum passo (ex.: todos os módulos ocultos) conta como concluído, para não travar a sequência.
// - Módulo de recuperação fica fora dos blocos: não tem bloqueio nem conta no progresso de conteúdo.
//
// `view` é a visão do aluno do curso (serializeCourse com canManage: false).
// `entry` é o progresso do aluno: { completedLessons, quizResults }.

function computeBlocks(view, entry = {}) {
  const completed = new Set(entry.completedLessons || []);
  const quizResults = entry.quizResults || {};
  const modules = (view.modules || []).filter((module) => module.kind !== 'recuperacao');
  const blocks = [...(view.blocks || [])].sort((a, b) => a.position - b.position);

  let previousDone = true;
  return blocks.map((block) => {
    const blockModules = modules.filter((module) => module.blockId === block.id);
    const lessonIds = blockModules.flatMap((module) => (module.lessons || []).map((lesson) => lesson.id));
    const quizModuleIds = blockModules.filter((module) => (module.quiz || []).length > 0).map((module) => module.id);

    const totalSteps = lessonIds.length + quizModuleIds.length;
    const doneSteps =
      lessonIds.filter((id) => completed.has(id)).length +
      quizModuleIds.filter((id) => quizResults[id]?.passed).length;
    const isDone = totalSteps === 0 || doneSteps === totalSteps;

    const unlocked = block.unlockMode === 'open' || previousDone;
    if (block.unlockMode !== 'open') {
      previousDone = previousDone && isDone;
    }

    return {
      id: block.id,
      title: block.title,
      description: block.description || '',
      position: block.position,
      unlockMode: block.unlockMode,
      workloadHours: block.workloadHours || 0,
      unlocked,
      completed: isDone,
      totalSteps,
      doneSteps,
      percentage: totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 100,
      moduleIds: blockModules.map((module) => module.id)
    };
  });
}

// Progresso geral da formação: média dos blocos ponderada pela carga horária (média simples sem carga).
function overallPercentage(blocks) {
  const counted = blocks.filter((block) => block.totalSteps > 0);
  if (counted.length === 0) return 0;
  const totalWeight = counted.reduce((sum, block) => sum + (block.workloadHours || 0), 0);
  if (totalWeight === 0) {
    return Math.round(counted.reduce((sum, block) => sum + block.percentage, 0) / counted.length);
  }
  return Math.round(counted.reduce((sum, block) => sum + block.percentage * (block.workloadHours || 0), 0) / totalWeight);
}

// Recusa a ação (concluir aula ou responder quiz) se o bloco do módulo ainda está bloqueado.
// Revisar um conteúdo já concluído continua permitido.
function assertModuleUnlocked(view, blocks, moduleId, { alreadyCompleted = false } = {}) {
  const module = (view.modules || []).find((item) => String(item.id) === String(moduleId));
  if (!module || !module.blockId || alreadyCompleted) return;
  const block = blocks.find((item) => item.id === module.blockId);
  if (block && !block.unlocked) {
    throw httpError(403, `Este conteúdo está em um bloco bloqueado. Conclua o bloco anterior para liberar "${block.title}".`);
  }
}

// Esconde o conteúdo de módulos de blocos bloqueados: título e estrutura continuam (o painel mostra o cadeado),
// mas texto, links de aulas e enunciados/alternativas das questões não saem da API até o bloco ser liberado.
function redactLockedBlocks(view, blocks) {
  const lockedIds = new Set(blocks.filter((block) => !block.unlocked).map((block) => block.id));
  if (lockedIds.size === 0) return view;

  return {
    ...view,
    modules: (view.modules || []).map((module) => {
      if (!module.blockId || !lockedIds.has(module.blockId)) return module;
      return {
        ...module,
        lessons: (module.lessons || []).map((lesson) => ({ ...lesson, content: '', url: '' })),
        quiz: (module.quiz || []).map((question) => ({ id: question.id, question: '', options: [] }))
      };
    })
  };
}

module.exports = { computeBlocks, overallPercentage, assertModuleUnlocked, redactLockedBlocks };
