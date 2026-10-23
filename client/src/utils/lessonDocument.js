// Motor do modelo de conteúdo: organiza qualquer aula no desenho padrão (ver docs/MODELO-DE-CONTEUDO.md).
// Roda na exibição, então todo curso (novo ou importado) sai igual; só as cores mudam pelo tema.

const HEADINGS = ['H1', 'H2', 'H3', 'H4'];
const NOTE_PATTERN = /^\s*(?:<strong>)?\s*(Dica|Nota|Observação|Importante|Resumo|Lembre-se|Atenção)\b/i;
const BLOCK_TAGS = ['P', 'UL', 'OL', 'PRE', 'DIV', 'TABLE', 'BLOCKQUOTE', 'FIGURE'];

function el(doc, tag, className) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

function hasText(node) {
  return (node.textContent || '').replace(/ /g, ' ').trim().length > 0 || node.querySelector('iframe, img, pre');
}

// Desembrulha divs e spans sem classe (o estilo do autor já foi descartado), mantendo o conteúdo.
function unwrapPlain(root) {
  let changed = true;
  while (changed) {
    changed = false;
    root.querySelectorAll('div, span').forEach((node) => {
      if (node.className || node.querySelector(':scope > .video-embed')) return;
      if (node.tagName === 'DIV' && node.querySelector(':scope > iframe')) return;
      if (node.tagName === 'DIV' && node.querySelector('iframe, img') ) {
        // wrappers de mídia ficam
        if (node.children.length === 1 && node.firstElementChild.tagName === 'IFRAME') return;
      }
      if (!node.parentNode) return;
      node.replaceWith(...node.childNodes);
      changed = true;
    });
  }
}

function isEmptyBlock(node) {
  if (node.nodeType === 3) return !node.textContent.trim();
  if (node.nodeType !== 1) return true;
  if (['IMG', 'IFRAME', 'PRE', 'UL', 'OL', 'TABLE'].includes(node.tagName)) return false;
  if (node.classList.contains('video-embed')) return false;
  return !hasText(node);
}

// Converte o conteúdo em seções: intro (cartão de tópico) + seções com título + notas e feedbacks.
export function buildLessonDocument(html = '') {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;

  unwrapPlain(body);

  // Marcadores "•" digitados à mão no início de itens e parágrafos: o modelo já desenha o marcador.
  body.querySelectorAll('li, p').forEach((node) => {
    const walker = doc.createTreeWalker(node, 4); // SHOW_TEXT
    let text = walker.nextNode();
    while (text && !text.textContent.trim()) text = walker.nextNode();
    if (text) text.textContent = text.textContent.replace(/^\s*[•·▪‣]\s*/, '');
  });

  // Notas (Dica, Nota, Atenção...) em qualquer nível: viram cartão de nota no lugar do parágrafo.
  body.querySelectorAll('p').forEach((p) => {
    if (p.closest('.atlas-note') || !NOTE_PATTERN.test(p.innerHTML)) return;
    const note = doc.createElement('div');
    const warn = /^\s*(?:<strong>)?\s*Aten[cç][aã]o/i.test(p.innerHTML);
    note.className = warn ? 'atlas-note atlas-note--warn' : 'atlas-note atlas-note--info';
    p.replaceWith(note);
    note.appendChild(p);
  });

  const nodes = [...body.childNodes].filter((node) => !isEmptyBlock(node));
  const out = doc.createElement('div');
  out.className = 'atlas-doc';

  let intro = [];
  let section = null;

  const flushIntro = () => {
    if (intro.length === 0) return;
    const hasWords = intro.some((node) => hasText(node));
    if (hasWords) {
      const card = el(doc, 'div', 'atlas-topic atlas-topic--accent');
      intro.forEach((node) => card.appendChild(node));
      out.appendChild(card);
    }
    intro = [];
  };

  const openSection = (headingNode) => {
    flushIntro();
    section = el(doc, 'div', 'atlas-section');
    const title = el(doc, 'h4', 'atlas-section-title');
    title.innerHTML = headingNode.innerHTML;
    section.appendChild(title);
    out.appendChild(section);
  };

  const place = (node) => {
    if (node.nodeType === 1 && HEADINGS.includes(node.tagName)) {
      openSection(node);
      return;
    }
    if (node.nodeType === 1 && node.tagName === 'P' && NOTE_PATTERN.test(node.innerHTML)) {
      const note = el(doc, 'div', /Aten[cç][aã]o/i.test(node.innerHTML.slice(0, 40)) ? 'atlas-note atlas-note--warn' : 'atlas-note atlas-note--info');
      note.appendChild(node);
      (section || out).appendChild(note);
      return;
    }
    if (section) section.appendChild(node);
    else intro.push(node);
  };

  nodes.forEach(place);
  flushIntro();

  // Nada de ficar sem cartão: conteúdo solto vira um bloco simples.
  out.querySelectorAll('.atlas-note > p.callout').forEach((p) => p.classList.remove('callout'));

  return out.innerHTML;
}
