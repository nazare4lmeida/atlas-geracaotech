import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { exportTable } from '../utils/sheetExport';
import '../styles/reports.css';

// Acessos: log de entradas e falhas. Somente administradores.
export function AccessLogPage() {
  const [events, setEvents] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [filter, setFilter] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;

  const load = async () => {
    try {
      const { data } = await api.get('/reports/logins', { params: { limit: 500 } });
      setEvents(data.events || []);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shown = events.filter((event) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [event.name, event.email, event.identifier, event.reason, event.ip].some((value) => String(value || '').toLowerCase().includes(q));
  });

  const totalPaginas = Math.max(1, Math.ceil(shown.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = shown.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const exportLog = (format) => {
    exportTable(
      shown,
      [
        { label: 'Data', value: (e) => new Date(e.createdAt).toLocaleString('pt-BR') },
        { label: 'Nome', key: 'name' },
        { label: 'E-mail', key: 'email' },
        { label: 'Identificador usado', key: 'identifier' },
        { label: 'Resultado', value: (e) => (e.success ? 'Sucesso' : 'Falha') },
        { label: 'Motivo', key: 'reason' },
        { label: 'IP', key: 'ip' }
      ],
      format,
      'acessos-atlas'
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>Acessos</h1>
          <p>Registro de entradas com sucesso e falhas. O CPF aparece apenas mascarado.</p>
        </section>
        <Feedback feedback={feedback} />
        <div className="users-toolbar">
          <input type="search" placeholder="Filtrar por nome, e-mail, motivo ou IP" value={filter} onChange={(event) => { setFilter(event.target.value); setPagina(1); }} />
          <button type="button" className="ghost-button" onClick={load}>Atualizar</button>
          <button type="button" className="primary-button" onClick={() => exportLog('xlsx')} disabled={!shown.length}>Exportar .xlsx</button>
          <button type="button" className="ghost-button" onClick={() => exportLog('csv')} disabled={!shown.length}>Exportar .csv</button>
        </div>
        <div className="users-panel">
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr><th>Data</th><th>Conta</th><th>Identificador usado</th><th>Resultado</th><th>Motivo</th><th>IP</th></tr>
              </thead>
              <tbody>
                {visiveis.map((event) => (
                  <tr key={event.id}>
                    <td className="nowrap">{new Date(event.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="cell-name"><strong>{event.name || '—'}</strong><div className="muted">{event.email}</div></td>
                    <td className="nowrap">{event.identifier || '—'}</td>
                    <td className="nowrap"><span className={`report-account ${event.success ? 'report-account-ativa' : 'report-account-bloqueada'}`}>{event.success ? 'Sucesso' : 'Falha'}</span></td>
                    <td>{event.reason}</td>
                    <td className="nowrap">{event.ip}</td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="users-empty">Nenhum acesso registrado.</td></tr>}
              </tbody>
            </table>
          </div>
          <nav className="pager" aria-label="Paginação dos acessos">
            <span className="muted">
              {shown.length === 0 ? '0 registros' : `${(paginaAtual - 1) * POR_PAGINA + 1}–${Math.min(paginaAtual * POR_PAGINA, shown.length)} de ${shown.length} registros`}
            </span>
            <div className="pager-controls">
              <button type="button" className="ghost-button small" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual <= 1}>Anterior</button>
              <span>Página {paginaAtual} de {totalPaginas}</span>
              <button type="button" className="ghost-button small" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas}>Próxima</button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
