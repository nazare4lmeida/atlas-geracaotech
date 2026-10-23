// Modelo único de conteúdo das aulas.
// Os professores escrevem com estilos inline (ex.: o modelo de tópico do Moodle). Aqui os estilos são lidos e
// trocados por classes do layout (atlas-*). Assim todas as aulas ficam iguais; só as cores mudam por curso.

function parseStyle(text = '') {
  const map = {};
  text.split(';').forEach((rule) => {
    const index = rule.indexOf(':');
    if (index === -1) return;
    map[rule.slice(0, index).trim().toLowerCase()] = rule.slice(index + 1).trim();
  });
  return map;
}

function px(value) {
  const match = String(value || '').match(/([\d.]+)px/);
  return match ? parseFloat(match[1]) : 0;
}

// Largura e cor da borda esquerda, ex.: "5px solid #2563eb".
function leftBorder(style) {
  const shorthand = style['border-left'];
  if (shorthand) {
    return { width: px(shorthand), color: (shorthand.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/i) || [''])[0] };
  }
  return { width: px(style['border-left-width']), color: style['border-left-color'] || '' };
}

// Tom do chip pela cor de fundo: vermelho, amarelo, azul, verde ou neutro.
function toneOf(color = '') {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (!hex) return 'neutral';
  const n = parseInt(hex[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Fundos claros (pastel) têm pouca saturação, então comparamos a diferença entre os canais.
  if (r - g > 8 && r - b > 8) return 'danger';
  if (g - r > 8 && g - b > 8) return 'ok';
  if (b - r > 8 && b >= g) return 'info';
  if (Math.min(r, g) - b > 12) return 'warn';
  return 'neutral';
}

function addClass(el, name) {
  el.classList.add(name);
}

export function interpretStyledContent(html = '') {
  if (typeof DOMParser === 'undefined' || !/style=/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;

  // Primeiro os elementos mais internos, depois os de fora (a ordem decide se um bloco é tópico ou seção).
  const elements = [...body.querySelectorAll('*')].reverse();

  elements.forEach((el) => {
    const style = parseStyle(el.getAttribute('style') || '');
    const tag = el.tagName;
    const hasStyle = el.hasAttribute('style');

    if (tag === 'H3') addClass(el, 'atlas-topic-title');
    if (tag === 'H4') addClass(el, 'atlas-section-title');
    if (tag === 'A') addClass(el, 'atlas-link');

    if (tag === 'SPAN' && style['text-transform'] === 'uppercase') {
      addClass(el, 'atlas-kicker');
    } else if (tag === 'SPAN' && style['border'] && px(style['border-radius']) <= 10) {
      addClass(el, 'atlas-chip');
      addClass(el, `atlas-chip--${toneOf(style['background-color'] || style['background'])}`);
    } else if (tag === 'DIV') {
      const border = leftBorder(style);
      const padding = px(style.padding);
      const hasH3 = Boolean(el.querySelector(':scope > h3'));
      const hasH4 = Boolean(el.querySelector(':scope > h4'));
      const kickers = el.querySelector(':scope > span.atlas-kicker');
      const chips = el.querySelectorAll(':scope > span.atlas-chip');
      const background = style['background-color'] || style.background || '';
      const isTopic = border.width >= 4 && hasH3;
      const isNote = !isTopic && border.width >= 3 && border.width < 5 && padding <= 16 && !hasH4;

      // Estrutura de layout do Moodle é mantida como classe, senão os filhos se misturam.
      if (style.display === 'flex' && kickers) {
        addClass(el, 'atlas-topic-meta');
      } else if (style.display === 'flex' && chips.length > 0) {
        addClass(el, 'atlas-chips');
      } else if (style.display === 'flex') {
        addClass(el, style['flex-direction'] === 'column' ? 'atlas-stack' : 'atlas-row');
      }

      if (isTopic) {
        addClass(el, 'atlas-topic');
        addClass(el, 'atlas-topic--accent');
      } else if (isNote) {
        addClass(el, 'atlas-note');
        addClass(el, `atlas-note--${toneOf(border.color)}`);
      } else if (hasH4) {
        addClass(el, 'atlas-section');
      } else if (background || border.width > 0) {
        // Caixa com fundo ou borda: tom pelo fundo (pastel) ou, se for gradiente, pela borda.
        const hex = (background.match(/#[0-9a-f]{6}\b/i) || [''])[0];
        addClass(el, 'atlas-box');
        addClass(el, `atlas-box--${toneOf(hex || border.color)}`);
      }
    }

    if (hasStyle) el.removeAttribute('style');
  });

  return body.innerHTML;
}
