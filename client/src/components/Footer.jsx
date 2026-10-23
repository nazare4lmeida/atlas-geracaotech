import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/footer.css';

// Rodapé na mesma faixa da barra superior: mesma altura, mesmas margens laterais e mesma marca.
// À esquerda a marca e o direito autoral; no centro os atalhos; à direita o contato padrão.
export default function Footer() {
  const { isAuthenticated, isTeacher, isAdmin, isAtendente } = useAuth();
  const ano = new Date().getFullYear();
  const atendimento = isAdmin || isAtendente ? '/gestao/atendimento' : '/atendimento';
  const temAtendimento = isAuthenticated && (isAtendente || isAdmin || !isTeacher);

  return (
    <footer className="site-footer">
      <div className="site-footer-bar">
        <div className="site-footer-left">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="brand">
            <span className="brand-mark">Atlas</span>
            <span className="brand-dot">Geração Tech</span>
          </Link>
          <span className="site-footer-copy">© {ano} · Versão 1.0</span>
        </div>

        <nav className="site-footer-links" aria-label="Rodapé">
          {isAuthenticated && !isAtendente && <Link to="/cursos">Trilhas</Link>}
          {isAuthenticated && !isTeacher && !isAtendente && <Link to="/presenca">Minha presença</Link>}
          {isAuthenticated && !isAtendente && (!isTeacher || isAdmin) && <Link to="/certificados">Certificados</Link>}
          {temAtendimento && <Link to={atendimento}>Atendimento</Link>}
          <Link to="/verificar">Verificar certificado</Link>
        </nav>

        <div className="site-footer-right">
          <a href="mailto:contato@geracaotech.iel-ce.org.br">contato@geracaotech.iel-ce.org.br</a>
          <span>Seg. a sex., das 9h às 17h</span>
        </div>
      </div>
    </footer>
  );
}
