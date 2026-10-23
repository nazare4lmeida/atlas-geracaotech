import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import '../../styles/editor-cores.css';

// Prévia de cores no código: mostra uma amostra ao lado de cada cor (#hex, rgb(), rgba(), hsl(), hsla())
// e, ao clicar na cor, abre o seletor. A cor escolhida é escrita de volta no mesmo formato do código.

const COR_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?)\(\s*[^()\n]*\)/g;

const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

// Lê o texto de uma cor e devolve formato, canais RGB (0-255) e alfa (0-1).
function lerCor(texto) {
  if (texto.startsWith('#')) {
    let hex = texto.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const temAlpha = hex.length === 8;
    return {
      nome: '#',
      temAlpha,
      alpha: temAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      rgb: [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    };
  }

  const abre = texto.indexOf('(');
  const nome = texto.slice(0, abre).toLowerCase();
  const partes = texto.slice(abre + 1, -1).split(/[\s,/]+/).filter(Boolean);
  if (partes.length < 3) return null;

  const numero = (valor) => parseFloat(valor);
  const pct = (valor) => valor.endsWith('%');
  const temAlpha = partes.length > 3;
  const alpha = temAlpha ? (pct(partes[3]) ? numero(partes[3]) / 100 : numero(partes[3])) : 1;

  if (nome.startsWith('hsl')) {
    const [h, s, l] = [numero(partes[0]), numero(partes[1]) / 100, numero(partes[2]) / 100];
    return { nome, temAlpha, alpha, rgb: hslParaRgb(h, s, l) };
  }

  const canal = (valor) => (pct(valor) ? numero(valor) * 2.55 : numero(valor));
  return { nome, temAlpha, alpha, rgb: [canal(partes[0]), canal(partes[1]), canal(partes[2])] };
}

function hslParaRgb(h, s, l) {
  const matiz = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [canal(matiz + 1 / 3) * 255, canal(matiz) * 255, canal(matiz - 1 / 3) * 255];
}

function rgbParaHsl(r, g, b) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

// Escreve a cor escolhida no formato original (hex, rgb, rgba, hsl ou hsla), mantendo o alfa.
function formatarCor(info, [r, g, b]) {
  const alpha = Math.round(info.alpha * 100) / 100;
  if (info.nome === '#') {
    return `#${hex2(r)}${hex2(g)}${hex2(b)}${info.temAlpha ? hex2(info.alpha * 255) : ''}`;
  }
  if (info.nome.startsWith('hsl')) {
    const [h, s, l] = rgbParaHsl(r, g, b);
    const base = `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
    return `${info.nome}(${info.temAlpha ? `${base}, ${alpha}` : base})`;
  }
  const base = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
  return `${info.nome}(${info.temAlpha ? `${base}, ${alpha}` : base})`;
}

const paraHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const deHex = (valor) => [parseInt(valor.slice(1, 3), 16), parseInt(valor.slice(3, 5), 16), parseInt(valor.slice(5, 7), 16)];

let seletorAberto = null;

// Abre o seletor nativo de cores na posição do clique. Cada escolha troca a cor no texto.
function abrirSeletor(view, evento, faixa, info) {
  seletorAberto?.remove();

  const input = document.createElement('input');
  input.type = 'color';
  input.value = paraHex(info.rgb.map((c) => Math.round(c)));
  Object.assign(input.style, {
    position: 'fixed',
    left: `${evento.clientX}px`,
    top: `${evento.clientY}px`,
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
    border: '0',
    padding: '0'
  });
  document.body.appendChild(input);
  seletorAberto = input;

  let { from, to } = faixa;
  input.addEventListener('input', () => {
    const texto = formatarCor(info, deHex(input.value));
    view.dispatch({ changes: { from, to, insert: texto } });
    to = from + texto.length;
  });
  input.addEventListener('change', () => {
    input.remove();
    if (seletorAberto === input) seletorAberto = null;
  });

  try {
    if (input.showPicker) input.showPicker();
    else input.click();
  } catch {
    input.click();
  }
}

// Amostra da cor, mostrada logo antes do texto da cor.
class Amostra extends WidgetType {
  constructor(cor) {
    super();
    this.cor = cor;
  }

  eq(outra) {
    return outra.cor === this.cor;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-cor-amostra';
    span.style.background = this.cor;
    span.title = 'Clique na cor para escolher outra';
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

function construir(view) {
  const decoracoes = [];
  for (const { from, to } of view.visibleRanges) {
    const texto = view.state.sliceDoc(from, to);
    for (const m of texto.matchAll(COR_REGEX)) {
      const inicio = from + m.index;
      const fim = inicio + m[0].length;
      decoracoes.push(Decoration.widget({ widget: new Amostra(m[0]), side: -1 }).range(inicio));
      decoracoes.push(Decoration.mark({ class: 'cm-cor-texto' }).range(inicio, fim));
    }
  }
  return Decoration.set(decoracoes, true);
}

const previaPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = construir(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) this.decorations = construir(update.view);
    }
  },
  {
    decorations: (valor) => valor.decorations,
    eventHandlers: {
      mousedown(evento, view) {
        if (evento.button !== 0) return false;
        const pos = view.posAtCoords({ x: evento.clientX, y: evento.clientY });
        if (pos == null) return false;

        const linha = view.state.doc.lineAt(pos);
        for (const m of linha.text.matchAll(COR_REGEX)) {
          const from = linha.from + m.index;
          const to = from + m[0].length;
          if (pos >= from && pos <= to) {
            const info = lerCor(m[0]);
            if (info) abrirSeletor(view, evento, { from, to }, info);
            break;
          }
        }
        return false;
      }
    }
  }
);

export function previaDeCores() {
  return [previaPlugin];
}
