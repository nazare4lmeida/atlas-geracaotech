import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { maskIdentifier } from '../utils/cpfInput';
import '../styles/login.css';

// Entrada do Atlas: alunos com CPF (com máscara) e gestão com e-mail.
export default function LoginPage() {
  const { login, isAuthenticated, mustChangePassword, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={mustChangePassword ? '/trocar-senha' : '/dashboard'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const data = await login({ identifier: identifier.trim(), password });
      setPassword('');
      if (data.mustChangePassword) {
        navigate('/trocar-senha', { replace: true });
      } else {
        navigate(location.state?.from || '/dashboard', { replace: true });
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 423) {
        setError(message);
      } else if (status && status < 500) {
        setError(message || 'Não foi possível entrar. Confira os dados.');
      } else {
        setError('Não foi possível entrar agora. Tente novamente em instantes.');
      }
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <section className="login-visual">
        <img src="/brand/login-collage.png" alt="Alunos e equipe do Geração Tech em eventos" className="login-visual-img" />
      </section>

      <section className="login-form-side">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-card-top">
            <span className="brand-mark">Atlas</span>
            <span className="login-card-symbol" role="img" aria-label="Geração Tech" />
          </div>
          <h2>Entrar</h2>
          <p className="login-subtitle">Acesse com seu CPF ou seu e-mail institucional.</p>

          <label className="login-field">
            <span>CPF ou e-mail</span>
            <input
              type="text"
              name="identifier"
              autoComplete="username"
              inputMode="text"
              placeholder="000.000.000-00"
              value={identifier}
              onChange={(event) => setIdentifier(maskIdentifier(event.target.value))}
              required
            />
          </label>

          <label className="login-field">
            <span>Senha</span>
            <span className="login-password">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="login-hint">
            <strong>Primeiro acesso:</strong> use seu CPF com a máscara como usuário e como senha. Você escolherá
            uma senha segura logo em seguida.
          </p>
          <p className="login-help">Não tem acesso? Solicite ao administrador do sistema.</p>
        </form>
      </section>
    </div>
  );
}
