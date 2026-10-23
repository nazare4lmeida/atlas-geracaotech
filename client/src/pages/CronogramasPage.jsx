import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import CalendarioAulas from '../components/presenca/CalendarioAulas';
import '../styles/cronograma.css';

// Cronogramas do aluno: aulas das turmas em que está matriculado, com a presença dele em cada aula.
const STATUS_TEXT = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificada',
  nulo: 'Sem registro'
};

function situacaoDaAula(aula) {
  if (aula.status === 'justificado') return aula.tipoJustificativa === 'abonada' ? 'Abonada' : 'Justificada';
  if (aula.status) return STATUS_TEXT[aula.status];
  return aula.situacao === 'realizada' ? 'Sem registro' : 'Ainda não aconteceu';
}

export default function CronogramasPage() {
  const [aulas, setAulas] = useState([]);
  const [hoje, setHoje] = useState('');
  const [curso, setCurso] = useState('');
  const [aba, setAba] = useState('calendario');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/presenca/aluno/cronograma')
      .then(({ data }) => {
        setAulas(data.aulas);
        setHoje(data.hoje);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  }, []);

  const cursos = useMemo(() => [...new Set(aulas.map((a) => a.curso))].sort(), [aulas]);
  const visiveis = useMemo(() => (curso ? aulas.filter((a) => a.curso === curso) : aulas), [aulas, curso]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content cron-aluno">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Aluno</span>
            <h1>Cronogramas</h1>
            <p>As aulas das turmas em que você está matriculado, com a sua presença em cada uma.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        {!loading && cursos.length > 1 && (
          <section className="cron-barra">
            <label>
              <span>Curso</span>
              <select value={curso} onChange={(e) => setCurso(e.target.value)}>
                <option value="">Todos os meus cursos</option>
                {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </section>
        )}

        {loading && <div className="page-state">Carregando seu cronograma…</div>}

        {!loading && aulas.length === 0 && (
          <section className="cron-vazio surface-card">
            <strong>Nenhum cronograma por enquanto</strong>
            <p className="muted">Quando você estiver matriculado em uma turma com aulas programadas, o cronograma aparece aqui.</p>
          </section>
        )}

        {!loading && aulas.length > 0 && (
          <>
            <div className="cron-abas" role="tablist">
              <button type="button" role="tab" aria-selected={aba === 'calendario'} className={aba === 'calendario' ? 'is-active' : ''} onClick={() => setAba('calendario')}>Calendário</button>
              <button type="button" role="tab" aria-selected={aba === 'lista'} className={aba === 'lista' ? 'is-active' : ''} onClick={() => setAba('lista')}>Lista de aulas</button>
            </div>

            {aba === 'calendario' ? (
              <CalendarioAulas
                aulas={visiveis}
                hoje={hoje}
                renderChip={(aula, lista) => (
                  <>
                    {lista ? null : <small>{aula.horario}</small>}
                    {lista ? `${aula.titulo || 'Aula'} · ${situacaoDaAula(aula)}` : aula.titulo || 'Aula'}
                  </>
                )}
              />
            ) : (
              <section className="cron-tabela-box">
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Data</th><th>Horário</th><th>Curso e turma</th><th>Módulo</th><th>Título</th><th>Professor</th><th>Situação</th><th>Minha presença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((a) => (
                        <tr key={a.sessionId}>
                          <td className="nowrap">{a.date.slice(8)}/{a.date.slice(5, 7)}/{a.date.slice(0, 4)}</td>
                          <td className="nowrap">{a.horario || '—'}</td>
                          <td><strong>{a.curso}</strong><div className="muted">{a.turma}</div></td>
                          <td>{a.modulo || '—'}</td>
                          <td className="cell-name">{a.titulo || 'Aula'}</td>
                          <td>{a.professor || '—'}</td>
                          <td className="nowrap"><span className={`cron-status is-${a.situacao}`}>{a.situacao === 'realizada' ? 'Realizada' : 'Prevista'}</span></td>
                          <td className="nowrap">{situacaoDaAula(a)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
