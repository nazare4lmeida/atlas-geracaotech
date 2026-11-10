import LessonBody from '../LessonBody';
import AulaAoVivoCard from './AulaAoVivoCard';
import EspacoIncorporado from './EspacoIncorporado';

const RUAS_DO_TIPO = { video: 'Vídeo', link: 'Link', ao_vivo: 'Ao vivo', html: 'Texto', page: 'Texto', codice: 'Código', codey: 'Jogo' };

// Uma aula recolhível. O conteúdo só é montado quando a aula está aberta (vídeos não carregam antes disso).
// Não há botão de concluir aula: a conclusão é da unidade inteira (ao final dela). O ✓ mostra o que já foi concluído.
export default function LessonItem({ lesson, open, completed, onToggle, onRead }) {
  return (
    <article id={`lesson-${lesson.id}`} className={`lesson-item${open ? ' is-open' : ''}${completed ? ' is-done' : ''}`}>
      <button type="button" className="lesson-item-head" aria-expanded={open} onClick={onToggle}>
        <span className={`lesson-check${completed ? ' on' : ''}`} aria-hidden="true">
          {completed ? '✓' : ''}
        </span>
        <span className="lesson-item-title">{lesson.title}</span>
        <span className="lesson-item-kind">{RUAS_DO_TIPO[lesson.type] || 'Texto'}</span>
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

          {(lesson.type === 'codice' || lesson.type === 'codey') && <EspacoIncorporado lesson={lesson} />}

          {lesson.type === 'ao_vivo' ? <AulaAoVivoCard lesson={lesson} /> : <LessonBody content={lesson.content} />}

          <div className="lesson-item-foot">
            <button type="button" className="ghost-button small" onClick={onRead}>
              Ler em tela cheia
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
