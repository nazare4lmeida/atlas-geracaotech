// Chave de uma unidade dentro do curso (módulo + nome), usada para abrir e fechar as unidades.
export function unitKey(moduleId, unit) {
  return `${moduleId}::${unit}`;
}

// Organiza as aulas de uma seção em unidades, mantendo a ordem do curso.
// Aulas sem unidade ficam em um grupo "" e aparecem diretamente na seção.
export function groupLessonsByUnit(lessons = []) {
  const groups = [];
  lessons.forEach((lesson) => {
    const unit = lesson.unit || '';
    const last = groups[groups.length - 1];
    if (last && last.unit === unit) {
      last.lessons.push(lesson);
    } else {
      groups.push({ unit, key: `${unit || 'sem-unidade'}-${lesson.id}`, lessons: [lesson] });
    }
  });
  return groups;
}

export function countCompleted(lessons, completedSet) {
  return lessons.filter((lesson) => completedSet.has(lesson.id)).length;
}

// Todas as unidades do curso, na ordem da trilha (aulas soltas de um módulo formam uma unidade "").
export function courseUnits(modules = []) {
  return modules.flatMap((module) =>
    groupLessonsByUnit(module.lessons).map((group) => ({
      moduleId: module.id,
      unit: group.unit,
      title: group.unit || module.title,
      lessons: group.lessons
    }))
  );
}
