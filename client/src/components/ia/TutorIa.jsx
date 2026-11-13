import { useEffect, useState } from 'react';
import { buscarEstadoIa, perguntarTutor } from '../../services/ia';
import { errorText } from '../manage/shared';

// Só aparece quando a IA está ligada e configurada, e o módulo tutor está ativo.
export default function TutorIa({ lesson }) {
  const [disponivel, setDisponivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    buscarEstadoIa()
      .then((estado) => ativo && setDisponivel(Boolean(estado?.modulos?.tutor)))
      .catch(() => ativo && setDisponivel(false));
    return () => {
      ativo = false;
    };
  }, []);

  if (!disponivel) return null;

  async function enviar(evento) {
    evento.preventDefault();
    if (!pergunta.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      setResposta(await perguntarTutor({ pergunta: pergunta.trim(), aulaId: lesson.id }));
    } catch (error) {
      setResposta('');
      setErro(errorText(error, 'O assistente não respondeu agora. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <div className="tutor-ia">
        <button type="button" className="ghost-button small" onClick={() => setAberto(true)}>
          Tirar dúvida com o assistente
        </button>
      </div>
    );
  }

  return (
    <div className="tutor-ia is-open">
      <form onSubmit={enviar}>
        <label htmlFor={`tutor-ia-${lesson?.id}`}>Sua dúvida sobre esta aula</label>
        <textarea
          id={`tutor-ia-${lesson?.id}`}
          rows={3}
          maxLength={2000}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
        />
        <div className="tutor-ia-acoes">
          <button type="submit" className="primary-button small" disabled={enviando || !pergunta.trim()}>
            {enviando ? 'Pensando…' : 'Perguntar'}
          </button>
          <button type="button" className="ghost-button small" onClick={() => setAberto(false)}>
            Fechar
          </button>
        </div>
      </form>
      {erro && <div className="alert error manage-feedback" role="status">{erro}</div>}
      {resposta && <div className="tutor-ia-resposta">{resposta}</div>}
    </div>
  );
}
