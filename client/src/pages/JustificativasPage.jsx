import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { formatDate } from '../components/presenca/presencaShared';
import '../styles/presenca.css';

// Justificativas de falta (somente administração): aceitar (justificada), abonar ou recusar.
const FILTROS = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aceita', label: 'Aceitas' },
  { value: 'abonada', label: 'Abonadas' },
  { value: 'recusada', label: 'Recusadas' },
  { value: 'todas', label: 'Todas' }
];

const SITUACAO = { pendente: 'Em análise', aceita: 'Aceita', abonada: 'Abonada', recusada: 'Recusada' };

export default function JustificativasPage() {
  const [filtro, setFiltro] = useState('pendente');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async (status = filtro) => {
    setLoading(true);
    try {
      const { data } = await api.get('/presenca/gestao/justificativas', { params: { status } });
      setItems(data.justificativas || []);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filtro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const decidir = async (item, decisao) => {
    setBusy(item.id);
    setFeedback(null);
    try {
      await api.post(`/presenca/gestao/justificativas/${item.id}/decisao`, { decisao });
      const texto = { aceitar: 'aceita', abonar: 'abonada', recusar: 'recusada' }[decisao];
      setFeedback({ type: 'success', text: `Justificativa de ${item.aluno} ${texto}.` });
      await load(filtro);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content presenca-page">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Justificativas de falta</h1>
            <p>Aceitar conta como presença justificada. Abonar conta como presença abonada. Recusar mantém a falta.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="surface-card presenca-justificativas">
          <div className="presenca-filtros" role="tablist">
            {FILTROS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filtro === item.value}
                className={`ghost-button small${filtro === item.value ? ' is-active' : ''}`}
                onClick={() => setFiltro(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="page-state">Carregando justificativas...</div>
          ) : items.length === 0 ? (
            <p className="users-empty">Nenhuma justificativa nesta situação.</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Aula</th>
                    <th>Motivo</th>
                    <th>Situação</th>
                    <th>Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-name">
                        <strong>{item.aluno}</strong>
                        <div>{item.email}</div>
                      </td>
                      <td>{item.turma || item.curso}</td>
                      <td className="nowrap">{formatDate(item.aula.date)}<div>{item.aula.title}</div></td>
                      <td className="presenca-motivo">{item.motivo}</td>
                      <td className="nowrap">{SITUACAO[item.status]}</td>
                      <td>
                        {item.status === 'pendente' ? (
                          <div className="row-actions">
                            <button type="button" className="ghost-button small" disabled={busy === item.id} onClick={() => decidir(item, 'aceitar')}>Aceitar</button>
                            <button type="button" className="ghost-button small" disabled={busy === item.id} onClick={() => decidir(item, 'abonar')}>Abonar</button>
                            <button type="button" className="danger-button small" disabled={busy === item.id} onClick={() => decidir(item, 'recusar')}>Recusar</button>
                          </div>
                        ) : (
                          <span>{item.resposta || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
