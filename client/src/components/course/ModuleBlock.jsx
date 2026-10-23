import LessonItem from './LessonItem';
import QuizDialog from './QuizDialog';
import UnitCompletion from './UnitCompletion';
import { Fragment, useState } from 'react';
import { groupLessonsByUnit, countCompleted, unitKey } from '../../utils/courseOutline';

// Módulo recolhível: contém as aulas soltas e as unidades (também recolhíveis), e o teste do módulo.
// A conclusão é por unidade: a aluna não marca aula por aula.
export default function ModuleBlock({
  module,
  open,
  onToggleModule,
  openUnits,
  onToggleUnit,
  openLessons,
  onToggleLesson,
  completedSet,
  onCompleteUnit,
  onRead,
  quizResult,
  onLoadQuiz,
  onAnswerQuiz,
  onRetryQuiz
}) {
  const [quizOpen, setQuizOpen] = useState(false);
  const groups = groupLessonsByUnit(module.lessons);
  const done = countCompleted(module.lessons, completedSet);
  const total = module.lessons.length;

  return (
    <section id={`module-${module.id}`} className={`module-block${open ? ' is-open' : ''}`}>
      <button type="button" className="module-head" aria-expanded={open} onClick={() => onToggleModule(module.id)}>
        <span className="module-head-text">
          <span className="module-head-title">{module.title}</span>
          {module.description && <span className="module-head-desc">{module.description}</span>}
        </span>
        <span className="module-head-meta">
          <span className="module-count">{done}/{total}</span>
          <span className="lesson-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
        </span>
      </button>

      {open && (
        <div className="module-body">
          {groups.map((group) => {
            const unitDone = countCompleted(group.lessons, completedSet);
            const unitFinished = unitDone === group.lessons.length;
            const concluirUnidade = () => onCompleteUnit(module.id, group.unit);

            if (!group.unit) {
              return (
                <Fragment key={group.key}>
                  {group.lessons.map((lesson) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      open={openLessons.has(lesson.id)}
                      completed={completedSet.has(lesson.id)}
                      onToggle={() => onToggleLesson(lesson.id)}
                      onRead={() => onRead(lesson.id)}
                    />
                  ))}
                  <UnitCompletion done={unitFinished} onComplete={concluirUnidade} />
                </Fragment>
              );
            }

            const key = unitKey(module.id, group.unit);
            const unitOpen = openUnits.has(key);
            return (
              <div key={group.key} id={`unit-${module.id}-${group.key}`} className={`unit-block${unitOpen ? ' is-open' : ''}`}>
                <button type="button" className="unit-head" aria-expanded={unitOpen} onClick={() => onToggleUnit(key)}>
                  <span className="unit-head-title">{group.unit}</span>
                  <span className="module-count">{unitDone}/{group.lessons.length}</span>
                  <span className="lesson-chevron" aria-hidden="true">{unitOpen ? '−' : '+'}</span>
                </button>
                {unitOpen && (
                  <div className="unit-body">
                    {group.lessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        open={openLessons.has(lesson.id)}
                        completed={completedSet.has(lesson.id)}
                        onToggle={() => onToggleLesson(lesson.id)}
                        onRead={() => onRead(lesson.id)}
                      />
                    ))}
                    <UnitCompletion done={unitFinished} onComplete={concluirUnidade} />
                  </div>
                )}
              </div>
            );
          })}

          {module.quiz.length > 0 && (
            <div className="module-quiz">
              <div>
                <p className="module-quiz-title">Quiz do módulo</p>
                <p className="module-quiz-desc">
                  {quizResult?.passed
                    ? 'Módulo aprovado.'
                    : `${module.quiz.length} questões. Você recebe a correção e a explicação de cada resposta.`}
                </p>
              </div>
              <button type="button" className="primary-button" onClick={() => setQuizOpen(true)}>
                {quizResult?.passed ? 'Revisar quiz' : 'Fazer o quiz'}
              </button>
            </div>
          )}

          {quizOpen && (
            <QuizDialog
              quiz={module.quiz}
              moduleTitle={module.title}
              previousResult={quizResult}
              loadAttempt={() => onLoadQuiz(module.id)}
              onAnswer={(questionId, option) => onAnswerQuiz(module.id, questionId, option)}
              onRetry={() => onRetryQuiz(module.id)}
              onClose={() => setQuizOpen(false)}
            />
          )}
        </div>
      )}
    </section>
  );
}
