import LessonBody from '../LessonBody';

// Uma aula recolhível. O conteúdo só é montado quando a aula está aberta (vídeos não carregam antes disso).
export default function LessonItem({ lesson, open, completed, onToggle, onComplete, onRead }) {
  return (
    <article id={`lesson-${lesson.id}`} className={`lesson-item${open ? ' is-open' : ''}${completed ? ' is-done' : ''}`}>
      <button type="button" className="lesson-item-head" aria-expanded={open} onClick={onToggle}>
        <span className={`lesson-check${completed ? ' on' : ''}`} aria-hidden="true">
          {completed ? '✓' : ''}
        </span>
        <span className="lesson-item-title">{lesson.title}</span>
        <span className="lesson-item-kind">{lesson.type === 'video' ? 'Vídeo' : lesson.type === 'link' ? 'Link' : 'Texto'}</span>
        <span className="lesson-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="lesson-item-body">
          {lesson.type === 'video' && lesson.url && (
            <div className="video-wrapper">
              <iframe
                src={lesson.url}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
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

          <LessonBody content={lesson.content} />

          <div className="lesson-item-foot">
            <button type="button" className="ghost-button small" onClick={onRead}>
              Ler em tela cheia
            </button>
            <button
              type="button"
              className={completed ? 'ghost-button small done' : 'primary-button small'}
              onClick={onComplete}
              disabled={completed}
            >
              {completed ? 'Aula concluída ✓' : 'Marcar como concluída'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
