import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import '../../styles/editor.css';

// Estúdio de código do Atlas: HTML, CSS e JavaScript lado a lado com a prévia ao vivo e o console.
// Os arquivos ficam salvos neste navegador (rascunho local). Não há sincronização entre pessoas.

const STORAGE_FILES = 'atlas-editor-arquivos';
const STORAGE_PALETTE = 'atlas-editor-paleta';
const STORAGE_MODE = 'atlas-editor-modo';
const EXTENSOES = ['html', 'css', 'js'];

export const PALETAS = [
  { id: 'default', nome: 'Ardósia', cores: ['#0f172a', '#334155', '#94a3b8', '#f1f5f9'] },
  { id: 'rose', nome: 'Rosé Terroso', cores: ['#4e413b', '#a45a6e', '#d2ac94', '#ebd5bc'] },
  { id: 'ocean', nome: 'Marinho Sereno', cores: ['#223047', '#4a6178', '#9db2bf', '#dde6ed'] },
  { id: 'forest', nome: 'Floresta Profunda', cores: ['#050e13', '#14352f', '#5e8a75', '#92b2a2'] }
];

const EXEMPLO = [
  {
    id: 'f1',
    name: 'index.html',
    content: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Meu primeiro projeto</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="cartao">
      <h1>Olá, Atlas!</h1>
      <p>Edite os arquivos e veja a prévia mudar.</p>
      <button id="botao">Clique aqui</button>
      <p id="contador">0 cliques</p>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`
  },
  {
    id: 'f2',
    name: 'styles.css',
    content: `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: #f1f5f9;
}

.cartao {
  padding: 2rem;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.4);
  text-align: center;
}

button {
  padding: 0.6rem 1.1rem;
  border: 0;
  border-radius: 10px;
  background: #134771;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
`
  },
  {
    id: 'f3',
    name: 'script.js',
    content: `let cliques = 0;
const botao = document.getElementById('botao');
const contador = document.getElementById('contador');

botao.addEventListener('click', () => {
  cliques += 1;
  contador.textContent = cliques + (cliques === 1 ? ' clique' : ' cliques');
  console.log('Clique número', cliques);
});
`
  }
];

// Console da prévia: encaminha console.log/erro para a página, pelo postMessage.
const CONSOLE_BRIDGE = `<script>(function(){function send(type,args){try{parent.postMessage({__atlasEditor:1,type:type,args:Array.prototype.map.call(args,function(a){try{return typeof a==='string'?a:JSON.stringify(a)}catch(e){return String(a)}})},'*')}catch(e){}}['log','info','warn','error'].forEach(function(k){var original=console[k];console[k]=function(){send(k,arguments);if(original)original.apply(console,arguments)}});window.addEventListener('error',function(e){send('error',[e.message])})})();<\/script>`;

function carregarArquivos() {
  try {
    const salvos = JSON.parse(localStorage.getItem(STORAGE_FILES) || 'null');
    if (Array.isArray(salvos) && salvos.length) return salvos;
  } catch {
    /* rascunho inválido: volta ao exemplo */
  }
  return EXEMPLO;
}

function salvarLocal(chave, valor) {
  try {
    localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor));
  } catch {
    /* sem armazenamento: o estúdio segue funcionando sem salvar */
  }
}

function linguagem(nome) {
  if (nome.endsWith('.html')) return html();
  if (nome.endsWith('.css')) return css();
  return javascript();
}

// Monta a página da prévia: junta o CSS e o JS aos arquivos HTML e remove as referências externas.
function montarPrevia(arquivos) {
  const pagina = arquivos.find((f) => f.name === 'index.html') || arquivos.find((f) => f.name.endsWith('.html'));
  const estilos = arquivos.filter((f) => f.name.endsWith('.css')).map((f) => f.content).join('\n');
  const scripts = arquivos.filter((f) => /\.(js|mjs)$/.test(f.name)).map((f) => f.content).join('\n;\n');
  const base = pagina?.content ?? '<!doctype html><html><head></head><body></body></html>';

  const semReferencias = base
    .replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
    .replace(/<script[^>]*src=["'][^"']*\.(js|mjs)["'][^>]*>\s*<\/script>/gi, '');

  const comEstilos = estilos ? `<style>${estilos}</style>` : '';
  const comScripts = scripts ? `<script>${scripts}<\/script>` : '';

  let doc = semReferencias;
  if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => `${m}${CONSOLE_BRIDGE}${comEstilos}`);
  else doc = `${CONSOLE_BRIDGE}${comEstilos}${doc}`;
  if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${comScripts}</body>`);
  else doc = `${doc}${comScripts}`;
  return doc;
}

export default function CodeStudio() {
  const [arquivos, setArquivos] = useState(carregarArquivos);
  const [ativoId, setAtivoId] = useState(() => carregarArquivos()[0]?.id);
  const [paleta, setPaleta] = useState(() => {
    try {
      return PALETAS.some((p) => p.id === localStorage.getItem(STORAGE_PALETTE)) ? localStorage.getItem(STORAGE_PALETTE) : 'default';
    } catch {
      return 'default';
    }
  });
  const [modo, setModo] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_MODE) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [menuPaleta, setMenuPaleta] = useState(false);
  const [previa, setPrevia] = useState('');
  const [console_, setConsole] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const timer = useRef(null);

  const ativo = arquivos.find((f) => f.id === ativoId) || arquivos[0];

  // Persistência local do rascunho e das preferências.
  useEffect(() => salvarLocal(STORAGE_FILES, arquivos), [arquivos]);
  useEffect(() => salvarLocal(STORAGE_PALETTE, paleta), [paleta]);
  useEffect(() => salvarLocal(STORAGE_MODE, modo), [modo]);

  // Prévia atualizada com pausa curta de digitação.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setConsole([]);
      setPrevia(montarPrevia(arquivos));
    }, 400);
    return () => clearTimeout(timer.current);
  }, [arquivos]);

  // Mensagens do console vindas da prévia.
  useEffect(() => {
    function ouvir(event) {
      const dados = event.data;
      if (!dados || dados.__atlasEditor !== 1) return;
      setConsole((atual) => [...atual.slice(-199), { tipo: dados.type, texto: (dados.args || []).join(' ') }]);
    }
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, []);

  function atualizarConteudo(valor) {
    setArquivos((atual) => atual.map((f) => (f.id === ativo.id ? { ...f, content: valor } : f)));
  }

  function novoArquivo() {
    const nome = window.prompt('Nome do arquivo (termine em .html, .css ou .js):', 'novo.js');
    if (!nome) return;
    const limpo = nome.trim();
    const ext = limpo.split('.').pop();
    if (!EXTENSOES.includes(ext) || limpo.length > 60 || /[\\/]/.test(limpo)) {
      setMensagem('Use um nome simples terminado em .html, .css ou .js.');
      return;
    }
    if (arquivos.some((f) => f.name === limpo)) {
      setMensagem('Já existe um arquivo com esse nome.');
      return;
    }
    const id = `f${Date.now()}`;
    setArquivos((atual) => [...atual, { id, name: limpo, content: '' }]);
    setAtivoId(id);
    setMensagem('');
  }

  function removerArquivo(id) {
    if (arquivos.length <= 1) return;
    const alvo = arquivos.find((f) => f.id === id);
    if (!window.confirm(`Remover ${alvo?.name}?`)) return;
    const restantes = arquivos.filter((f) => f.id !== id);
    setArquivos(restantes);
    if (ativoId === id) setAtivoId(restantes[0].id);
  }

  function restaurarExemplo() {
    if (!window.confirm('Restaurar o exemplo? Os arquivos atuais serão substituídos.')) return;
    setArquivos(EXEMPLO);
    setAtivoId(EXEMPLO[0].id);
    setMensagem('');
  }

  function executarAgora() {
    clearTimeout(timer.current);
    setConsole([]);
    setPrevia(montarPrevia(arquivos));
  }

  const extensoes = useMemo(() => (ativo ? [linguagem(ativo.name)] : []), [ativo?.name]);
  const paletaAtual = PALETAS.find((p) => p.id === paleta) || PALETAS[0];

  return (
    <section className="code-studio" data-palette={paleta} data-mode={modo}>
      <header className="cs-toolbar">
        <div className="cs-tabs" role="tablist" aria-label="Arquivos">
          {arquivos.map((f) => (
            <div key={f.id} className={`cs-tab${f.id === ativo?.id ? ' is-active' : ''}`}>
              <button type="button" role="tab" aria-selected={f.id === ativo?.id} onClick={() => setAtivoId(f.id)}>
                {f.name}
              </button>
              {arquivos.length > 1 && (
                <button type="button" className="cs-tab-close" onClick={() => removerArquivo(f.id)} aria-label={`Remover ${f.name}`}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" className="cs-add" onClick={novoArquivo}>+ Arquivo</button>
        </div>

        <div className="cs-acoes">
          <button type="button" className="cs-botao primary" onClick={executarAgora}>Executar</button>
          <div className="cs-paleta">
            <button type="button" className="cs-botao" onClick={() => setMenuPaleta((v) => !v)} aria-expanded={menuPaleta}>
              Paleta: {paletaAtual.nome}
            </button>
            {menuPaleta && (
              <div className="cs-menu" role="menu">
                {PALETAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={p.id === paleta}
                    className={p.id === paleta ? 'is-active' : ''}
                    onClick={() => {
                      setPaleta(p.id);
                      setMenuPaleta(false);
                    }}
                  >
                    <span className="cs-swatches">
                      {p.cores.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                    {p.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="cs-botao" onClick={() => setModo(modo === 'dark' ? 'light' : 'dark')}>
            {modo === 'dark' ? 'Claro' : 'Escuro'}
          </button>
          <button type="button" className="cs-botao" onClick={restaurarExemplo}>Exemplo</button>
        </div>
      </header>

      {mensagem && <p className="cs-aviso" role="status">{mensagem}</p>}

      <div className="cs-corpo">
        <div className="cs-editor">
          {ativo && (
            <CodeMirror
              key={ativo.id}
              value={ativo.content}
              height="100%"
              theme={modo}
              extensions={extensoes}
              onChange={atualizarConteudo}
              basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true }}
            />
          )}
        </div>

        <div className="cs-saida">
          <div className="cs-previa-cabecalho">
            <span>Prévia</span>
          </div>
          <iframe
            className="cs-previa"
            title="Prévia do projeto"
            sandbox="allow-scripts"
            srcDoc={previa}
          />
          <div className="cs-console">
            <div className="cs-console-cabecalho">
              <span>Console</span>
              <button type="button" className="cs-botao small" onClick={() => setConsole([])}>Limpar</button>
            </div>
            <ul>
              {console_.length === 0 && <li className="cs-console-vazio">Nenhuma mensagem ainda. Use console.log no seu código.</li>}
              {console_.map((linha, i) => (
                <li key={i} className={`is-${linha.tipo}`}>{linha.texto}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
