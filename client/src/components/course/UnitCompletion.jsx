import { useState } from 'react';
import Icon from '../Icon';
import '../../styles/unidades.css';

// Fechamento da unidade: a aluna conclui a unidade inteira de uma vez, ao final dela.
export default function UnitCompletion({ done, onComplete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function concluir() {
    setBusy(true);
    setError('');
    try {
      await onComplete();
    } catch {
      setError('Não foi possível concluir a unidade agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="unit-completion is-done">
        <span className="unit-completion-check" aria-hidden="true"><Icon name="check" size={16} /></span>
        <span>Unidade concluída</span>
      </div>
    );
  }

  return (
    <div className="unit-completion">
      <p>Terminou de estudar esta unidade? Conclua para liberar o próximo passo.</p>
      <button type="button" className="primary-button small" onClick={concluir} disabled={busy}>
        {busy ? 'Salvando...' : 'Concluir unidade'}
      </button>
      {error && <p className="unit-completion-error" role="alert">{error}</p>}
    </div>
  );
}
