import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { exportTable, readSheetFile } from '../utils/sheetExport';
import { formatDate } from '../components/presenca/presencaShared';
import '../styles/presenca-gestao.css';

// Presença (admin e professor), em três passos: escolher curso e aula, marcar a chamada e salvar.
const STATUS = [
  { value: 'presente', short: 'P', label: 'Presente' },
  { value: 'ausente', short: 'A', label: 'Ausente' },
  { value: 'justificado', short: 'J', label: 'Justificada' }
];

const ORIGEM_LABEL = {
  aluno: 'Marcado pelo aluno',
  gestao: 'Marcado pela gestão',
  importacao: 'Importado',
  automatico: 'Falta automática'
};

const EXPORT_COLUMNS = [
  { label: 'identificador', key: 'email' },
  { label: 'data', key: 'date' },
  { label: 'sessao', key: 'sessionTitle' },
  { label: 'aluno', key: 'name' },
  { label: 'status', key: 'status' },
  { label: 'observacao', key: 'note' }
];

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [students, setStudents] = useState([]);
  const [draft, setDraft] = useState({});
  const [newSession, setNewSession] = useState({ date: todayIso(), title: '' });
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [pendentes, setPendentes] = useState(0);

  const session = useMemo(() => sessions.find((item) => item.id === sessionId) || null, [sessions, sessionId]);
  const dirty = useMemo(
    () =>
      students.some(
        (student) =>
          (draft[student.userId]?.status ?? '') !== (student.status ?? '') ||
          (draft[student.userId]?.note ?? '') !== (student.note ?? '')
      ),
    [students, draft]
  );

  useEffect(() => {
    api
      .get('/courses')
      .then(({ data }) => {
        const list = data.courses || [];
        setCourses(list);
        if (list[0]) setCourseId(list[0].id);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
    api
      .get('/presenca/gestao/justificativas', { params: { status: 'pendente' } })
      .then(({ data }) => setPendentes(data.justificativas?.length || 0))
      .catch(() => {});
  }, []);

  const loadSessions = async (id, keepSession = false) => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/courses/${id}/sessions`);
      setSessions(data.sessions || []);
      if (!keepSession) {
        setSessionId('');
        setStudents([]);
      }
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSessions([]);
    setSessionId('');
    setStudents([]);
    setImportResult(null);
    loadSessions(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const openSession = async (id) => {
    setSessionId(id);
    setFeedback(null);
    setFiltroStatus('todos');
    setBusca('');
    try {
      const { data } = await api.get(`/attendance/sessions/${id}/records`);
      setStudents(data.students || []);
      const initial = {};
      (data.students || []).forEach((student) => {
        initial[student.userId] = { status: student.status || '', note: student.note || '' };
      });
      setDraft(initial);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const createSession = async (event) => {
    event.preventDefault();
    if (!newSession.date) return setFeedback({ type: 'error', text: 'Informe a data da aula.' });
    try {
      const { data } = await api.post(`/attendance/courses/${courseId}/sessions`, newSession);
      setNewSession({ date: todayIso(), title: '' });
      await loadSessions(courseId, true);
      await openSession(data.session.id);
      setFeedback({ type: 'success', text: 'Aula criada. Marque a chamada abaixo e salve.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const deleteSession = async (item) => {
    if (!window.confirm(`Excluir a aula de ${formatDate(item.date)}${item.title ? ` (${item.title})` : ''} e todas as presenças dela?`)) return;
    try {
      await api.delete(`/attendance/sessions/${item.id}`);
      if (sessionId === item.id) {
        setSessionId('');
        setStudents([]);
      }
      await loadSessions(courseId, true);
      setFeedback({ type: 'success', text: 'Aula excluída.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const setStatus = (userId, status) => {
    setDraft((current) => ({
      ...current,
      [userId]: { ...current[userId], status: current[userId]?.status === status ? '' : status }
    }));
  };

  const setNote = (userId, note) => {
    setDraft((current) => ({ ...current, [userId]: { ...current[userId], note } }));
  };

  const markAllPresent = () => {
    setDraft((current) => {
      const next = { ...current };
      students.forEach((student) => {
        next[student.userId] = { ...next[student.userId], status: 'presente' };
      });
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const records = students.map((student) => ({
        userId: student.userId,
        status: draft[student.userId]?.status || null,
        note: draft[student.userId]?.note || ''
      }));
      await api.put(`/attendance/sessions/${sessionId}/records`, { records });
      await openSession(sessionId);
      await loadSessions(courseId, true);
      setFeedback({ type: 'success', text: 'Chamada salva.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSaving(false);
    }
  };

  const exportAttendance = async (format) => {
    try {
      const { data } = await api.get(`/attendance/courses/${courseId}/export`);
      if (!data.rows.length) return setFeedback({ type: 'error', text: 'Ainda não há presenças registradas neste curso.' });
      exportTable(data.rows, EXPORT_COLUMNS, format, `presenca-${courses.find((c) => c.id === courseId)?.slug || 'curso'}`);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const importAttendance = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFeedback(null);
    setImportResult(null);
    try {
      const rows = await readSheetFile(file);
      if (!rows.length) return setFeedback({ type: 'error', text: 'A planilha está vazia.' });
      const { data } = await api.post(`/attendance/courses/${courseId}/import`, { rows });
      setImportResult(data);
      await loadSessions(courseId, true);
      if (sessionId) await openSession(sessionId);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const counts = useMemo(() => {
    const base = { presente: 0, ausente: 0, justificado: 0, semRegistro: 0 };
    students.forEach((student) => {
      const status = draft[student.userId]?.status;
      if (status && base[status] !== undefined) base[status] += 1;
      else base.semRegistro += 1;
    });
    return base;
  }, [students, draft]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return students.filter((student) => {
      const status = draft[student.userId]?.status || '';
      if (filtroStatus === 'sem' && status) return false;
      if (filtroStatus !== 'todos' && filtroStatus !== 'sem' && status !== filtroStatus) return false;
      if (termo && !`${student.name} ${student.email}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [students, draft, filtroStatus, busca]);

  const chips = [
    { id: 'todos', label: 'Todos', value: students.length },
    { id: 'presente', label: 'Presentes', value: counts.presente },
    { id: 'ausente', label: 'Ausentes', value: counts.ausente },
    { id: 'justificado', label: 'Justificadas', value: counts.justificado },
    { id: 'sem', label: 'Sem marcação', value: counts.semRegistro }
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content presenca-gestao">
        <section className="presenca-gestao-head">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Presença</h1>
            <p>Escolha o curso e a aula, marque a chamada e salve. Justificativas dos alunos ficam na tela própria.</p>
          </div>
          {pendentes > 0 && (
            <Link className="ghost-button small as-link" to="/gestao/justificativas">
              {pendentes} justificativa(s) para analisar →
            </Link>
          )}
        </section>

        <Feedback feedback={feedback} />

        <section className="presenca-gestao-bar">
          <label>
            <span>Curso</span>
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>
          <div className="presenca-gestao-planilhas">
            <span>Planilhas</span>
            <label className="ghost-button small file-button">
              Importar
              <input type="file" accept=".xlsx,.xls,.csv" onChange={importAttendance} hidden />
            </label>
            <button type="button" className="ghost-button small" onClick={() => exportAttendance('xlsx')} disabled={!courseId}>Exportar planilha</button>
            <button type="button" className="ghost-button small" onClick={() => exportAttendance('csv')} disabled={!courseId}>CSV</button>
          </div>
        </section>

        {importResult && (
          <div className="users-panel report-import-result">
            <strong>Importação concluída:</strong> {importResult.saved} registro(s) salvos, {importResult.sessionsCreated} aula(s) criada(s).
            {importResult.totalErros > 0 && (
              <>
                <p>{importResult.totalErros} linha(s) não importadas:</p>
                <ul>
                  {importResult.errors.slice(0, 20).map((item) => (
                    <li key={`${item.linha}-${item.motivo}`}>Linha {item.linha}: {item.motivo}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="presenca-gestao-grid">
          <aside className="presenca-gestao-aulas">
            <header>
              <h2>1. Aulas</h2>
              <span>{sessions.length} aula(s)</span>
            </header>
            <form className="presenca-nova-aula" onSubmit={createSession}>
              <label>
                <span>Data</span>
                <input type="date" value={newSession.date} onChange={(event) => setNewSession({ ...newSession, date: event.target.value })} />
              </label>
              <label>
                <span>Título (opcional)</span>
                <input type="text" placeholder="Ex.: Aula 3" maxLength={160} value={newSession.title} onChange={(event) => setNewSession({ ...newSession, title: event.target.value })} />
              </label>
              <button type="submit" className="primary-button small">Criar aula</button>
            </form>

            {loading && <p className="muted">Carregando aulas…</p>}
            <ul className="presenca-aulas-lista">
              {sessions.map((item) => (
                <li key={item.id} className={item.id === sessionId ? 'is-active' : ''}>
                  <button type="button" className="presenca-aula-abrir" onClick={() => openSession(item.id)}>
                    <strong>{formatDate(item.date)}{item.title ? ` · ${item.title}` : ''}</strong>
                    <small>{item.registrados} de {item.alunos} marcados · {item.presentes} presentes</small>
                  </button>
                  <button type="button" className="presenca-aula-excluir" onClick={() => deleteSession(item)} aria-label={`Excluir aula de ${formatDate(item.date)}`}>Excluir</button>
                </li>
              ))}
              {!loading && sessions.length === 0 && <li className="presenca-vazio">Nenhuma aula criada neste curso ainda.</li>}
            </ul>
          </aside>

          <section className="presenca-gestao-chamada">
            {!session ? (
              <div className="presenca-vazio-grande">
                <h2>2. Chamada</h2>
                <p>Escolha uma aula ao lado para marcar a chamada.</p>
              </div>
            ) : (
              <>
                <header className="presenca-chamada-head">
                  <div>
                    <h2>2. Chamada · {formatDate(session.date)}{session.title ? ` · ${session.title}` : ''}</h2>
                    <p>Toque em P (presente), A (ausente) ou J (justificada). Toque de novo para limpar.</p>
                  </div>
                  <button type="button" className="ghost-button small" onClick={markAllPresent} disabled={!students.length}>Marcar todos presentes</button>
                </header>

                <div className="presenca-filtros-chamada" role="group" aria-label="Filtrar alunos">
                  {chips.map((chip) => (
                    <button key={chip.id} type="button" className={filtroStatus === chip.id ? 'is-active' : ''} onClick={() => setFiltroStatus(chip.id)}>
                      {chip.label} <strong>{chip.value}</strong>
                    </button>
                  ))}
                  <input type="search" className="presenca-busca" placeholder="Buscar aluno" value={busca} onChange={(event) => setBusca(event.target.value)} aria-label="Buscar aluno" />
                </div>

                <div className="users-table-wrap">
                  <table className="users-table presenca-tabela">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Marcação</th>
                        <th>Presença</th>
                        <th>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((student) => {
                        const current = draft[student.userId]?.status || '';
                        const original = students.find((item) => item.userId === student.userId);
                        return (
                          <tr key={student.userId}>
                            <td className="cell-name">
                              <strong title={student.name}>{student.name}</strong>
                              <div className="muted">{student.email}</div>
                            </td>
                            <td className="presenca-origem">
                              {original?.origem ? ORIGEM_LABEL[original.origem] : <span className="muted">Sem marcação</span>}
                              {original?.tipoJustificativa && <small>{original.tipoJustificativa === 'abonada' ? 'Abonada' : 'Justificada aceita'}</small>}
                            </td>
                            <td>
                              <div className="presenca-segmento" role="group" aria-label={`Presença de ${student.name}`}>
                                {STATUS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    className={current === option.value ? `is-${option.value}` : ''}
                                    aria-pressed={current === option.value}
                                    title={option.label}
                                    onClick={() => setStatus(student.userId, option.value)}
                                  >
                                    {option.short}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                maxLength={300}
                                value={draft[student.userId]?.note ?? ''}
                                aria-label={`Observação de ${student.name}`}
                                placeholder="Opcional"
                                onChange={(event) => setNote(student.userId, event.target.value)}
                                className="presenca-obs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {students.length === 0 && (
                        <tr><td colSpan={4} className="users-empty">Nenhum aluno matriculado neste curso.</td></tr>
                      )}
                      {students.length > 0 && visiveis.length === 0 && (
                        <tr><td colSpan={4} className="users-empty">Nenhum aluno com este filtro.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="presenca-salvar-barra">
                  <span>{dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'}</span>
                  <button type="button" className="primary-button" onClick={save} disabled={saving || !dirty}>
                    {saving ? 'Salvando…' : '3. Salvar chamada'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
