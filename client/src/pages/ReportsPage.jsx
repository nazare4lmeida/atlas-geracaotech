import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Feedback, errorText } from '../components/manage/shared';
import UserEditDialog from '../components/users/UserEditDialog';
import { exportTable } from '../utils/sheetExport';
import '../styles/acompanhamento.css';

// Acompanhamento da gestão (somente admin): uma linha por aluno e curso, com filtros, ordenação,
// exportação e ações de conta. Os dados vêm do servidor a cada abertura e no botão "Atualizar".

const EMPTY = {
  q: '',
  courseId: '',
  status: '',
  percentMin: '',
  percentMax: '',
  presenceMin: '',
  quizMin: '',
  project: '',
  account: '',
  certificate: '',
  enrolledFrom: '',
  enrolledTo: '',
  login: ''
};

const STATUS_LABELS = { concluido: 'Concluído', em_andamento: 'Em andamento', nao_iniciado: 'Não iniciado' };

const COLUMNS = [
  { key: 'name', label: 'Aluno', sort: (r) => r.name.toLowerCase() },
  { key: 'courseTitle', label: 'Curso', sort: (r) => r.courseTitle.toLowerCase() },
  { key: 'status', label: 'Situação' },
  { key: 'percentage', label: 'Progresso', sort: (r) => r.percentage },
  { key: 'quizAverage', label: 'Média provas', sort: (r) => r.quizAverage ?? -1 },
  { key: 'projectGrade', label: 'Nota projeto', sort: (r) => r.projectGrade ?? -1 },
  { key: 'presencePercent', label: 'Presença', sort: (r) => r.presencePercent ?? -1 },
  { key: 'certificate', label: 'Certificado' },
  { key: 'lastLoginAt', label: 'Último acesso', sort: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).getTime() : 0) },
  { key: 'account', label: 'Conta', sort: (r) => accountLabel(r) }
];

const EXPORT_COLUMNS = [
  { label: 'Aluno', key: 'name' },
  { label: 'E-mail', key: 'email' },
  { label: 'CPF', key: 'cpfMasked' },
  { label: 'Curso', key: 'courseTitle' },
  { label: 'Situação', value: (r) => STATUS_LABELS[r.status] },
  { label: 'Progresso (%)', key: 'percentage' },
  { label: 'Aulas concluídas', value: (r) => `${r.completedLessons}/${r.totalLessons}` },
  { label: 'Provas aprovadas', value: (r) => `${r.passedQuizzes}/${r.totalQuizzes}` },
  { label: 'Média provas (%)', key: 'quizAverage' },
  { label: 'Projeto final concluído', value: (r) => (r.finalProjectDone ? 'Sim' : 'Não') },
  { label: 'Nota do projeto', key: 'projectGrade' },
  { label: 'Presença (%)', key: 'presencePercent' },
  { label: 'Sessões de aula', key: 'presenceSessions' },
  { label: 'Certificado', value: (r) => r.certificate || '' },
  { label: 'Conta', value: (r) => accountLabel(r) },
  { label: 'Último acesso', value: (r) => formatDate(r.lastLoginAt) },
  { label: 'Matriculado em', value: (r) => formatDate(r.enrolledAt) }
];

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR');
}

function accountLabel(row) {
  if (!row.accountActive) return 'Desativada';
  if (row.locked) return 'Bloqueada';
  return 'Ativa';
}

function num(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function matches(row, f) {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const textHit = row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
    // Busca por CPF usa os dois últimos dígitos (o CPF completo nunca aparece na tela).
    const cpfHit = /^\d{2}$/.test(q) && row.cpfMasked.endsWith(q);
    if (!textHit && !cpfHit) return false;
  }
  if (f.courseId && row.courseId !== f.courseId) return false;
  if (f.status && row.status !== f.status) return false;
  if (num(f.percentMin) !== null && row.percentage < num(f.percentMin)) return false;
  if (num(f.percentMax) !== null && row.percentage > num(f.percentMax)) return false;
  if (num(f.presenceMin) !== null && (row.presencePercent === null || row.presencePercent < num(f.presenceMin))) return false;
  if (num(f.quizMin) !== null && (row.quizAverage === null || row.quizAverage < num(f.quizMin))) return false;
  if (f.project === 'entregue' && row.projectDeliveries === 0) return false;
  if (f.project === 'pendente' && row.projectDeliveries > 0) return false;
  if (f.account === 'ativa' && accountLabel(row) !== 'Ativa') return false;
  if (f.account === 'bloqueada' && !row.locked) return false;
  if (f.account === 'desativada' && row.accountActive) return false;
  if (f.certificate === 'com' && !row.certificate) return false;
  if (f.certificate === 'sem' && row.certificate) return false;
  if (f.enrolledFrom && row.enrolledAt && row.enrolledAt.slice(0, 10) < f.enrolledFrom) return false;
  if (f.enrolledTo && row.enrolledAt && row.enrolledAt.slice(0, 10) > f.enrolledTo) return false;
  if (f.login === 'nunca' && row.lastLoginAt) return false;
  if (f.login === 'com' && !row.lastLoginAt) return false;
  return true;
}

// Atalhos com as perguntas mais comuns da gestão. Cada um liga um conjunto de filtros.
const ATALHOS = [
  { id: 'sem-certificado', label: 'Concluídos sem certificado', hint: 'Podem receber o certificado', filtro: { status: 'concluido', certificate: 'sem' } },
  { id: 'abaixo-50', label: 'Progresso abaixo de 50%', hint: 'Precisam de acompanhamento', filtro: { percentMax: '49' } },
  { id: 'nunca-acessou', label: 'Nunca acessaram', hint: 'Matriculados que não entraram', filtro: { login: 'nunca' } },
  { id: 'bloqueadas', label: 'Contas bloqueadas', hint: 'Bloqueadas por tentativas de senha', filtro: { account: 'bloqueada' } }
];

const FILTRO_NOMES = {
  q: 'Busca',
  courseId: 'Curso',
  status: 'Situação',
  percentMin: 'Progresso mín.',
  percentMax: 'Progresso máx.',
  presenceMin: 'Presença mín.',
  quizMin: 'Média de provas mín.',
  project: 'Projeto',
  account: 'Conta',
  certificate: 'Certificado',
  enrolledFrom: 'Matriculado de',
  enrolledTo: 'Matriculado até',
  login: 'Último acesso'
};

function valorLegivel(key, value, courses) {
  if (key === 'courseId') return courses.find((c) => c.id === value)?.title || value;
  if (key === 'status') return STATUS_LABELS[value] || value;
  if (key === 'percentMin' || key === 'percentMax' || key === 'presenceMin' || key === 'quizMin') return `${value}%`;
  if (key === 'project') return value === 'entregue' ? 'Entregue' : 'Não entregue';
  if (key === 'certificate') return value === 'com' ? 'Emitido' : 'Não emitido';
  if (key === 'account') return { ativa: 'Ativa', bloqueada: 'Bloqueada', desativada: 'Desativada' }[value] || value;
  if (key === 'login') return value === 'com' ? 'Já acessou' : 'Nunca acessou';
  return value;
}

export default function ReportsPage() {
  const [report, setReport] = useState({ rows: [], courses: [], generatedAt: null });
  const [filters, setFilters] = useState(EMPTY);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [atalho, setAtalho] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const { user: me } = useAuth();

  useEffect(() => {
    api.get('/courses').then(({ data }) => setAllCourses(data.courses || [])).catch(() => setAllCourses([]));
  }, []);

  // Abre o mesmo diálogo de edição da tela de Usuários, com os dados atuais da conta.
  const openEdit = async (row) => {
    setBusyId(`${row.userId}:edit`);
    setFeedback(null);
    try {
      const { data } = await api.get('/users', { params: { q: row.email, pageSize: 10 } });
      const found = data.users.find((item) => item.id === row.userId);
      if (!found) throw new Error('Conta não encontrada. Atualize os dados e tente de novo.');
      setEditingUser(found);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusyId(null);
    }
  };

  // Remove só a matrícula neste curso. A conta e o progresso ficam preservados.
  const removeEnrolment = async (row) => {
    if (!window.confirm(`Remover ${row.name} do curso "${row.courseTitle}"? A conta e o progresso dele são mantidos; os grupos desse curso também são desfeitos.`)) return;
    setBusyId(`${row.userId}:remove`);
    setFeedback(null);
    try {
      await api.delete(`/courses/${row.courseSlug}/participants/${row.userId}`);
      setFeedback({ type: 'success', text: `${row.name} foi removido de ${row.courseTitle}.` });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const { data } = await api.get('/reports/enrollments');
      setReport(data);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => report.rows.filter((row) => matches(row, filters)), [report.rows, filters]);

  const sorted = useMemo(() => {
    const column = COLUMNS.find((item) => item.key === sort.key);
    const getter = column?.sort || ((row) => String(row[sort.key] ?? ''));
    const list = [...filtered].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return sort.dir === 'asc' ? list : list.reverse();
  }, [filtered, sort]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const done = filtered.filter((row) => row.status === 'concluido').length;
    const progressing = filtered.filter((row) => row.status === 'em_andamento').length;
    const notStarted = filtered.filter((row) => row.status === 'nao_iniciado').length;
    const average = total ? Math.round(filtered.reduce((sum, row) => sum + row.percentage, 0) / total) : 0;
    const locked = filtered.filter((row) => row.locked).length;
    return { total, done, progressing, notStarted, average, locked };
  }, [filtered]);

  // Filtros ativos, em forma de etiquetas que podem ser removidas uma a uma.
  const ativos = useMemo(
    () =>
      Object.entries(filters)
        .filter(([key, value]) => value !== '' && value !== null && value !== undefined && FILTRO_NOMES[key])
        .map(([key, value]) => ({ key, label: FILTRO_NOMES[key], value: valorLegivel(key, value, report.courses) })),
    [filters, report.courses]
  );

  const setFilter = (key, value) => {
    setAtalho(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (key) => {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const runAccountAction = async (row, action) => {
    const question =
      action === 'reset'
        ? `Devolver ${row.name} ao primeiro acesso? O login e a senha provisória passam a ser o CPF, e a troca de senha será obrigatória.`
        : `Desbloquear a conta de ${row.name}?`;
    if (!window.confirm(question)) return;
    setBusyId(`${row.userId}:${action}`);
    setFeedback(null);
    try {
      const path = action === 'reset' ? 'reset-first-access' : 'unlock';
      const { data } = await api.post(`/accounts/${row.userId}/${path}`);
      setFeedback({ type: 'success', text: data.message });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusyId(null);
    }
  };

  const exportRows = (format) => {
    exportTable(sorted, EXPORT_COLUMNS, format, 'acompanhamento-alunos');
  };

  const limpar = () => {
    setAtalho(null);
    setFilters(EMPTY);
  };

  const aplicarAtalho = (item) => {
    setAtalho(item.id);
    setFilters({ ...EMPTY, ...item.filtro });
  };

  const sortMark = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content acompanhamento">
        <section className="acompanhamento-head">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Acompanhamento dos alunos</h1>
            <p>Cada linha é um aluno em um curso. Use os atalhos ou os filtros ao lado para achar grupos, como quem está abaixo de 50%.</p>
          </div>
          <div className="acompanhamento-acoes">
            <span className="muted">{report.generatedAt ? `Atualizado às ${new Date(report.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
            <button type="button" className="ghost-button small" onClick={load} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar dados'}</button>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="acompanhamento-resumo" aria-label="Resumo do que está filtrado">
          <div><strong>{summary.total}</strong><span>registros</span></div>
          <div><strong>{summary.done}</strong><span>concluídos</span></div>
          <div><strong>{summary.progressing}</strong><span>em andamento</span></div>
          <div><strong>{summary.notStarted}</strong><span>não iniciados</span></div>
          <div><strong>{summary.average}%</strong><span>progresso médio</span></div>
          <div><strong>{summary.locked}</strong><span>contas bloqueadas</span></div>
        </section>

        <div className="acompanhamento-corpo">
          <aside className="acompanhamento-filtros" aria-label="Filtros">
            <div className="acompanhamento-bloco">
              <h2>Atalhos</h2>
              <div className="acompanhamento-atalhos">
                {ATALHOS.map((item) => (
                  <button key={item.id} type="button" className={atalho === item.id ? 'is-active' : ''} onClick={() => aplicarAtalho(item)}>
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="acompanhamento-bloco">
              <h2>Buscar</h2>
              <label className="acompanhamento-campo">
                <span>Nome, e-mail ou os 2 últimos dígitos do CPF</span>
                <input type="search" placeholder="Ex.: Maria ou 25" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} />
              </label>
            </div>

            <div className="acompanhamento-bloco">
              <h2>Trilha e progresso</h2>
              <label className="acompanhamento-campo">
                <span>Curso</span>
                <select value={filters.courseId} onChange={(event) => setFilter('courseId', event.target.value)}>
                  <option value="">Todos os cursos</option>
                  {report.courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </label>
              <label className="acompanhamento-campo">
                <span>Situação no curso</span>
                <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                  <option value="">Qualquer</option>
                  <option value="concluido">Concluído</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="nao_iniciado">Não iniciado</option>
                </select>
              </label>
              <div className="acompanhamento-par">
                <label className="acompanhamento-campo">
                  <span>Progresso mín. (%)</span>
                  <input type="number" min="0" max="100" value={filters.percentMin} onChange={(event) => setFilter('percentMin', event.target.value)} />
                </label>
                <label className="acompanhamento-campo">
                  <span>Progresso máx. (%)</span>
                  <input type="number" min="0" max="100" value={filters.percentMax} onChange={(event) => setFilter('percentMax', event.target.value)} />
                </label>
              </div>
              <p className="acompanhamento-ajuda">Progresso é a parte das aulas, provas e projeto já concluída.</p>
            </div>

            <div className="acompanhamento-bloco">
              <h2>Desempenho</h2>
              <div className="acompanhamento-par">
                <label className="acompanhamento-campo">
                  <span>Presença mín. (%)</span>
                  <input type="number" min="0" max="100" value={filters.presenceMin} onChange={(event) => setFilter('presenceMin', event.target.value)} />
                </label>
                <label className="acompanhamento-campo">
                  <span>Média de provas mín. (%)</span>
                  <input type="number" min="0" max="100" value={filters.quizMin} onChange={(event) => setFilter('quizMin', event.target.value)} />
                </label>
              </div>
              <label className="acompanhamento-campo">
                <span>Projeto final</span>
                <select value={filters.project} onChange={(event) => setFilter('project', event.target.value)}>
                  <option value="">Qualquer</option>
                  <option value="entregue">Entregue</option>
                  <option value="pendente">Não entregue</option>
                </select>
              </label>
              <label className="acompanhamento-campo">
                <span>Certificado</span>
                <select value={filters.certificate} onChange={(event) => setFilter('certificate', event.target.value)}>
                  <option value="">Qualquer</option>
                  <option value="com">Emitido</option>
                  <option value="sem">Não emitido</option>
                </select>
              </label>
            </div>

            <div className="acompanhamento-bloco">
              <h2>Conta e acesso</h2>
              <label className="acompanhamento-campo">
                <span>Situação da conta</span>
                <select value={filters.account} onChange={(event) => setFilter('account', event.target.value)}>
                  <option value="">Qualquer</option>
                  <option value="ativa">Ativa</option>
                  <option value="bloqueada">Bloqueada por senha errada</option>
                  <option value="desativada">Desativada</option>
                </select>
              </label>
              <label className="acompanhamento-campo">
                <span>Já entrou no Atlas?</span>
                <select value={filters.login} onChange={(event) => setFilter('login', event.target.value)}>
                  <option value="">Qualquer</option>
                  <option value="com">Já entrou</option>
                  <option value="nunca">Nunca entrou</option>
                </select>
              </label>
            </div>

            <div className="acompanhamento-bloco">
              <h2>Matrícula</h2>
              <div className="acompanhamento-par">
                <label className="acompanhamento-campo">
                  <span>De</span>
                  <input type="date" value={filters.enrolledFrom} onChange={(event) => setFilter('enrolledFrom', event.target.value)} />
                </label>
                <label className="acompanhamento-campo">
                  <span>Até</span>
                  <input type="date" value={filters.enrolledTo} onChange={(event) => setFilter('enrolledTo', event.target.value)} />
                </label>
              </div>
            </div>

            <button type="button" className="ghost-button small acompanhamento-limpar" onClick={limpar}>Limpar todos os filtros</button>
          </aside>

          <section className="acompanhamento-tabela">
            <div className="acompanhamento-barra">
              <div className="acompanhamento-ativos">
                {ativos.length === 0 ? (
                  <span className="muted">Sem filtros: mostrando todos os registros.</span>
                ) : (
                  ativos.map((item) => (
                    <button key={item.key} type="button" className="acompanhamento-chip" onClick={() => setFilter(item.key, '')} title="Remover este filtro">
                      {item.label}: <strong>{item.value}</strong> ×
                    </button>
                  ))
                )}
              </div>
              <div className="acompanhamento-exportar">
                <span>{sorted.length} de {report.rows.length} registros</span>
                <button type="button" className="primary-button small" onClick={() => exportRows('xlsx')} disabled={!sorted.length}>Exportar planilha</button>
                <button type="button" className="ghost-button small" onClick={() => exportRows('csv')} disabled={!sorted.length}>CSV</button>
              </div>
            </div>

            <div className="users-table-wrap">
              <table className="users-table acompanhamento-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} aria-sort={sort.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className="report-sort" onClick={() => toggleSort(column.key)}>
                          {column.label}{sortMark(column.key)}
                        </button>
                      </th>
                    ))}
                    <th>Conta</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const rowKey = `${row.userId}:${row.courseId}`;
                    return (
                      <tr key={rowKey}>
                        <td className="cell-name">
                          <strong title={row.name}>{row.name}</strong>
                          <div className="muted" title={row.email}>{row.email}</div>
                        </td>
                        <td className="cell-name"><span title={row.courseTitle}>{row.courseTitle}</span></td>
                        <td className="nowrap"><span className={`report-status report-status-${row.status}`}>{STATUS_LABELS[row.status]}</span></td>
                        <td className="nowrap">
                          <div className="report-progress" title={`${row.completedLessons}/${row.totalLessons} aulas · ${row.passedQuizzes}/${row.totalQuizzes} provas`}>
                            <span style={{ width: `${row.percentage}%` }} />
                          </div>
                          {row.percentage}%
                        </td>
                        <td className="nowrap">{row.quizAverage === null ? '—' : `${row.quizAverage}%`}</td>
                        <td className="nowrap">{row.projectGrade === null ? (row.projectDeliveries ? 'sem nota' : '—') : row.projectGrade}</td>
                        <td className="nowrap">{row.presencePercent === null ? '—' : `${row.presencePercent}%`}</td>
                        <td className="nowrap">{row.certificate || '—'}</td>
                        <td className="nowrap">{formatDate(row.lastLoginAt) || 'nunca'}</td>
                        <td className="nowrap">
                          <span className={`report-account report-account-${accountLabel(row).toLowerCase()}`}>{accountLabel(row)}</span>
                          <div className="acompanhamento-conta-acoes">
                            <button
                              type="button"
                              className="ghost-button small"
                              disabled={busyId !== null || !row.accountActive}
                              onClick={() => runAccountAction(row, 'reset')}
                              title="Login e senha passam a ser o CPF no próximo acesso"
                            >
                              Primeiro acesso
                            </button>
                            {row.locked && (
                              <button type="button" className="ghost-button small" disabled={busyId !== null} onClick={() => runAccountAction(row, 'unlock')}>
                                Desbloquear
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="nowrap">
                          <div className="acompanhamento-conta-acoes">
                            <button type="button" className="ghost-button small" disabled={busyId !== null} onClick={() => openEdit(row)}>
                              Editar
                            </button>
                            <button type="button" className="danger-button small" disabled={busyId !== null} onClick={() => removeEnrolment(row)}>
                              Remover do curso
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && sorted.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length + 2} className="users-empty">Nenhum registro com esses filtros. Tente limpar um dos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          courses={allCourses}
          currentUserId={me?.id}
          onClose={() => setEditingUser(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
