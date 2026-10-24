import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AvatarImg from './AvatarImg';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAdmin, isTeacher, isAtendente, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand">
        <span className="brand-mark">Atlas</span>
        <span className="brand-dot">Geração Tech</span>
      </Link>

      <nav className="nav-links">
        {isAuthenticated && isAtendente && <NavLink to="/gestao/atendimento">Atendimento</NavLink>}
        {isAuthenticated && !isAtendente && <NavLink to="/dashboard">Dashboard</NavLink>}
        {isAuthenticated && !isAtendente && <NavLink to="/cursos">Trilhas</NavLink>}
        {isAuthenticated && !isAtendente && (!isTeacher || isAdmin) && <NavLink to="/documentos">Documentos</NavLink>}
        {isAuthenticated && !isTeacher && !isAtendente && <NavLink to="/anotacoes">Anotações</NavLink>}
        {isAuthenticated && !isTeacher && !isAtendente && <NavLink to="/editor">Editor</NavLink>}
        {isAuthenticated && isTeacher && !isAtendente && <NavLink to="/gestao">Gestão</NavLink>}
      </nav>

      <div className="nav-actions">
        <button type="button" className="ghost-button" onClick={toggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {isAuthenticated && (
          <>
            <NavLink to="/minha-area" className="nav-user" title="Minha área">
              <AvatarImg className="nav-avatar" id={user?.avatar} />
              <span>{user?.name?.split(' ')[0] || 'Minha área'}</span>
            </NavLink>
            <button type="button" className="primary-button small" onClick={handleLogout}>
              Sair
            </button>
          </>
        )}
      </div>
    </header>
  );
}
