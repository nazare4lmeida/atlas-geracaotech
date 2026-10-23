import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Exige login e, opcionalmente, um dos papéis informados em "roles".
// Quem ainda não trocou a senha (primeiro acesso) só consegue abrir a tela de troca de senha.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, role, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-state">Carregando sua experiência...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (mustChangePassword && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (roles && !roles.includes(role)) {
    return (
      <div className="page-state">
        <h1>Acesso restrito</h1>
        <p>Você não tem permissão para acessar esta área.</p>
        <Link to="/dashboard" className="primary-button as-link">
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  return children;
}
