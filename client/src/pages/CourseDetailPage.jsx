import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ModuleBlock from '../components/course/ModuleBlock';
import ModuleCard from '../components/course/ModuleCard';
import ProgressCard from '../components/course/ProgressCard';
import CourseOutline from '../components/course/CourseOutline';
import CourseProgressBar from '../components/course/CourseProgressBar';
import WelcomeModal from '../components/course/WelcomeModal';
import ReadingMode from '../components/course/ReadingMode';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { courseThemeStyle } from '../layouts/registry';
import api from '../services/api';
import { getCourseProgress, getBadgeLabel } from '../utils/courseProgress';
import { unitKey } from '../utils/courseOutline';
import { trailModules, stepSummary } from '../utils/courseBlocks';
import { groupLessonsByUnit } from '../utils/courseOutline';

// Formato da página do curso, escolhido pela pessoa: "moderno" (cards) ou "classico" (lista recolhível).
const LAYOUT_KEY = 'atlas-formato-curso';
function readLayoutMode() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'classico' ? 'classico' : 'moderno';
  } catch {
    return 'moderno';
  }
}
function saveLayoutMode(mode) {
  try {
    localStorage.setItem(LAYOUT_KEY, mode);
  } catch {
    // Sem armazenamento disponível: a escolha vale só nesta visita.
  }
}

function welcomeKey(userId, slug) {
  return `atlas-welcome:${userId || 'anon'}:${slug}`;
}

function hasSeenWelcome(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markWelcomeSeen(key) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // sem armazenamento: a janela pode reaparecer na próxima visita
  }
}

// Abre, por padrão, o caminho até a primeira aula ainda não concluída (módulo, unidade e aula).
function initialOpenState(course, completedSet) {
  const modules = new Set();
  const units = new Set();
  const lessons = new Set();

  let target = null;
  for (const module of course.modules) {
    const lesson = module.lessons.find((item) => !completedSet.has(item.id));
    if (lesson) {
      target = { module, lesson };
      break;
    }
  }
  if (!target && course.modules[0]) {
    target = { module: course.modules[0], lesson: course.modules[0].lessons[0] };
  }

  if (target) {
    modules.add(target.module.id);
    if (target.lesson) {
      lessons.add(target.lesson.id);
      if (target.lesson.unit) units.add(unitKey(target.module.id, target.lesson.unit));
    }
  }
  return { modules, units, lessons };
}

function toggleIn(setter, key) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

export default function CourseDetailPage() {
  const { slug, blockId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressMap, setProgressMap] = useState({});
  const [layoutMode, setLayoutMode] = useState(readLayoutMode);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeUnitKey, setActiveUnitKey] = useState(null);

  // Trocar de bloco pela URL fecha o módulo e a unidade que estavam abertos.
  useEffect(() => {
    setActiveModuleId(null);
    setActiveUnitKey(null);
  }, [blockId]);
  const [openModules, setOpenModules] = useState(() => new Set());
  const [openUnits, setOpenUnits] = useState(() => new Set());
  const [openLessons, setOpenLessons] = useState(() => new Set());
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [readingIndex, setReadingIndex] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    Promise.all([api.get(`/courses/${slug}`), api.get('/users/dashboard')])
      .then(([courseRes, dashboardRes]) => {
        if (!active) return;
        const loaded = courseRes.data.course;
        const progress = dashboardRes.data.progress?.[loaded.slug] || {};
        const completed = new Set(progress.completedLessons || []);
        const initial = initialOpenState(loaded, completed);

        setCourse(loaded);
        setProgressMap(dashboardRes.data.progress || {});
        setOpenModules(initial.modules);
        setOpenUnits(initial.units);
        setOpenLessons(initial.lessons);
        setActiveLessonId([...initial.lessons][0] || null);
        setWelcomeOpen(!hasSeenWelcome(welcomeKey(user?.id, loaded.slug)));
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        const code = error.response?.status;
        setErrorMessage(error.response?.data?.message || 'Não foi possível carregar o curso.');
        setStatus(code === 404 ? 'notfound' : code === 403 ? 'forbidden' : 'error');
      });

    return () => {
      active = false;
    };
  }, [slug, user?.id]);

  const progress = course ? progressMap[course.slug] || {} : {};
  const completedSet = useMemo(() => new Set(progress.completedLessons || []), [progress.completedLessons]);
  const trail = useMemo(() => (course ? trailModules(course, progress.blocks) : []), [course, progress.blocks]);

  // Bloco (fase) aberto pela URL /cursos/:slug/modulo/:blockId. Sem bloco, a página é a lista de blocos.
  const block = useMemo(
    () => (course && blockId ? (course.blocks || []).find((item) => item.id === blockId) || null : null),
    [course, blockId]
  );
  const blockTrail = useMemo(() => (blockId ? trail.filter((item) => item.module.blockId === blockId) : trail), [trail, blockId]);
  const blockCards = useMemo(
    () =>
      course
        ? [...(course.blocks || [])]
            .sort((a, b) => a.position - b.position)
            .map((item) => {
              const state = (progress.blocks || []).find((s) => s.id === item.id) || { unlocked: true, completed: false, percentage: 0 };
              const locked = !state.unlocked;
              return {
                block: item,
                locked,
                percentage: state.percentage,
                badge: locked ? 'Bloqueado' : state.completed ? 'Concluído' : getBadgeLabel(state.percentage),
                footer: item.workloadHours > 0 ? `${item.workloadHours}h estimadas` : 'Carga horária a definir'
              };
            })
        : [],
    [course, progress.blocks]
  );
  // Progresso do bloco aberto: soma das aulas e dos testes dos módulos dele.
  const blockSummaryValue = useMemo(() => {
    if (!blockId) return null;
    const modules = blockTrail.map((item) => item.module);
    const lessons = modules.flatMap((module) => module.lessons);
    const quizModules = modules.filter((module) => module.quiz?.length);
    const passed = quizModules.filter((module) => progress.quizResults?.[module.id]?.passed).length;
    const total = lessons.length + quizModules.length;
    const done = lessons.filter((lesson) => completedSet.has(lesson.id)).length + passed;
    return {
      exactPercentage: total ? (done / total) * 100 : 0,
      completedLessons: lessons.filter((lesson) => completedSet.has(lesson.id)).length,
      totalLessons: lessons.length,
      passedQuizzes: passed,
      totalQuizzes: quizModules.length,
      finalProjectDone: null
    };
  }, [blockId, blockTrail, completedSet, progress.quizResults]);

  // Formato moderno: módulo aberto, e suas unidades como cards.
  const activeModule = useMemo(
    () => (course && activeModuleId ? course.modules.find((m) => m.id === activeModuleId) || null : null),
    [course, activeModuleId]
  );
  const activeTrailNumber = useMemo(
    () => trail.find((item) => item.module.id === activeModuleId)?.number,
    [trail, activeModuleId]
  );
  const moduleSummary = useMemo(
    () =>
      activeModule
        ? stepSummary(activeModule.lessons, activeModule.quiz, completedSet, Boolean(progress.quizResults?.[activeModule.id]?.passed))
        : null,
    [activeModule, completedSet, progress.quizResults]
  );
  const unitCards = useMemo(() => {
    if (!activeModule) return [];
    const cards = groupLessonsByUnit(activeModule.lessons).map((group) => {
      const key = group.unit ? unitKey(activeModule.id, group.unit) : `${activeModule.id}::__direto`;
      const s = stepSummary(group.lessons, [], completedSet);
      return {
        key,
        title: group.unit || 'Aulas do módulo',
        percentage: Math.round(s.exactPercentage),
        description: `${group.lessons.length} aulas`,
        footer: `${group.lessons.length} aulas`,
        module: { ...activeModule, lessons: group.lessons, quiz: [] }
      };
    });
    if (activeModule.quiz?.length) {
      const passed = Boolean(progress.quizResults?.[activeModule.id]?.passed);
      cards.push({
        key: `${activeModule.id}::__quiz`,
        title: 'Teste do módulo',
        percentage: passed ? 100 : 0,
        description: `${activeModule.quiz.length} questões`,
        footer: `${activeModule.quiz.length} questões`,
        module: { ...activeModule, lessons: [] }
      });
    }
    return cards;
  }, [activeModule, completedSet, progress.quizResults]);
  const activeUnit = unitCards.find((card) => card.key === activeUnitKey) || null;

  // Visão do curso no formato moderno não mostra o sumário lateral: os cards ocupam a largura toda.
  const showOutline = layoutMode === 'classico' || Boolean(activeModule) || Boolean(blockId);

  const chooseLayout = (mode) => {
    setLayoutMode(mode);
    saveLayoutMode(mode);
  };
  const summary = useMemo(() => (course ? getCourseProgress(course, progress) : null), [course, progress]);

  // Lista de todas as aulas na ordem do curso, usada pelo modo leitura (Anterior/Próxima).
  const entries = useMemo(
    () =>
      course
        ? course.modules.flatMap((module) =>
            module.lessons.map((lesson) => ({ lesson, moduleId: module.id, moduleTitle: module.title, unit: lesson.unit || '' }))
          )
        : [],
    [course]
  );

  const markLesson = useCallback(
    async (lessonId) => {
      const { data } = await api.post(`/courses/${course.slug}/progress/lesson`, { lessonId });
      setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
    },
    [course]
  );

  // Quiz: o servidor corrige cada resposta. A nota só é gravada quando todas as questões foram respondidas.
  const loadQuiz = (moduleId) => api.get(`/courses/${course.slug}/progress/quiz/${moduleId}`).then(({ data }) => data);

  const answerQuiz = async (moduleId, questionId, option) => {
    const { data } = await api.post(`/courses/${course.slug}/progress/quiz/answer`, { moduleId, questionId, option });
    if (data.progress) setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
    return data;
  };

  const retryQuiz = (moduleId) => api.post(`/courses/${course.slug}/progress/quiz/reset`, { moduleId });

  const completeProject = async () => {
    const { data } = await api.post(`/courses/${course.slug}/progress/project`);
    setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
  };

  // Vai até uma aula pela trilha: abre módulo, unidade e aula, e rola a página até ela.
  const pickLesson = (moduleId, unit, lessonId) => {
    setActiveModuleId(moduleId);
    setActiveUnitKey(unit || `${moduleId}::__direto`);
    setOpenModules((current) => new Set(current).add(moduleId));
    if (unit) setOpenUnits((current) => new Set(current).add(unit));
    setOpenLessons((current) => new Set(current).add(lessonId));
    setActiveLessonId(lessonId);
    requestAnimationFrame(() => {
      document.getElementById(`lesson-${lessonId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openReading = (lessonId) => {
    const index = entries.findIndex((entry) => entry.lesson.id === lessonId);
    if (index >= 0) {
      setActiveLessonId(lessonId);
      setOpenLessons((current) => new Set(current).add(lessonId));
      setReadingIndex(index);
    }
  };

  const closeReading = () => {
    const lessonId = entries[readingIndex]?.lesson.id;
    setReadingIndex(null);
    if (lessonId) pickLesson(entries[readingIndex].moduleId, entries[readingIndex].unit ? `${entries[readingIndex].moduleId}::${entries[readingIndex].unit}` : null, lessonId);
  };

  const closeWelcome = useCallback(() => {
    if (course) markWelcomeSeen(welcomeKey(user?.id, course.slug));
    setWelcomeOpen(false);
  }, [course, user?.id]);

  if (status === 'loading') {
    return <div className="page-state">Carregando curso...</div>;
  }

  if (status !== 'ready') {
    return (
      <div className="page-state">
        <h1>{status === 'notfound' ? 'Curso não encontrado.' : 'Acesso indisponível'}</h1>
        <p>{errorMessage}</p>
        <Link to="/cursos" className="ghost-button as-link">
          Voltar à biblioteca
        </Link>
      </div>
    );
  }

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div
        className={`dashboard-content course-layout course-page layout-${course.layout || 'caderno'} density-${course.theme?.density || 'confortavel'}`}
        style={courseThemeStyle(course)}
      >
        <section className={`course-hero${course.theme?.bannerUrl ? ' has-banner' : ''}`}>
          {course.theme?.logoUrl && <img className="course-logo" src={course.theme.logoUrl} alt="" />}
          <div className="course-hero-text">
            <span className="eyebrow">{course.level}</span>
            <h1>{course.title}</h1>
            {(course.banner || course.summary) && <p>{course.banner || course.summary}</p>}
          </div>
          <div className="course-hero-actions">
            <button type="button" className="ghost-button small" onClick={() => setWelcomeOpen(true)}>
              Como usar
            </button>
            {course.permissions.canManage && (
              <Link to={`/gestao/cursos/${course.slug}`} className="ghost-button small as-link">
                Gerenciar curso
              </Link>
            )}
          </div>
        </section>

        {course.modules.length === 0 ? (
          <section className="surface-card">
            <p>Este curso ainda não possui seções disponíveis.</p>
          </section>
        ) : (
          <>
            <div className="course-sticky">
              <CourseProgressBar
                summary={
                  layoutMode === 'moderno' && moduleSummary ? moduleSummary
                    : layoutMode === 'moderno' && blockSummaryValue ? blockSummaryValue
                    : summary
                }
                scopeLabel={
                  layoutMode === 'moderno' && activeModule ? 'Progresso do módulo'
                    : layoutMode === 'moderno' && blockId ? 'Progresso do bloco'
                    : 'Progresso do curso'
                }
              />
              <div className="layout-switch" role="group" aria-label="Formato da página do curso">
                <span>Formato:</span>
                <button type="button" className={layoutMode === 'moderno' ? 'is-active' : ''} onClick={() => chooseLayout('moderno')}>Moderno</button>
                <button type="button" className={layoutMode === 'classico' ? 'is-active' : ''} onClick={() => chooseLayout('classico')}>Clássico</button>
              </div>
            </div>

            <div className={`course-shell${outlineCollapsed && showOutline ? ' outline-collapsed' : ''}${showOutline ? '' : ' is-full'}`}>
              {showOutline && (
              <CourseOutline
                items={blockId ? blockTrail : trail}
                completedSet={completedSet}
                activeLessonId={activeLessonId}
                onPick={pickLesson}
                collapsed={outlineCollapsed}
                onToggleCollapsed={() => setOutlineCollapsed((value) => !value)}
              />
              )}

              <div className="course-main">
                {layoutMode === 'classico' ? (
                  blockTrail.map((item) =>
                    item.state.unlocked ? (
                      <ModuleBlock
                        key={item.module.id}
                        module={item.module}
                        open={openModules.has(item.module.id)}
                        onToggleModule={(id) => toggleIn(setOpenModules, id)}
                        openUnits={openUnits}
                        onToggleUnit={(key) => toggleIn(setOpenUnits, key)}
                        openLessons={openLessons}
                        onToggleLesson={(id) => {
                          setActiveLessonId(id);
                          toggleIn(setOpenLessons, id);
                        }}
                        completedSet={completedSet}
                        onComplete={markLesson}
                        onRead={openReading}
                        quizResult={progress.quizResults?.[item.module.id]}
                        onLoadQuiz={loadQuiz}
                        onAnswerQuiz={answerQuiz}
                        onRetryQuiz={retryQuiz}
                      />
                    ) : (
                      <section key={item.module.id} className="surface-card locked-module-note">
                        <strong>{item.number}. {item.module.title}</strong>
                        <p>Bloqueado: conclua o módulo anterior para liberar.</p>
                      </section>
                    )
                  )
                ) : !activeModule && !blockId ? (
                  <div className="course-grid module-grid">
                    {blockCards.map((card) => (
                      <ProgressCard
                        key={card.block.id}
                        accent={card.block.accent}
                        level={card.block.level || 'Bloco'}
                        badge={card.badge}
                        title={card.block.title}
                        description={card.block.description}
                        percentage={card.percentage}
                        footer={card.footer}
                        action={
                          <button
                            type="button"
                            className="text-link module-card-action"
                            disabled={card.locked}
                            onClick={() => navigate(`/cursos/${slug}/modulo/${card.block.id}`)}
                          >
                            {card.locked ? 'Bloqueado' : 'Ver módulo'}
                          </button>
                        }
                      />
                    ))}
                    {course.finalProject.title && (
                      <ProgressCard
                        accent={course.theme?.primary || course.accent}
                        level="Projeto final"
                        badge={progress.finalProjectCompleted ? 'Concluído' : 'Pendente'}
                        title="Projeto Final"
                        description="Front e Back End"
                        percentage={progress.finalProjectCompleted ? 100 : 0}
                        footer="Entrega final"
                        action={
                          <button
                            type="button"
                            className="text-link module-card-action"
                            disabled={progress.finalProjectCompleted}
                            onClick={completeProject}
                          >
                            {progress.finalProjectCompleted ? 'Concluído' : 'Marcar como concluído'}
                          </button>
                        }
                      />
                    )}
                  </div>
                ) : blockId && !block ? (
                  <section className="surface-card">
                    <p>Este bloco não existe neste curso.</p>
                  </section>
                ) : !activeModule ? (
                  <>
                    <div className="module-nav">
                      <button type="button" className="ghost-button" onClick={() => navigate(`/cursos/${slug}`)}>
                        ← Blocos do curso
                      </button>
                    </div>
                    <div className="module-title-row">
                      <p className="block-kicker">{block.level ? `Bloco · ${block.level}` : 'Bloco'}</p>
                      <h2>{block.title}</h2>
                    </div>
                    <div className="course-grid module-grid">
                      {blockTrail.map((item) => (
                        <ModuleCard
                          key={item.module.id}
                          item={item}
                          accent={block.accent}
                          onOpen={() => {
                            if (!item.state.unlocked) return;
                            setActiveModuleId(item.module.id);
                            setActiveUnitKey(null);
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="module-nav">
                      <button type="button" className="ghost-button" onClick={() => { setActiveModuleId(null); setActiveUnitKey(null); }}>
                        ← {blockId ? 'Módulos do bloco' : 'Módulos do curso'}
                      </button>
                    </div>
                    <div className="module-title-row">
                      <p className="block-kicker">Módulo {activeTrailNumber}</p>
                      <h2>{activeModule.title}</h2>
                    </div>

                    {!activeUnit ? (
                      <div className="course-grid module-grid">
                        {unitCards.map((card) => (
                          <ProgressCard
                            key={card.key}
                            accent={course.theme?.primary || course.accent}
                            level="Unidade"
                            badge={getBadgeLabel(card.percentage)}
                            title={card.title}
                            description={card.description}
                            percentage={card.percentage}
                            footer={card.footer}
                            action={
                              <button type="button" className="text-link module-card-action" onClick={() => setActiveUnitKey(card.key)}>
                                Abrir unidade
                              </button>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="module-nav">
                          <button type="button" className="ghost-button" onClick={() => setActiveUnitKey(null)}>
                            ← Unidades do módulo
                          </button>
                        </div>
                        <ModuleBlock
                          module={activeUnit.module}
                          open
                          onToggleModule={() => {}}
                          openUnits={openUnits}
                          onToggleUnit={(key) => toggleIn(setOpenUnits, key)}
                          openLessons={openLessons}
                          onToggleLesson={(id) => {
                            setActiveLessonId(id);
                            toggleIn(setOpenLessons, id);
                          }}
                          completedSet={completedSet}
                          onComplete={markLesson}
                          onRead={openReading}
                          quizResult={progress.quizResults?.[activeModule.id]}
                          onLoadQuiz={loadQuiz}
                          onAnswerQuiz={answerQuiz}
                          onRetryQuiz={retryQuiz}
                        />
                      </>
                    )}
                  </>
                )}

                {course.finalProject.title && layoutMode !== 'moderno' && (
                  <section className="surface-card final-project">
                    <div className="section-heading">
                      <h2>{course.finalProject.title}</h2>
                      <p>{course.finalProject.description}</p>
                    </div>
                    <button type="button" className="primary-button" onClick={completeProject}>
                      {progress.finalProjectCompleted ? 'Projeto marcado como concluído' : 'Marcar projeto como concluído'}
                    </button>
                    {summary.certificateEligible && (
                      <div className="alert success">
                        Requisitos completos. Seu certificado pode ser gerado na área de certificados.
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}

        {readingIndex !== null && entries[readingIndex] && (
          <ReadingMode
            course={course}
            entries={entries}
            index={readingIndex}
            completedSet={completedSet}
            onIndex={(next) => {
              setReadingIndex(next);
              setActiveLessonId(entries[next].lesson.id);
              setOpenLessons((current) => new Set(current).add(entries[next].lesson.id));
            }}
            onComplete={markLesson}
            onClose={closeReading}
          />
        )}

        {welcomeOpen && (
          <WelcomeModal firstName={firstName} courseTitle={course.title} onClose={closeWelcome} />
        )}
      </div>
    </div>
  );
}
