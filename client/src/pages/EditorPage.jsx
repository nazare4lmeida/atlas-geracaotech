import Sidebar from '../components/Sidebar';
import CodeStudio from '../components/editor/CodeStudio';

// Editor de código do aluno: HTML, CSS e JavaScript com prévia e console (ver CodeStudio).
export default function EditorPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content editor-page">
        <CodeStudio />
      </div>
    </div>
  );
}
