import { useEffect, useRef, useState } from 'react';

// Edição manual: o conteúdo aparece como o aluno vê e pode ser editado direto nele.
// Cada mudança é devolvida em HTML (onChange), então a aba de código acompanha ao vivo.
// Destaques usam as classes lc-* (cor do curso) e os blocos usam atlas-bloco-* (mesmas do aluno).

const TONS = [
  { id: 'primary', label: 'Cor do curso' },
  { id: 'danger', label: 'Vermelho' },
  { id: 'ok', label: 'Verde' },
  { id: 'warn', label: 'Âmbar' }
];

const BLOCOS = [
  { id: 'lateral', label: 'Linha lateral' },
  { id: 'caixa', label: 'Caixa com borda' },
  { id: 'destaque', label: 'Fundo de destaque' }
];

const CARTAO = '<div class="atlas-bloco-caixa"><p><strong>Título do cartão</strong></p><p>Texto do cartão.</p></div>';

export default function ManualEditor({ value, onChange }) {
  const root = useRef(null);
  const emitido = useRef(null);
  const [tom, setTom] = useState('primary');

  // Só repõe o HTML quando a mudança veio de fora (ex.: aba de código). Assim o cursor não pula.
  useEffect(() => {
    const el = root.current;
    if (el && value !== emitido.current) {
      el.innerHTML = value || '';
      emitido.current = value || '';
    }
  }, [value]);

  function emitir() {
    const el = root.current;
    if (!el) return;
    const vazio = !el.textContent.trim() && !el.querySelector('img, iframe, video');
    const html = vazio ? '' : el.innerHTML;
    emitido.current = html;
    onChange(html);
  }

  // Garante que a ação acontece dentro do editor (se o cursor estiver fora, vai para o fim).
  function garantirFoco() {
    const el = root.current;
    const sel = window.getSelection();
    if (!el) return;
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      el.focus();
      const intervalo = document.createRange();
      intervalo.selectNodeContents(el);
      intervalo.collapse(false);
      sel.removeAllRanges();
      sel.addRange(intervalo);
    }
  }

  function comando(nome, valor) {
    garantirFoco();
    document.execCommand(nome, false, valor);
    emitir();
  }

  function destacarTexto() {
    garantirFoco();
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const intervalo = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = `lc-${tom}`;
    try {
      intervalo.surroundContents(span);
    } catch {
      span.appendChild(intervalo.extractContents());
      intervalo.insertNode(span);
    }
    emitir();
  }

  function tirarDestaque() {
    garantirFoco();
    const sel = window.getSelection();
    const no = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const span = no && no.closest('span[class^="lc-"]');
    if (!span || !root.current.contains(span)) return;
    while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
    span.remove();
    emitir();
  }

  // Bloco do cursor: o filho direto da área de edição (parágrafo, título, lista ou um bloco já criado).
  function blocoNoCursor() {
    const el = root.current;
    const sel = window.getSelection();
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) return null;
    let no = sel.anchorNode;
    while (no && no.parentNode !== el) no = no.parentNode;
    if (!no || no === el) return null;
    if (no.nodeType === Node.TEXT_NODE) {
      const p = document.createElement('p');
      el.insertBefore(p, no);
      p.appendChild(no);
      return p;
    }
    return no;
  }

  function alternarBloco(classe) {
    garantirFoco();
    const bloco = blocoNoCursor();
    if (!bloco) return;
    const ehBloco = bloco.tagName === 'DIV' && [...bloco.classList].some((nome) => nome.startsWith('atlas-bloco-'));
    if (ehBloco) {
      if (bloco.classList.contains(classe)) {
        // Mesmo bloco clicado de novo: tira a moldura e mantém o conteúdo.
        while (bloco.firstChild) bloco.parentNode.insertBefore(bloco.firstChild, bloco);
        bloco.remove();
      } else {
        bloco.className = classe;
      }
    } else {
      const moldura = document.createElement('div');
      moldura.className = classe;
      root.current.insertBefore(moldura, bloco);
      moldura.appendChild(bloco);
    }
    emitir();
  }

  function inserirCartao() {
    garantirFoco();
    document.execCommand('insertHTML', false, CARTAO);
    emitir();
  }

  // Colar só texto puro: evita trazer estilos do Word ou de sites para dentro do curso.
  function colar(event) {
    event.preventDefault();
    const texto = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, texto);
    emitir();
  }

  const botao = (rotulo, acao, titulo) => (
    <button
      type="button"
      className="ghost-button manual-editor-btn"
      title={titulo || rotulo}
      onMouseDown={(event) => event.preventDefault()}
      onClick={acao}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="manual-editor-wrap">
      <div className="manual-editor-toolbar" role="toolbar" aria-label="Ferramentas de edição">
        <div className="manual-editor-grupo">
          {botao('Título', () => comando('formatBlock', 'h2'))}
          {botao('Texto', () => comando('formatBlock', 'p'))}
        </div>
        <div className="manual-editor-grupo">
          {botao('N', () => comando('bold'), 'Negrito')}
          {botao('I', () => comando('italic'), 'Itálico')}
          {botao('S', () => comando('underline'), 'Sublinhado')}
          {botao('Esquerda', () => comando('justifyLeft'))}
          {botao('Centralizado', () => comando('justifyCenter'))}
        </div>
        <div className="manual-editor-grupo">
          <select value={tom} onChange={(event) => setTom(event.target.value)} aria-label="Cor do destaque">
            {TONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {botao('Destacar texto', destacarTexto)}
          {botao('Tirar destaque', tirarDestaque)}
        </div>
        <div className="manual-editor-grupo">
          {BLOCOS.map((item) => (
            <span key={item.id}>{botao(item.label, () => alternarBloco(`atlas-bloco-${item.id}`))}</span>
          ))}
          {botao('Inserir cartão', inserirCartao)}
        </div>
      </div>

      <div
        ref={root}
        className="lesson-content lesson-html manual-editor"
        contentEditable={true}
        suppressContentEditableWarning
        spellCheck={true}
        role="textbox"
        aria-multiline="true"
        aria-label="Conteúdo da aula (edição manual)"
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={emitir}
        onBlur={emitir}
        onPaste={colar}
      />
      <p className="manual-editor-hint">Edite o texto como o aluno vê. Cada mudança aparece também na aba de código HTML.</p>
    </div>
  );
}
