import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LessonBody from '../LessonBody';
import AulaAoVivoCard from './AulaAoVivoCard';
import { courseThemeStyle } from '../../layouts/registry';
import Icon from '../Icon';
import { readingMinutes } from '../../utils/lessonHtml';

// Modo leitura: a aula ocupa a tela inteira, sem a trilha e o restante da página.
// Navegação por Anterior/Próxima (ou setas do teclado); Esc ou "Sair" devolvem à página do curso.
// A unidade é concluída no fim dela (última aula), não aula por aula.
export default function ReadingMode({ course, entries, index, completedSet, onIndex, onCompleteUnit, onClose }) {
  const entry = entries[index];
  const { lesson, moduleTitle, unit } = entry;
  const total = entries.length;
  const next = entries[index + 1];
  const unitEntries = entries.filter((item) => item.moduleId === entry.moduleId && item.unit === entry.unit);
  const unitPosition = unitEntries.findIndex((item) => item.lesson.id === lesson.id) + 1;
  const isUnitEnd = unitPosition === unitEntries.length;
  const unitDone = unitEntries.every((item) => completedSet.has(item.lesson.id));
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(false);
  const minutes = useMemo(() => readingMinutes(lesson.content || ''), [lesson.content]);
  const scrollRef = useRef(null);
  const [read, setRead] = useState(0);

  // Ao trocar de aula, volta ao topo e zera a barra.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setRead(0);
  }, [index]);

  async function concluirUnidade() {
    setBusy(true);
    setErro(false);
    try {
      await onCompleteUnit(entry.moduleId, entry.unit);
    } catch {
      setErro(true);
    } finally {
      setBusy(false);
    }
  }

  const onScroll = (event) => {
    const el = event.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setRead(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < total - 1) onIndex(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [index, total, onIndex, onClose]);

  return createPortal(
    // O portal fica fora do .course-layout: aplicamos o tema do curso aqui, senão cores e variáveis somem.
    <div
      className="reading-mode"
      style={courseThemeStyle(course)}
      role="dialog"
      aria-modal="true"
      aria-label={`Leitura: ${lesson.title}`}
    >
      <div className="reading-progress" aria-hidden="true">
        <span style={{ width: `${read}%` }} />
      </div>

      <header className="reading-top">
        <div className="reading-crumbs">
          <span>{moduleTitle}</span>
          {unit && <span>{unit}</span>}
        </div>
        <span className="reading-count">Aula {index + 1} de {total}</span>
        <button type="button" className="reading-exit" onClick={onClose}>
          <Icon name="close" size={16} />
          <span>Sair da leitura</span>
        </button>
      </header>

      <div className="reading-scroll" ref={scrollRef} onScroll={onScroll}>
        <article key={lesson.id} className="reading-article reading-fade">
          <p className="reading-kicker">{unit || moduleTitle}</p>
          <h1>{lesson.title}</h1>
          <p className="reading-meta">Leitura de cerca de {minutes} min</p>

          {lesson.type === 'video' && lesson.url && (
            <div className="video-wrapper">
              <iframe
                src={lesson.url}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {lesson.type === 'link' && lesson.url && (
            <p>
              <a href={lesson.url} target="_blank" rel="noreferrer" className="text-link">
                Acessar recurso externo
              </a>
            </p>
          )}

          {lesson.type === 'ao_vivo' ? <AulaAoVivoCard lesson={lesson} /> : <LessonBody content={lesson.content} />}

          {next && (
            <div className="reading-next">
              <div>
                <p>Próxima aula</p>
                <strong>{next.lesson.title}</strong>
              </div>
              <button type="button" className="primary-button" onClick={() => onIndex(index + 1)}>
                Continuar <Icon name="chevronRight" size={16} />
              </button>
            </div>
          )}
        </article>
      </div>

      <footer className="reading-bottom">
        <button type="button" className="ghost-button" disabled={index === 0} onClick={() => onIndex(index - 1)}>
          <Icon name="chevronLeft" size={16} /> Anterior
        </button>
        {isUnitEnd ? (
          <button
            type="button"
            className={unitDone ? 'ghost-button done' : 'primary-button'}
            onClick={concluirUnidade}
            disabled={unitDone || busy}
          >
            {unitDone ? 'Unidade concluída' : busy ? 'Salvando...' : 'Concluir unidade'}
          </button>
        ) : (
          <span className="reading-unit-hint">
            {erro
              ? 'Não foi possível concluir agora. Tente de novo.'
              : unitDone
                ? 'Unidade concluída'
                : `Aula ${unitPosition} de ${unitEntries.length} desta unidade`}
          </span>
        )}
        <button type="button" className="ghost-button" disabled={index >= total - 1} onClick={() => onIndex(index + 1)}>
          Próxima <Icon name="chevronRight" size={16} />
        </button>
      </footer>
    </div>,
    document.body
  );
}
