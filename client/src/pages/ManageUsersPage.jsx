import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import useForm from '../hooks/useForm';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Feedback, FormActions, errorText } from '../components/manage/shared';
import ImportUsersDialog from '../components/users/ImportUsersDialog';
import { formatCpfInput } from '../utils/cpfInput';
import UserEditDialog from '../components/users/UserEditDialog';
import { exportRows } from '../utils/userSheet';
import { ROLE_LABELS } from '../utils/roles';

// Contas de usuário (somente administradores), equivalente a "Contas de usuário" no Moodle.
const EMPTY_FILTERS = { q: '', role: '', status: '', courseSlug: '', groupId: '' };
const PAGE_SIZES = [10, 25, 50, 100];
const STATUS_LABELS = { active: 'Ativa', pending: 'Primeiro acesso pendente', inactive: 'Desativada' };

function statusOf(item) {
  if (!item.active) return 'inactive';
  return item.activated ? 'active' : 'pending';
}

export default function ManageUsersPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState({ users: [], total: 0, page: 1, pages: 1, pageSize: 25 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);
  const { values, handleChange, reset } = useForm({ name: '', email: '', password: '', cpf: '', role: 'student' });

  const queryParams = (source) => ({
    q: source.q || undefined,
    role: source.role || undefined,
    status: source.status || undefined,
    courseSlug: source.courseSlug || undefined,
    groupId: source.groupId || undefined
  });

  const load = async (nextFilters = filters, page = data.page, pageSize = data.pageSize) => {
    setLoading(true);
    try {
      const { data: response } = await api.get('/users', { params: { ...queryParams(nextFilters), page, pageSize } });
      setData(response);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get('/courses').then(({ data: response }) => setCourses(response.courses || [])).catch(() => setCourses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!filters.courseSlug) {
      setGroups([]);
      return;
    }
    api
      .get(`/courses/${filters.courseSlug}/groups`)
      .then(({ data: response }) => setGroups(response.groups || []))
      .catch(() => setGroups([]));
  }, [filters.courseSlug]);

  // Mudar filtro volta para a primeira página.
  const applyFilters = (patch) => {
    const next = { ...filters, ...patch };
    if (patch.courseSlug !== undefined && patch.courseSlug !== filters.courseSlug) next.groupId = '';
    setFilters(next);
    load(next, 1, data.pageSize);
  };

  const goToPage = (page) => load(filters, page, data.pageSize);
  const changePageSize = (pageSize) => load(filters, 1, pageSize);

  const updateRole = async (target, role) => {
    setFeedback(null);
    try {
      await api.patch(`/users/${target.id}`, { role });
      setFeedback({ type: 'success', text: 'Papel atualizado.' });
      load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const handleDelete = async (target) => {
    if (!window.confirm(`Excluir a conta de ${target.name}? Matrículas, grupos, progresso e anotações serão removidos.`)) return;
    setFeedback(null);
    try {
      await api.delete(`/users/${target.id}`);
      setFeedback({ type: 'success', text: 'Conta excluída.' });
      load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const payload = values.role === 'student' ? { ...values, cpf: values.cpf.replace(/\D/g, '') } : { ...values, cpf: undefined };
      const { data: response } = await api.post('/users', payload);
      setFeedback({ type: 'success', text: `Conta criada para ${response.user.name}.` });
      reset();
      load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const handleExport = async (format) => {
    setFeedback(null);
    try {
      const { data: response } = await api.get('/users/export', { params: queryParams(filters) });
      if (response.rows.length === 0) {
        setFeedback({ type: 'error', text: 'Nenhum usuário para exportar com estes filtros.' });
        return;
      }
      exportRows(response.rows, format);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>Usuários</h1>
          <p>Importe e exporte alunos por planilha, acompanhe matrículas e grupos, e gerencie os acessos.</p>
        </section>

        <Feedback feedback={feedback} />

        <div className="users-toolbar">
          <button type="button" className="primary-button" onClick={() => setImporting(true)}>Importar planilha</button>
          <button type="button" className="ghost-button" onClick={() => handleExport('xlsx')}>Exportar .xlsx</button>
          <button type="button" className="ghost-button" onClick={() => handleExport('csv')}>Exportar .csv</button>
        </div>

        {importing && <ImportUsersDialog onClose={() => setImporting(false)} onImported={() => load()} />}

        {editing && (
          <UserEditDialog
            key={editing.id}
            user={editing}
            courses={courses}
            currentUserId={me?.id}
            onClose={() => setEditing(null)}
            onChanged={() => load()}
          />
        )}

        <section className="surface-card users-panel">
          <form className="users-filters" onSubmit={(event) => { event.preventDefault(); load(filters, 1, data.pageSize); }}>
            <label className="users-filter-search">
              <span>Nome, e-mail ou CPF completo</span>
              <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Buscar…" />
            </label>
            <label>
              <span>Papel</span>
              <select value={filters.role} onChange={(event) => applyFilters({ role: event.target.value })}>
                <option value="">Todos</option>
                <option value="admin">Administradores</option>
                <option value="atendente">Atendentes</option>
                <option value="teacher">Professores</option>
                <option value="student">Alunos</option>
              </select>
            </label>
            <label>
              <span>Situação</span>
              <select value={filters.status} onChange={(event) => applyFilters({ status: event.target.value })}>
                <option value="">Todas</option>
                <option value="active">Ativas</option>
                <option value="pending">Primeiro acesso pendente</option>
                <option value="inactive">Desativadas</option>
              </select>
            </label>
            <label>
              <span>Curso</span>
              <select value={filters.courseSlug} onChange={(event) => applyFilters({ courseSlug: event.target.value })}>
                <option value="">Todos</option>
                {courses.map((course) => (
                  <option key={course.slug} value={course.slug}>{course.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Grupo</span>
              <select value={filters.groupId} disabled={!filters.courseSlug} onChange={(event) => applyFilters({ groupId: event.target.value })}>
                <option value="">{filters.courseSlug ? 'Todos' : 'Escolha um curso'}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <div className="users-filter-actions">
              <button type="submit" className="ghost-button small">Buscar</button>
              <button type="button" className="ghost-button small" onClick={() => { setFilters(EMPTY_FILTERS); load(EMPTY_FILTERS, 1, data.pageSize); }}>
                Limpar
              </button>
            </div>
          </form>

          {loading ? (
            <p className="muted">Carregando usuários...</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>CPF</th>
                    <th>Papel</th>
                    <th>Situação</th>
                    <th>Cursos</th>
                    <th>Grupos</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((item) => {
                    const status = statusOf(item);
                    const isMe = item.id === me?.id;
                    return (
                      <tr key={item.id}>
                        <td className="cell-name">
                          <strong title={item.name}>{item.name}</strong>
                          <div className="muted" title={item.email}>{item.email}</div>
                        </td>
                        <td className="nowrap">{item.cpfMasked || '—'}</td>
                        <td className="nowrap">
                          <select
                            className="role-select"
                            value={item.role}
                            disabled={isMe}
                            aria-label={`Papel de ${item.name}`}
                            onChange={(event) => updateRole(item, event.target.value)}
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="nowrap">
                          <span className={`users-status is-${status}`}>{STATUS_LABELS[status]}</span>
                        </td>
                        <td className="cell-summary">
                          {item.courses.length === 0 ? (
                            <span className="muted">—</span>
                          ) : (
                            <span title={item.courses.map((course) => course.title).join(', ')}>
                              {item.courses[0].title}
                              {item.courses.length > 1 && <em className="more-count"> +{item.courses.length - 1}</em>}
                            </span>
                          )}
                        </td>
                        <td className="nowrap">
                          {item.groups.length === 0 ? <span className="muted">—</span> : `${item.groups.length} grupo(s)`}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button type="button" className="ghost-button small" onClick={() => setEditing(item)}>Editar</button>
                            <button type="button" className="danger-button small" disabled={isMe} onClick={() => handleDelete(item)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.users.length === 0 && <p className="muted users-empty">Nenhum usuário encontrado com estes filtros.</p>}
            </div>
          )}

          <div className="users-pager">
            <span className="muted">{data.total === 0 ? 'Nenhum resultado' : `Mostrando ${from}–${to} de ${data.total}`}</span>
            <label className="pager-size">
              <span>Por página</span>
              <select value={data.pageSize} onChange={(event) => changePageSize(Number(event.target.value))}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="pager-buttons">
              <button type="button" className="ghost-button small" disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)}>Anterior</button>
              <span>Página {data.page} de {data.pages}</span>
              <button type="button" className="ghost-button small" disabled={data.page >= data.pages} onClick={() => goToPage(data.page + 1)}>Próxima</button>
            </div>
          </div>
        </section>

        <form className="surface-card manage-form" onSubmit={handleCreate}>
          <h2>Nova conta</h2>
          <div className="form-grid">
            <label>
              <span>Nome</span>
              <input name="name" value={values.name} onChange={handleChange} required />
            </label>
            <label>
              <span>E-mail</span>
              <input name="email" type="email" value={values.email} onChange={handleChange} required />
            </label>
            <label>
              <span>Papel</span>
              <select name="role" value={values.role} onChange={handleChange}>
                <option value="student">Aluno</option>
                <option value="teacher">Professor</option>
                <option value="admin">Administrador</option>
                <option value="atendente">Atendente</option>
              </select>
            </label>
            {values.role === 'student' ? (
              <label>
                <span>CPF</span>
                <input
                  name="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={values.cpf}
                  onChange={(event) => handleChange({ target: { name: 'cpf', value: formatCpfInput(event.target.value) } })}
                  required
                />
              </label>
            ) : (
              <label>
                <span>Senha inicial (mín. 8, com maiúscula, minúscula, número, acento e símbolo)</span>
                <input name="password" type="password" minLength="8" value={values.password} onChange={handleChange} required />
              </label>
            )}
          </div>
          <p className="muted">
            Aluno: o CPF é o login e a senha do primeiro acesso, e a troca por uma senha forte é obrigatória. Para muitos alunos, prefira a importação por planilha.
          </p>
          <FormActions submitLabel="Criar conta" />
        </form>
      </div>
    </div>
  );
}
