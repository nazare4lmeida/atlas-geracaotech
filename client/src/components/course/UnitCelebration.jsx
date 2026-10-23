import { createPortal } from 'react-dom';
import { useState } from 'react';
import Icon from '../Icon';
import '../../styles/unidades.css';

// Dicas de estudo. A dica da vez muda conforme a unidade, para não repetir sempre a mesma.
const DICAS = [
  'Explique com suas palavras o que acabou de ler. Quem consegue explicar, aprendeu.',
  'Faça uma pausa de 5 a 10 minutos antes de começar a próxima unidade. A memória agradece.',
  'Anote o que mais chamou sua atenção. Revisar as anotações em uma semana fixa o conteúdo.',
  'Refaça os exemplos do zero, sem olhar. Errar e corrigir é parte do aprendizado.',
  'Use o editor de código para testar as ideias da unidade na prática.',
  'Se algo ficou confuso, volte à aula antes de avançar. Base firme facilita tudo depois.'
];

function escolherDica(chave) {
  const soma = [...chave].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return DICAS[soma % DICAS.length];
}

const FRASES = ['Muito bem!', 'Isso aí, continue assim!', 'Mais um passo concluído!', 'Ótimo ritmo!'];

// Página de parabéns exibida ao concluir uma unidade. Traz progresso, dica e a avaliação da unidade.
export default function UnitCelebration({ unitTitle, courseTitle, done, total, nextTitle, unitKey, onRate, onClose }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [status, setStatus] = useState('idle');
  const percent = total ? Math.round((done / total) * 100) : 0;
  const frase = FRASES[[...unitKey].length % FRASES.length];

  async function enviar() {
    setStatus('saving');
    try {
      await onRate(nota, comentario);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  return createPortal(
    <div className="uc-overlay" role="dialog" aria-modal="true" aria-label={`Unidade concluída: ${unitTitle}`}>
      <div className="uc-panel">
        <p className="uc-kicker">{courseTitle}</p>
        <h2 className="uc-title">{frase}</h2>
        <p className="uc-lead">
          Você concluiu <strong>{unitTitle}</strong>.
        </p>

        <div className="uc-progress" aria-label={`${done} de ${total} unidades concluídas`}>
          <div className="uc-progress-head">
            <span>Seu progresso no curso</span>
            <strong>{done} de {total} unidades</strong>
          </div>
          <div className="uc-progress-track"><span style={{ width: `${percent}%` }} /></div>
        </div>

        <div className="uc-tip">
          <span className="uc-tip-icon" aria-hidden="true"><Icon name="bulb" size={18} /></span>
          <p><strong>Dica para a próxima etapa:</strong> {escolherDica(unitKey)}</p>
        </div>

        {nextTitle && <p className="uc-next">Próximo passo: <strong>{nextTitle}</strong></p>}

        {status !== 'saved' ? (
          <div className="uc-rating">
            <p className="uc-rating-title">Como foi esta unidade?</p>
            <div className="uc-stars" role="radiogroup" aria-label="Nota da unidade">
              {[1, 2, 3, 4, 5].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={nota === valor}
                  aria-label={`${valor} de 5`}
                  className={`uc-star${valor <= nota ? ' is-on' : ''}`}
                  onClick={() => setNota(valor)}
                >
                  <Icon name="star" size={24} />
                </button>
              ))}
            </div>
            {nota > 0 && (
              <>
                <label className="uc-comment">
                  <span>O que podemos melhorar? (opcional)</span>
                  <textarea
                    value={comentario}
                    maxLength={500}
                    rows={3}
                    onChange={(event) => setComentario(event.target.value)}
                    placeholder="Conte o que ajudou ou o que ficou confuso."
                  />
                </label>
                <button type="button" className="primary-button" onClick={enviar} disabled={status === 'saving'}>
                  {status === 'saving' ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </>
            )}
            {status === 'error' && <p className="uc-error" role="alert">Não foi possível enviar agora. Tente de novo.</p>}
            <button type="button" className="uc-skip" onClick={onClose}>Pular e continuar</button>
          </div>
        ) : (
          <div className="uc-thanks">
            <p>Obrigado! Sua avaliação ajuda a deixar o curso melhor.</p>
            <button type="button" className="primary-button" onClick={onClose}>Continuar estudando</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
