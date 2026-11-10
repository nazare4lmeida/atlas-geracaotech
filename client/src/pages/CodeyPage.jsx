import Sidebar from '../components/Sidebar';

// Jogo de programação Codey: o aluno treina código resolvendo desafios.
// O endereço vem de VITE_CODEY_URL; sem ele, usa o endereço publicado do jogo.
const CODEY_URL = import.meta.env.VITE_CODEY_URL || 'https://codey-gamma.vercel.app';

export default function CodeyPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content editor-page">
        <div className="espaco-incorporado-frame editor-codice-frame">
          <iframe
            src={CODEY_URL}
            title="Codey: jogo de programação"
            allow="clipboard-read; clipboard-write; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
