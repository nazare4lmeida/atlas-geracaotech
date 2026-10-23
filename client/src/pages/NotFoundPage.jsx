import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-state">
      <h1>Página não encontrada</h1>
      <Link to="/" className="primary-button as-link">
        Voltar ao início
      </Link>
    </div>
  );
}
