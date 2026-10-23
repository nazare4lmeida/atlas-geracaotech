import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { passwordRuleStatus, passwordIsStrong } from '../utils/passwordRules';
import '../styles/login.css';

// Troca de senha. No primeiro acesso é obrigatória; depois, fica disponível em "Minha área".
export default function ChangePasswordPage() {
  const { isAuthenticated, loading, mustChangePassword, changePassword, logout, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(() => passwordRuleStatus(newPassword), [newPassword]);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = passwordIsStrong(newPassword) && matches && currentPassword && !submitting;

  if (loading) return <div className="page-state">Carregando…</div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível trocar a senha agora.');
    } finally {
      setSubmitting(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="login-screen login-screen-single">
      <section className="login-form-side">
        <form className="login-card login-card-wide" onSubmit={handleSubmit} noValidate>
          <h2>{mustChangePassword ? 'Crie sua senha' : 'Trocar senha'}</h2>
          <p className="login-subtitle">
            {mustChangePassword
              ? `Olá, ${user?.name?.split(' ')[0] || 'aluno'}. Para continuar, escolha uma senha segura.`
              : 'Escolha uma nova senha segura.'}
          </p>

          <label className="login-field">
            <span>{mustChangePassword ? 'Senha atual (seu CPF)' : 'Senha atual'}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label className="login-field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>

          <ul className="password-checklist" aria-label="Regras da senha">
            {rules.map((rule) => (
              <li key={rule.key} className={rule.ok ? 'is-ok' : ''}>
                <span aria-hidden="true">{rule.ok ? '✓' : '○'}</span> {rule.label}
              </li>
            ))}
            <li className={matches ? 'is-ok' : ''}>
              <span aria-hidden="true">{matches ? '✓' : '○'}</span> As duas senhas são iguais
            </li>
          </ul>

          <label className="login-field">
            <span>Confirme a nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={!canSubmit}>
            {submitting ? 'Salvando…' : 'Salvar nova senha'}
          </button>

          {mustChangePassword && (
            <button type="button" className="login-link" onClick={() => { logout(); navigate('/', { replace: true }); }}>
              Sair
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
