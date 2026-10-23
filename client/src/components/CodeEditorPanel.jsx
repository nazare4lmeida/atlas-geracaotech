import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const starterCode = `function saudacao(nome) {
  return "Olá, " + nome + "!";
}

console.log(saudacao("Atlas - Geração Tech"));`;

export default function CodeEditorPanel() {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState('');

  const extensions = useMemo(() => [javascript({ jsx: false })], []);

  const runCode = () => {
    const logs = [];
    const sandboxConsole = {
      log: (...args) => logs.push(args.join(' '))
    };

    try {
      const executor = new Function('console', code);
      executor(sandboxConsole);
      setOutput(logs.join('\n') || 'Código executado sem saída.');
    } catch (error) {
      setOutput(`Erro: ${error.message}`);
    }
  };

  const clearCode = () => {
    setCode(starterCode);
    setOutput('');
  };

  return (
    <section className="editor-panel">
      <div className="section-heading">
        <h2>Laboratório JavaScript</h2>
        <p>Edite, execute e valide ideias rapidamente no navegador.</p>
      </div>

      <CodeMirror
        value={code}
        height="320px"
        theme={oneDark}
        extensions={extensions}
        onChange={(value) => setCode(value)}
      />

      <div className="editor-actions">
        <button type="button" className="primary-button" onClick={runCode}>
          Rodar código
        </button>
        <button type="button" className="ghost-button" onClick={clearCode}>
          Restaurar exemplo
        </button>
      </div>

      <div className="output-panel">
        <h3>Saída</h3>
        <pre>{output || 'Nenhuma execução ainda.'}</pre>
      </div>
    </section>
  );
}
