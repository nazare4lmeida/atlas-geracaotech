import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AvatarImg from '../components/AvatarImg';
import AvatarPicker from '../components/AvatarPicker';
import { TurmasProfessor, AulasProfessor, ArquivosProfessor } from '../components/professor/AreaProfessor';
import { roleLabel } from '../utils/roles';
import { UFS_LIST, formatPhone } from '../utils/brazil';
import { passwordRuleStatus, passwordIsStrong } from '../utils/passwordRules';
import '../styles/myarea.css';

const TABS = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'perfil', label: 'Perfil e avatar' },
  { id: 'lembretes', label: 'Lembretes' },
  { id: 'declaracoes', label: 'Declarações' },
  { id: 'seguranca', label: 'Segurança' }
];

const TABS_PROFESSOR = [
  { id: 'perfil', label: 'Perfil e avatar' },
  { id: 'turmas', label: 'Minhas turmas' },
  { id: 'aulas', label: 'Aulas que ministro' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'seguranca', label: 'Segurança' }
];

const STATUS_LABEL = { concluido: 'Concluído', em_andamento: 'Em andamento', nao_iniciado: 'Não iniciado' };

function errorText(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function MyAreaPage() {
  const navigate = useNavigate();
  // Volta para a tela anterior; se a pessoa chegou direto nesta página, vai para a visão geral.
  const voltar = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));
  const { user, refreshProfile, changePassword, isAdmin, isAtendente } = useAuth();
  // Professor: perfil, turmas que ministra, aulas que ministra e arquivos. Sem a visão de aluno (cursos, lembretes, declarações).
  const professor = user?.role === 'teacher';
  // Administração, atendentes e professores não têm a área de aluno; o perfil e a segurança sempre aparecem.
  const staff = isAdmin || isAtendente || professor;
  const tabs = professor
    ? TABS_PROFESSOR
    : staff ? TABS.filter((item) => item.id === 'perfil' || item.id === 'seguranca') : TABS;
  const [tab, setTab] = useState(staff ? 'perfil' : 'visao');
  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/me/overview');
      setOverview(data);
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error, 'Não foi possível carregar sua área agora.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) return <div className="page-state">{loadError}</div>;
  if (!overview) return <div className="page-state">Carregando sua área…</div>;

  const { profile } = overview;
  const openReminders = overview.reminders.filter((item) => !item.done).length;

  return (
    <div className="myarea">
      <div className="myarea-back">
        <button type="button" className="ghost-button small" onClick={voltar}>
          ← Voltar
        </button>
      </div>
      <header className="myarea-head">
        <AvatarImg className="myarea-avatar" id={profile.avatar} alt="Seu avatar" />
        <div>
          <h1>{profile.name}</h1>
          <p>
            {staff && <span className="myarea-pill">{roleLabel(isAdmin ? 'admin' : isAtendente ? 'atendente' : 'teacher')}</span>} {profile.email} · CPF {profile.cpfMasked || '—'}
          </p>
        </div>
      </header>

      <nav className="myarea-tabs" aria-label="Seções da minha área">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'lembretes' && openReminders > 0 ? ` (${openReminders})` : ''}
          </button>
        ))}
      </nav>

      {tab === 'visao' && <Overview overview={overview} />}
      {tab === 'perfil' && <ProfileForm profile={profile} staff={staff} onSaved={async () => { await load(); await refreshProfile(); }} />}
      {tab === 'lembretes' && <Reminders reminders={overview.reminders} onChange={load} />}
      {tab === 'declaracoes' && <Declarations overview={overview} onChange={load} />}
      {tab === 'turmas' && <TurmasProfessor />}
      {tab === 'aulas' && <AulasProfessor />}
      {tab === 'arquivos' && <ArquivosProfessor />}
      {tab === 'seguranca' && <Security changePassword={changePassword} />}
    </div>
  );
}

function EquipeOverview({ equipe }) {
  const professor = equipe.papel === 'professor';
  const rotulos = professor
    ? ['Cursos que ministro', 'Turmas', 'Grupos', 'Alunos matriculados']
    : ['Cursos', 'Turmas ativas', 'Grupos', 'Alunos matriculados'];
  const valores = [equipe.stats.cursos, equipe.stats.turmas, equipe.stats.grupos, equipe.stats.alunos];

  return (
    <div className="myarea-grid">
      <section className="myarea-box" style={{ gridColumn: '1 / -1' }}>
        <div className="myarea-stats">
          {rotulos.map((rotulo, i) => (
            <div className="myarea-stat" key={rotulo}>
              <strong>{valores[i]}</strong>
              <span>{rotulo}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="myarea-box" style={{ gridColumn: '1 / -1' }}>
        <h2>{equipe.titulo}</h2>
        {equipe.cursos.length === 0 && (
          <p className="myarea-muted">{professor ? 'Você ainda não ministra nenhum curso.' : 'Nenhum curso cadastrado.'}</p>
        )}
        {equipe.cursos.map((curso) => (
          <div className="myarea-course" key={curso.id}>
            <div className="myarea-course-top">
              <strong>
                <Link to={`/cursos/${curso.slug}`}>{curso.title}</Link>
              </strong>
              <span className="myarea-pill">
                {curso.turmas} turma(s) · {curso.grupos} grupo(s) · {curso.alunos} aluno(s)
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Overview({ overview }) {
  if (overview.equipe) return <EquipeOverview equipe={overview.equipe} />;
  const completed = overview.completedCourses.length;
  const inProgress = overview.inProgressCourses.length;
  const openReminders = overview.reminderSummary.open;

  return (
    <div className="myarea-grid">
      <section className="myarea-box" style={{ gridColumn: '1 / -1' }}>
        <div className="myarea-stats">
          <div className="myarea-stat">
            <strong>{completed}</strong>
            <span>Cursos concluídos</span>
          </div>
          <div className="myarea-stat">
            <strong>{inProgress}</strong>
            <span>Em andamento</span>
          </div>
          <div className="myarea-stat">
            <strong>{overview.certificates.length}</strong>
            <span>Certificados emitidos</span>
          </div>
          <div className="myarea-stat">
            <strong>{openReminders}</strong>
            <span>Lembretes abertos</span>
          </div>
        </div>
      </section>

      <section className="myarea-box" style={{ gridColumn: '1 / -1' }}>
        <h2>Meus cursos</h2>
        {overview.courses.length === 0 && <p className="myarea-muted">Você ainda não está matriculado em nenhum curso.</p>}
        {overview.courses.map((course) => (
          <div className="myarea-course" key={course.id}>
            <div className="myarea-course-top">
              <strong>
                <Link to={`/cursos/${course.slug}`}>{course.title}</Link>
              </strong>
              <span className={`myarea-pill ${course.status === 'concluido' ? 'is-ok' : ''}`}>
                {STATUS_LABEL[course.status]} · {course.percentage}%
              </span>
            </div>
            <div className="myarea-bar" aria-hidden="true">
              <span style={{ width: `${course.percentage}%` }} />
            </div>
            <p className="myarea-muted">
              Aulas: {course.completedLessons}/{course.totalLessons} · Testes: {course.passedQuizzes}/{course.totalQuizzes} ·
              Projeto final: {course.finalProjectDone ? 'entregue' : 'pendente'}
            </p>
            {course.status !== 'concluido' && course.pendingModules.length > 0 && (
              <>
                <h3>O que falta</h3>
                <ul className="myarea-list">
                  {course.pendingModules.map((title) => (
                    <li key={title}>
                      <span>{title}</span>
                      <span className="myarea-pill is-warn">pendente</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </section>

      <section className="myarea-box">
        <h2>Cursos concluídos</h2>
        {overview.completedCourses.length === 0 && <p className="myarea-muted">Nenhum curso concluído ainda.</p>}
        <ul className="myarea-list">
          {overview.completedCourses.map((course) => (
            <li key={course.id} className="is-done">
              <span>{course.title}</span>
              <span className="myarea-pill is-ok">concluído</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="myarea-box">
        <h2>Certificados</h2>
        {overview.certificates.length === 0 && <p className="myarea-muted">Nenhum certificado emitido ainda.</p>}
        <ul className="myarea-list">
          {overview.certificates.map((item) => (
            <li key={item.auth_code || item.course_slug}>
              <span>{item.course_name}</span>
              <Link to="/documentos">ver</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProfileForm({ profile, onSaved, staff = false }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: formatPhone(profile.phone || ''),
    city: profile.city || '',
    state: profile.state || '',
    careerGoal: profile.careerGoal || '',
    avatar: profile.avatar || 'avatar-01'
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      await api.patch('/me/profile', {
        name: form.name,
        phone: form.phone.replace(/\D/g, ''),
        city: form.city,
        state: form.state,
        careerGoal: form.careerGoal,
        avatar: form.avatar
      });
      setMessage('Perfil atualizado.');
      await onSaved();
    } catch (err) {
      setError(errorText(err, 'Não foi possível salvar agora.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="myarea-grid" onSubmit={save}>
      <section className="myarea-box">
        <h2>Dados pessoais</h2>
        <div className="myarea-form">
          <label>
            Nome
            <input value={form.name} onChange={update('name')} maxLength={120} required />
          </label>
          <label>
            E-mail (alterado pela administração)
            <input value={profile.email} readOnly />
          </label>
          <label>
            CPF (alterado pela administração)
            <input value={profile.cpfMasked || '—'} readOnly />
          </label>
          <label>
            Telefone
            <input value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: formatPhone(event.target.value) }))} placeholder="(00) 00000-0000" inputMode="tel" />
          </label>
          <label>
            Cidade
            <input value={form.city} onChange={update('city')} maxLength={80} />
          </label>
          <label>
            Estado
            <select value={form.state} onChange={update('state')}>
              <option value="">—</option>
              {UFS_LIST.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          {!staff && (
            <label>
              Objetivo profissional
              <textarea value={form.careerGoal} onChange={update('careerGoal')} rows={3} maxLength={500} />
            </label>
          )}
        </div>
      </section>

      <section className="myarea-box">
        <h2>Avatar</h2>
        <AvatarPicker value={form.avatar} onChange={(id) => setForm((current) => ({ ...current, avatar: id }))} />
        <p className="myarea-muted">Escolha um avatar. Ele aparece no menu e na sua área.</p>
        {message && <p className="myarea-msg">{message}</p>}
        {error && <p className="myarea-msg is-error">{error}</p>}
        <button type="submit" className="primary-button small" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar perfil'}
        </button>
      </section>
    </form>
  );
}

function Reminders({ reminders, onChange }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const create = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/me/reminders', { title, dueDate: dueDate || null });
      setTitle('');
      setDueDate('');
      onChange();
    } catch (err) {
      setError(errorText(err, 'Não foi possível criar o lembrete.'));
    }
  };

  const toggle = async (item) => {
    await api.patch(`/me/reminders/${item.id}`, { done: !item.done });
    onChange();
  };

  const remove = async (item) => {
    await api.delete(`/me/reminders/${item.id}`);
    onChange();
  };

  return (
    <div className="myarea-grid">
      <section className="myarea-box">
        <h2>Novo lembrete</h2>
        <form className="myarea-form" onSubmit={create}>
          <label>
            O que você quer lembrar
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
          </label>
          <label>
            Data (opcional)
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          {error && <p className="myarea-msg is-error">{error}</p>}
          <button type="submit" className="primary-button small">
            Adicionar lembrete
          </button>
        </form>
      </section>

      <section className="myarea-box">
        <h2>Meus lembretes</h2>
        {reminders.length === 0 && <p className="myarea-muted">Nenhum lembrete ainda.</p>}
        <ul className="myarea-list">
          {reminders.map((item) => (
            <li key={item.id} className={item.done ? 'is-done' : ''}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" checked={item.done} onChange={() => toggle(item)} aria-label={`Concluir: ${item.title}`} />
                <span>
                  {item.title}
                  {item.dueDate && <small className="myarea-muted"> · {item.dueDate.split('-').reverse().join('/')}</small>}
                </span>
              </label>
              <button type="button" className="ghost-button small" onClick={() => remove(item)}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Mensagem de erro quando a resposta é um PDF/blob (o servidor manda o motivo em JSON).
async function mensagemDeclaracao(err) {
  try {
    const data = err.response?.data;
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      if (json.message) return json.message;
    }
  } catch {
    // Sem JSON: usa a mensagem padrão abaixo.
  }
  return errorText(err, 'Não foi possível gerar a declaração.');
}

// Declaração de matrícula: gerada na hora, em PDF, a partir das matrículas ativas do aluno. Sem aprovação.
function Declarations({ overview }) {
  const [baixando, setBaixando] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const matriculas = overview.courses || [];

  const baixar = async (course) => {
    setBaixando(course.slug);
    setMessage('');
    setError('');
    try {
      const { data } = await api.get(`/me/declarations/matricula/${course.slug}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `declaracao-matricula-${course.slug}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Declaração de ${course.title} gerada.`);
    } catch (err) {
      setError(await mensagemDeclaracao(err));
    } finally {
      setBaixando('');
    }
  };

  return (
    <div className="myarea-grid">
      <section className="myarea-box">
        <h2>Declaração de matrícula</h2>
        <p className="myarea-muted">Gere a declaração na hora, com o seu nome, CPF e os dados da formação. Não precisa de aprovação.</p>
        {message && <p className="myarea-msg">{message}</p>}
        {error && <p className="myarea-msg is-error">{error}</p>}
        {matriculas.length === 0 && <p className="myarea-muted">Você ainda não tem matrícula ativa em nenhuma formação.</p>}
        <ul className="myarea-list">
          {matriculas.map((course) => (
            <li key={course.id}>
              <span>{course.title}</span>
              <button type="button" className="primary-button small" disabled={baixando === course.slug} onClick={() => baixar(course)}>
                {baixando === course.slug ? 'Gerando…' : 'Baixar PDF'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Security({ changePassword }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const rules = useMemo(() => passwordRuleStatus(newPassword), [newPassword]);
  const matches = newPassword.length > 0 && newPassword === confirm;
  const canSave = Boolean(currentPassword) && passwordIsStrong(newPassword) && matches;

  useEffect(() => {
    api.get('/me/logins').then(({ data }) => setHistory(data.events)).catch(() => setHistory([]));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await changePassword({ currentPassword, newPassword });
      setMessage('Senha atualizada. Outras sessões foram encerradas.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorText(err, 'Não foi possível trocar a senha.'));
    }
  };

  return (
    <div className="myarea-grid">
      <section className="myarea-box">
        <h2>Trocar senha</h2>
        <form className="myarea-form" onSubmit={save}>
          <label>
            Senha atual
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label>
            Nova senha
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <ul className="password-checklist">
            {rules.map((rule) => (
              <li key={rule.key} className={rule.ok ? 'is-ok' : ''}>
                <span aria-hidden="true">{rule.ok ? '✓' : '○'}</span> {rule.label}
              </li>
            ))}
          </ul>
          <label>
            Confirme a nova senha
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {message && <p className="myarea-msg">{message}</p>}
          {error && <p className="myarea-msg is-error">{error}</p>}
          <button type="submit" className="primary-button small" disabled={!canSave}>
            Salvar nova senha
          </button>
        </form>
      </section>

      <section className="myarea-box">
        <h2>Acessos recentes</h2>
        <p className="myarea-muted">Se você não reconhece algum acesso, troque sua senha e avise a administração.</p>
        <ul className="myarea-list">
          {history.map((event) => (
            <li key={event.id}>
              <span>
                {new Date(event.createdAt).toLocaleString('pt-BR')} · {event.success ? 'entrada' : 'tentativa recusada'}
              </span>
              <span className={`myarea-pill ${event.success ? 'is-ok' : 'is-warn'}`}>{event.success ? 'ok' : 'falhou'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
