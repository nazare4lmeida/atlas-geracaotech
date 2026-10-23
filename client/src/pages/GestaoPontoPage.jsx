import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { formatarMinutos, hora, dataBr, mesAtual } from '../utils/ponto';
import '../styles/docente.css';

// Ponto dos professores (administração). Só visualização e exportação para a coordenação.
// Os registros são feitos pelo próprio professor; a gestão não altera horários aqui.
export default function GestaoPontoPage() {
  const [periodo, setPeriodo] = useState(() => mesAtual());
  const [professorId, setProfessorId] = useState('');
  const [professores, setProfessores] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  function carregar() {
    setLoading(true);
    return api
      .get('/docente/gestao/ponto', { params: { de: periodo.de, ate: periodo.ate, professorId: professorId || undefined } })
      .then(({ data }) => {
        setRegistros(data.registros);
        setProfessores(data.professores);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.de, periodo.ate, professorId]);

  const totalMinutos = registros.reduce((soma, r) => soma + (r.minutos || 0), 0);

  // Total de cada professor no período (o que a coordenação confere para a folha).
  const totaisPorProfessor = useMemo(() => {
    const mapa = new Map();
    for (const r of registros) {
      if (r.minutos === null || r.minutos === undefined) continue;
      mapa.set(r.professor, (mapa.get(r.professor) || 0) + r.minutos);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [registros]);

  async function exportar() {
    setExportando(true);
    setFeedback(null);
    try {
      const { data } = await api.get('/docente/gestao/ponto/exportar', {
        params: { de: periodo.de, ate: periodo.ate, professorId: professorId || undefined },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `ponto-professores-${periodo.de}-a-${periodo.ate}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content docente-ponto">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Ponto dos professores</h1>
            <p>Acompanhe as entradas e saídas, inclusive aulas extras, e exporte o período para a coordenação.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="surface-card docente-bloco">
          <header className="docente-bloco-cabecalho">
            <div className="docente-periodo">
              <label>
                <span>Professor</span>
                <select value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
                  <option value="">Todos</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>De</span>
                <input type="date" value={periodo.de} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
              </label>
              <label>
                <span>Até</span>
                <input type="date" value={periodo.ate} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} />
              </label>
            </div>
            <div className="docente-acoes">
              <span className="muted">Total no período: <strong>{formatarMinutos(totalMinutos)}</strong></span>
              <button type="button" className="primary-button small" onClick={exportar} disabled={exportando || loading}>
                {exportando ? 'Exportando…' : 'Exportar CSV'}
              </button>
            </div>
          </header>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Professor</th><th>Data</th><th>Tipo</th><th>Turma / título</th><th>Entrada</th><th>Saída</th><th>Duração</th><th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-name"><strong>{r.professor}</strong></td>
                    <td className="nowrap">{dataBr(r.data)}</td>
                    <td className="nowrap">{r.tipo === 'extra' ? 'Extra' : 'Aula'}</td>
                    <td>{r.tipo === 'extra' ? `${r.titulo || 'Aula extra'}${r.turma ? ` · ${r.turma}` : ''}` : r.turma || '—'}</td>
                    <td className="nowrap">{hora(r.entrada)}</td>
                    <td className="nowrap">{r.saida ? hora(r.saida) : <span className="docente-aberto">aberto</span>}</td>
                    <td className="nowrap">{r.minutos !== null ? formatarMinutos(r.minutos) : '—'}</td>
                    <td>
                      {r.observacao || '—'}
                      {r.corrigido && <small className="docente-origem"> · corrigido pela gestão</small>}
                    </td>
                  </tr>
                ))}
                {!loading && registros.length === 0 && (
                  <tr><td colSpan={8} className="users-empty">Nenhum registro de ponto neste período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totaisPorProfessor.length > 0 && (
          <section className="surface-card docente-bloco">
            <header className="docente-bloco-cabecalho">
              <h2>Total por professor</h2>
            </header>
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr><th>Professor</th><th>Duração no período</th></tr>
                </thead>
                <tbody>
                  {totaisPorProfessor.map(([nome, minutos]) => (
                    <tr key={nome}>
                      <td className="cell-name"><strong>{nome}</strong></td>
                      <td className="nowrap">{formatarMinutos(minutos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
