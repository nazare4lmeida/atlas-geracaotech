import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { formatDate, statusLabel, statusTone } from '../components/presenca/presencaShared';
import '../styles/presenca.css';

// Minha presença (aluno): resumo, histórico por aula e envio de justificativa para faltas.
export default function PresencaAlunoPage() {
  const [data, setData] = useState({ aulas: [], resumo: null });
  const [hoje, setHoje] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [justifying, setJustifying] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [historico, hojeRes] = await Promise.all([
        api.get('/presenca/aluno/historico'),
        api.get('/presenca/aluno/hoje')
      ]);
      setData(historico.data);
      setHoje(hojeRes.data);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const marcar = async (sessionId) => {
    setBusy(true);
    setFeedback(null);
    try {
      await api.post('/presenca/aluno/marcar', { sessionId });
      setFeedback({ type: 'success', text: 'Presença registrada com sucesso.' });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const enviarJustificativa = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await api.post(`/presenca/aluno/aulas/${justifying}/justificativa`, { motivo });
      setFeedback({ type: 'success', text: 'Justificativa enviada. A gestão vai analisar.' });
      setJustifying(null);
      setMotivo('');
      await load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const resumo = data.resumo;
  const aulasHoje = hoje?.aulas || [];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content presenca-page">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Minha área</span>
            <h1>Minha presença</h1>
            <p>Marque sua presença no dia da aula, até 23h59. Faltas podem ser justificadas.</p>
          </div>
        </section>

        <section className="surface-card presenca-instrucoes" aria-labelledby="como-marcar">
          <h2 id="como-marcar">Como marcar sua presença</h2>
          <ol>
            <li>No dia da aula, abra esta página. A aula aparece em <strong>Aulas de hoje</strong>.</li>
            <li>Clique em <strong>Marcar presença</strong>. Não precisa de login nem de senha: você já está dentro do Atlas.</li>
            <li>A marcação vale só no dia da aula, até 23h59. Quem não marcar fica com falta.</li>
            <li>Faltou? Envie uma justificativa no histórico abaixo. A gestão analisa.</li>
          </ol>
        </section>

        <Feedback feedback={feedback} />

        {loading ? (
          <div className="page-state">Carregando sua presença...</div>
        ) : (
          <>
            {resumo && (
              <section className="stats-grid presenca-stats">
                <article className="surface-card"><strong>{resumo.percentual ?? '—'}{resumo.percentual !== null && '%'}</strong><span>Presença</span></article>
                <article className="surface-card"><strong>{resumo.presentes}</strong><span>Presentes</span></article>
                <article className="surface-card"><strong>{resumo.justificadas + resumo.abonadas}</strong><span>Justificadas ou abonadas</span></article>
                <article className="surface-card"><strong>{resumo.faltas}</strong><span>Faltas</span></article>
              </section>
            )}

            {aulasHoje.some((aula) => aula.status === null) && (
              <section className="surface-card presenca-today">
                <h2>Aulas de hoje</h2>
                <ul className="presenca-list">
                  {aulasHoje.map((aula) => (
                    <li key={aula.sessionId}>
                      <div>
                        <strong>{aula.title || 'Aula'}</strong>
                        <span>{aula.turma}</span>
                      </div>
                      {aula.status === null ? (
                        <button type="button" className="primary-button small" onClick={() => marcar(aula.sessionId)} disabled={busy}>
                          Marcar presença
                        </button>
                      ) : (
                        <span className={`presenca-badge ${statusTone(aula)}`}>{statusLabel(aula)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!aulasHoje.some((aula) => aula.status === null) && (
              <section className="surface-card presenca-today">
                <h2>Aulas de hoje</h2>
                <p className="users-empty">
                  {aulasHoje.length > 0
                    ? 'Você já marcou presença em todas as aulas de hoje.'
                    : 'Não há aula hoje. A presença é marcada no próprio dia da aula, até 23h59.'}
                </p>
              </section>
            )}

            <section className="surface-card presenca-history">
              <h2>Histórico</h2>
              {data.aulas.length === 0 ? (
                <p className="users-empty">Ainda não há aulas registradas para você.</p>
              ) : (
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Aula</th>
                        <th>Turma</th>
                        <th>Situação</th>
                        <th>Justificativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.aulas.map((aula) => (
                        <tr key={aula.sessionId}>
                          <td className="nowrap">{formatDate(aula.date)}</td>
                          <td>{aula.title || 'Aula'}</td>
                          <td>{aula.turma}</td>
                          <td><span className={`presenca-badge ${statusTone(aula)}`}>{statusLabel(aula)}</span></td>
                          <td>
                            {aula.justificativa ? (
                              <span>
                                {justificativaTexto(aula.justificativa.status)}
                                {aula.resposta && <small className="presenca-resposta"> · {aula.resposta}</small>}
                              </span>
                            ) : aula.status === 'ausente' ? (
                              <button type="button" className="ghost-button small" onClick={() => { setJustifying(aula.sessionId); setMotivo(''); }}>
                                Justificar falta
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {justifying && (
              <section className="surface-card presenca-justify">
                <h2>Justificar falta</h2>
                <form onSubmit={enviarJustificativa} className="manage-form">
                  <label>
                    Motivo da falta
                    <textarea
                      value={motivo}
                      onChange={(event) => setMotivo(event.target.value)}
                      rows={4}
                      maxLength={1000}
                      required
                      minLength={5}
                      placeholder="Descreva o motivo. A gestão vai analisar."
                    />
                  </label>
                  <div className="editor-actions">
                    <button type="submit" className="primary-button small" disabled={busy}>Enviar justificativa</button>
                    <button type="button" className="ghost-button small" onClick={() => setJustifying(null)}>Cancelar</button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function justificativaTexto(status) {
  if (status === 'pendente') return 'Em análise';
  if (status === 'aceita') return 'Aceita';
  if (status === 'abonada') return 'Abonada';
  if (status === 'recusada') return 'Recusada';
  return '';
}
