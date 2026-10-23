import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { errorText } from '../manage/shared';
import Icon from '../Icon';
import { formatDate, readSession, writeSession } from './presencaShared';

// Pop-up de presença do aluno. Abre ao entrar no Atlas, com as aulas de hoje ainda sem marcação.
// Depois de salvar, mostra a confirmação e pergunta se o aluno quer ver o histórico.
// Aparece uma vez por sessão do navegador (o aluno pode marcar depois pelo menu "Minha presença").
const SEEN_KEY = 'atlas-presenca-popup-visto';

export default function PresencaPopup() {
  const [aulas, setAulas] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (readSession(SEEN_KEY)) return;
    let active = true;
    api
      .get('/presenca/aluno/hoje')
      .then(({ data }) => {
        if (!active) return;
        const pendentes = data.aulas.filter((aula) => aula.status === null);
        if (pendentes.length > 0) {
          setAulas(pendentes);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const close = () => {
    writeSession(SEEN_KEY, '1');
    setOpen(false);
  };

  const marcar = async (aula) => {
    setSaving(aula.sessionId);
    setError('');
    try {
      await api.post('/presenca/aluno/marcar', { sessionId: aula.sessionId });
      const restantes = aulas.filter((item) => item.sessionId !== aula.sessionId);
      setAulas(restantes);
      setDone(true);
      if (restantes.length === 0) writeSession(SEEN_KEY, '1');
    } catch (err) {
      setError(errorText(err, 'Não foi possível registrar a presença.'));
    } finally {
      setSaving(null);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop presenca-backdrop" role="dialog" aria-modal="true" aria-labelledby="presenca-popup-title">
      <div className="modal-card presenca-popup">
        <div className="presenca-popup-head">
          <h2 id="presenca-popup-title">{done ? 'Presença registrada' : 'Marque sua presença'}</h2>
          <button type="button" className="icon-button" onClick={close} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>

        {done ? (
          <>
            <p className="presenca-popup-text">
              Sua presença foi salva com sucesso.
              {aulas.length > 0 && ' Ainda há aulas de hoje para marcar.'}
            </p>
            <p className="presenca-popup-text">Deseja ver seu histórico de presença?</p>
            <div className="presenca-popup-actions">
              <Link to="/presenca" className="primary-button small" onClick={close}>
                Ver histórico
              </Link>
              {aulas.length > 0 ? (
                <button type="button" className="ghost-button small" onClick={() => setDone(false)}>
                  Marcar outra aula
                </button>
              ) : (
                <button type="button" className="ghost-button small" onClick={close}>
                  Agora não
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="presenca-popup-text">
              Você tem aula hoje. Marque sua presença até 23h59 do dia da aula.
            </p>
            <ul className="presenca-popup-list">
              {aulas.map((aula) => (
                <li key={aula.sessionId}>
                  <div>
                    <strong>{aula.title || 'Aula'}</strong>
                    <span>{aula.turma} · {formatDate(aula.date)}</span>
                  </div>
                  <button
                    type="button"
                    className="primary-button small"
                    onClick={() => marcar(aula)}
                    disabled={saving !== null}
                  >
                    {saving === aula.sessionId ? 'Salvando...' : 'Marcar presença'}
                  </button>
                </li>
              ))}
            </ul>
            {error && <div className="alert error">{error}</div>}
            <div className="presenca-popup-actions">
              <button type="button" className="ghost-button small" onClick={close}>
                Marcar depois
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
