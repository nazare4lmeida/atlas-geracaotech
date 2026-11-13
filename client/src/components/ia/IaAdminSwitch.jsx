import { useEffect, useState } from 'react';
import { buscarEstadoIa, definirEstadoIa } from '../../services/ia';
import { Feedback, errorText } from '../manage/shared';

// Interruptor da IA no painel. Desligada, o site segue funcionando normalmente.
export default function IaAdminSwitch() {
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    buscarEstadoIa()
      .then(setEstado)
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }, []);

  async function alternar() {
    setSalvando(true);
    setFeedback(null);
    try {
      const novo = await definirEstadoIa(!estado.ligada);
      setEstado(novo);
      setFeedback({ type: 'success', text: novo.ligada ? 'IA ligada.' : 'IA desligada.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="aparencia-campo ia-admin">
      <h2>Inteligência artificial</h2>
      {!estado ? (
        <p>Carregando…</p>
      ) : (
        <>
          <p>
            Status: <strong>{estado.ligada ? 'ligada' : 'desligada'}</strong>
            {' · '}
            {estado.configurada ? `provedor ${estado.provedor}` : `não configurada (${estado.motivo || 'verifique o .env'})`}
          </p>
          <p>Tutor nas aulas: {estado.modulos?.tutor ? 'disponível' : 'indisponível'}</p>
          <button
            type="button"
            className={estado.ligada ? 'ghost-button' : 'primary-button'}
            onClick={alternar}
            disabled={salvando || !estado.configurada}
          >
            {estado.ligada ? 'Desligar IA' : 'Ligar IA'}
          </button>
        </>
      )}
      <Feedback feedback={feedback} />
    </section>
  );
}
