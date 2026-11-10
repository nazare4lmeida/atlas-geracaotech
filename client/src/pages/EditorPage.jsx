import Sidebar from '../components/Sidebar';
import CodeStudio from '../components/editor/CodeStudio';

// Editor de código do aluno.
// Com VITE_CODICE_URL definido, a aba mostra a sala do Codice (a turma escreve junta, como no Codice).
// Sem essa configuração, continua o estúdio individual (HTML, CSS e JavaScript com prévia e console).
const CODICE_URL = import.meta.env.VITE_CODICE_URL || '';

export default function EditorPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content editor-page">
        {CODICE_URL ? (
          <div className="espaco-incorporado-frame editor-codice-frame">
            <iframe
              src={CODICE_URL}
              title="Codice: editor colaborativo"
              allow="clipboard-read; clipboard-write; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <CodeStudio />
        )}
      </div>
    </div>
  );
}
