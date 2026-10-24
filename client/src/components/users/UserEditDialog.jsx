import { useEffect, useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';
import { ROLE_LABELS } from '../../utils/roles';

// Senha forte gerada no navegador: maiúscula, minúscula, número e símbolo, sem espaços nem letras acentuadas.
function gerarSenha() {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?-+='];
  const todas = grupos.join('');
  const aleatorio = (limite) => {
    const valor = new Uint32Array(1);
    crypto.getRandomValues(valor);
    return valor[0] % limite;
  };
  const chars = grupos.map((grupo) => grupo[aleatorio(grupo.length)]);
  while (chars.length < 12) chars.push(todas[aleatorio(todas.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = aleatorio(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Edição completa de um aluno: dados da conta, senha, matrículas por curso e grupos. Cada ação grava na hora.
export default function UserEditDialog({ user: initial, courses, currentUserId, onClose, onChanged }) {
  const [user, setUser] = useState(initial);
  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    cpf: '',
    role: initial.role,
    active: initial.active
  });
  const [groupsByCourse, setGroupsByCourse] = useState({});
  const [newEnrol, setNewEnrol] = useState({ slug: '', role: 'student' });
  const [pwd, setPwd] = useState({ password: '', mustChange: true, show: false });
  const [feedback, setFeedback] = useState(null);
  const isMe = initial.id === currentUserId;

  const say = (type, text) => setFeedback({ type, text });
  const fail = (error) => say('error', errorText(error));

  // Busca o aluno de novo na listagem para refletir as mudanças do diálogo.
  const refresh = async () => {
    const { data } = await api.get('/users', { params: { q: initial.email, pageSize: 10 } });
    const fresh = data.users.find((item) => item.id === initial.id);
    if (fresh) {
      setUser(fresh);
    }
    onChanged?.();
  };

  useEffect(() => {
    const slugs = user.courses.map((course) => course.slug);
    Promise.all(
      slugs.map((slug) =>
        api
          .get(`/courses/${slug}/groups`)
          .then(({ data }) => [slug, data.groups || []])
          .catch(() => [slug, []])
      )
    ).then((entries) => setGroupsByCourse(Object.fromEntries(entries)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.courses.map((course) => course.slug).join('|')]);

  const saveAccount = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const body = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.cpf.trim()) body.cpf = form.cpf;
      await api.patch(`/users/${initial.id}`, body);
      setForm((current) => ({ ...current, cpf: '' }));
      say('success', 'Dados salvos.');
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  // Define a senha pela gestão. O usuário recebe a senha por fora do Atlas; por padrão troca no próximo acesso.
  const savePassword = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const { data } = await api.post(`/accounts/${initial.id}/set-password`, {
        password: pwd.password,
        mustChangePassword: pwd.mustChange
      });
      setPwd({ password: '', mustChange: true, show: false });
      say('success', data.message);
    } catch (error) {
      fail(error);
    }
  };

  const changeEnrolmentRole = async (course, role) => {
    try {
      await api.patch(`/courses/${course.slug}/participants/${initial.id}`, { role });
      say('success', `Papel em ${course.title} atualizado.`);
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const unenrol = async (course) => {
    if (!window.confirm(`Remover a matrícula de ${user.name} em "${course.title}"? Os grupos desse curso também são desfeitos.`)) return;
    try {
      await api.delete(`/courses/${course.slug}/participants/${initial.id}`);
      say('success', 'Matrícula removida.');
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const enrol = async () => {
    if (!newEnrol.slug) return;
    try {
      await api.post(`/courses/${newEnrol.slug}/participants`, { userId: initial.id, role: newEnrol.role });
      setNewEnrol({ slug: '', role: 'student' });
      say('success', 'Matrícula criada.');
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const addToGroup = async (slug, groupId) => {
    if (!groupId) return;
    try {
      await api.post(`/courses/${slug}/groups/${groupId}/members`, { userId: initial.id });
      say('success', 'Adicionado ao grupo.');
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const removeFromGroup = async (slug, groupId) => {
    try {
      await api.delete(`/courses/${slug}/groups/${groupId}/members/${initial.id}`);
      say('success', 'Removido do grupo.');
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const available = courses.filter((course) => !user.courses.some((item) => item.slug === course.slug));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Editar ${user.name}`}>
      <div className="modal-card edit-card">
        <div className="import-head">
          <div>
            <h2>{user.name}</h2>
            <p className="muted">{user.email} · {user.cpfMasked || 'sem CPF'}</p>
          </div>
          <button type="button" className="ghost-button small" onClick={onClose}>Fechar</button>
        </div>

        {feedback && <div className={`alert ${feedback.type === 'error' ? 'error' : 'success'}`}>{feedback.text}</div>}

        <section className="edit-section">
          <h3>Dados da conta</h3>
          <form className="edit-grid" onSubmit={saveAccount}>
            <label>
              <span>Nome</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label>
              <span>Trocar CPF (deixe vazio para manter)</span>
              <input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} placeholder={user.cpfMasked || '000.000.000-00'} />
            </label>
            <label>
              <span>Papel da conta</span>
              <select value={form.role} disabled={isMe} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="edit-check">
              <input type="checkbox" checked={form.active} disabled={isMe} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              <span>Conta ativa</span>
            </label>
            <div className="edit-actions">
              <button type="submit" className="primary-button">Salvar dados</button>
            </div>
          </form>
        </section>

        <section className="edit-section">
          <h3>Senha</h3>
          {isMe ? (
            <p className="muted">Para trocar a sua própria senha, use Minha área.</p>
          ) : (
            <form className="edit-grid" onSubmit={savePassword}>
              <label>
                <span>Nova senha (8 a 128 caracteres; maiúscula, minúscula, número e símbolo; sem espaços)</span>
                <div className="edit-inline">
                  <input
                    type={pwd.show ? 'text' : 'password'}
                    value={pwd.password}
                    autoComplete="new-password"
                    onChange={(event) => setPwd({ ...pwd, password: event.target.value })}
                  />
                  <button type="button" className="ghost-button small" onClick={() => setPwd({ ...pwd, show: !pwd.show })}>
                    {pwd.show ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" className="ghost-button small" onClick={() => setPwd({ ...pwd, password: gerarSenha(), show: true })}>
                    Gerar
                  </button>
                </div>
              </label>
              <label className="edit-check">
                <input type="checkbox" checked={pwd.mustChange} onChange={(event) => setPwd({ ...pwd, mustChange: event.target.checked })} />
                <span>Exigir troca de senha no próximo acesso</span>
              </label>
              <div className="edit-actions">
                <button type="submit" className="primary-button" disabled={!pwd.password}>Definir senha</button>
              </div>
            </form>
          )}
        </section>

        <section className="edit-section">
          <h3>Cursos e papel</h3>
          {user.courses.length === 0 && <p className="muted">Não está matriculado em nenhum curso.</p>}
          <ul className="edit-list">
            {user.courses.map((course) => (
              <li key={course.slug}>
                <span className="edit-list-title">{course.title}</span>
                <select value={course.role} onChange={(event) => changeEnrolmentRole(course, event.target.value)} aria-label={`Papel em ${course.title}`}>
                  <option value="student">Aluno</option>
                  <option value="teacher">Docente</option>
                </select>
                <button type="button" className="danger-button small" onClick={() => unenrol(course)}>Remover</button>
              </li>
            ))}
          </ul>
          {available.length > 0 && (
            <div className="edit-inline">
              <select value={newEnrol.slug} onChange={(event) => setNewEnrol({ ...newEnrol, slug: event.target.value })}>
                <option value="">Matricular em curso…</option>
                {available.map((course) => (
                  <option key={course.slug} value={course.slug}>{course.title}</option>
                ))}
              </select>
              <select value={newEnrol.role} onChange={(event) => setNewEnrol({ ...newEnrol, role: event.target.value })}>
                <option value="student">Aluno</option>
                <option value="teacher">Docente</option>
              </select>
              <button type="button" className="ghost-button small" onClick={enrol} disabled={!newEnrol.slug}>Matricular</button>
            </div>
          )}
        </section>

        <section className="edit-section">
          <h3>Grupos</h3>
          {user.courses.length === 0 && <p className="muted">Matricule o aluno em um curso para colocá-lo em grupos.</p>}
          {user.courses.map((course) => {
            const current = user.groups.filter((group) => group.courseSlug === course.slug);
            const options = (groupsByCourse[course.slug] || []).filter((group) => !current.some((item) => item.id === group.id));
            return (
              <div key={course.slug} className="edit-group-row">
                <span className="edit-list-title">{course.title}</span>
                <div className="users-chips">
                  {current.length === 0 && <span className="muted">Sem grupo</span>}
                  {current.map((group) => (
                    <span key={group.id} className="users-chip">
                      {group.name}
                      <button type="button" className="chip-remove" aria-label={`Remover de ${group.name}`} onClick={() => removeFromGroup(course.slug, group.id)}>×</button>
                    </span>
                  ))}
                </div>
                {options.length > 0 && (
                  <select value="" onChange={(event) => addToGroup(course.slug, event.target.value)} aria-label={`Adicionar a grupo de ${course.title}`}>
                    <option value="">Adicionar a grupo…</option>
                    {options.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
