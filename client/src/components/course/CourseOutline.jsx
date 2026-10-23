import { useState } from 'react';
import { groupLessonsByUnit, countCompleted, unitKey } from '../../utils/courseOutline';
import { moduleStatusLabel } from '../../utils/courseBlocks';
import { getBadgeLabel } from '../../utils/courseProgress';

// Sumário do curso (lateral recolhível): módulo > unidade > aula. Módulo bloqueado não abre.
// `items` vem de trailModules: [{ module, number, state }].
export default function CourseOutline({ items, completedSet, activeLessonId, onPick, collapsed, onToggleCollapsed }) {
  const activeModuleId = items.find((item) => item.module.lessons.some((l) => l.id === activeLessonId))?.module.id;
  const [openModules, setOpenModules] = useState(() => new Set(activeModuleId ? [activeModuleId] : []));
  const [openUnits, setOpenUnits] = useState(() => new Set());

  const toggle = (setter, key) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (collapsed) {
    return (
      <aside className="course-outline is-collapsed">
        <button type="button" className="outline-toggle" onClick={onToggleCollapsed} title="Mostrar conteúdo do curso" aria-label="Mostrar conteúdo do curso">
          ›
        </button>
        <span className="outline-rail-label">Conteúdo</span>
      </aside>
    );
  }

  return (
    <aside className="course-outline" aria-label="Conteúdo do curso">
      <div className="outline-head">
        <p className="outline-title">Conteúdo do curso</p>
        <button type="button" className="outline-toggle" onClick={onToggleCollapsed} title="Recolher conteúdo" aria-label="Recolher conteúdo">
          ‹
        </button>
      </div>

      <nav className="outline-tree">
        {items.map(({ module, number, state }) => {
          const open = openModules.has(module.id);
          const locked = !state.unlocked;
          const done = countCompleted(module.lessons, completedSet);
          const unitGroups = groupLessonsByUnit(module.lessons);
          return (
            <div key={module.id} className={`outline-module${open ? ' is-open' : ''}${locked ? ' is-locked' : ''}`}>
              <button
                type="button"
                className="outline-module-head"
                aria-expanded={open}
                disabled={locked}
                onClick={() => toggle(setOpenModules, module.id)}
              >
                <span className="outline-module-title">{number}. {module.title}</span>
                <span className="module-count">{locked ? moduleStatusLabel(state, getBadgeLabel) : `${done}/${module.lessons.length}`}</span>
              </button>

              {open && !locked && (
                <div className="outline-module-body">
                  {unitGroups.map((unitGroup) => {
                    if (!unitGroup.unit) {
                      return unitGroup.lessons.map((lesson) => (
                        <OutlineLesson key={lesson.id} lesson={lesson} done={completedSet.has(lesson.id)} active={lesson.id === activeLessonId} onPick={() => onPick(module.id, null, lesson.id)} />
                      ));
                    }
                    const key = unitKey(module.id, unitGroup.unit);
                    const unitOpen = openUnits.has(key) || unitGroup.lessons.some((l) => l.id === activeLessonId);
                    return (
                      <div key={unitGroup.key} className="outline-unit">
                        <button type="button" className="outline-unit-head" aria-expanded={unitOpen} onClick={() => toggle(setOpenUnits, key)}>
                          <span>{unitGroup.unit}</span>
                          <span className="module-count">{countCompleted(unitGroup.lessons, completedSet)}/{unitGroup.lessons.length}</span>
                        </button>
                        {unitOpen && unitGroup.lessons.map((lesson) => (
                          <OutlineLesson key={lesson.id} lesson={lesson} done={completedSet.has(lesson.id)} active={lesson.id === activeLessonId} onPick={() => onPick(module.id, key, lesson.id)} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function OutlineLesson({ lesson, done, active, onPick }) {
  return (
    <button type="button" className={`outline-lesson${active ? ' is-active' : ''}${done ? ' is-done' : ''}`} onClick={onPick}>
      <span className={`lesson-check lesson-check--sm${done ? ' on' : ''}`} aria-hidden="true">{done ? '✓' : ''}</span>
      <span className="outline-lesson-title">{lesson.title}</span>
    </button>
  );
}
