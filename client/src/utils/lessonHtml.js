import DOMPurify from 'dompurify';
import { interpretStyledContent } from './contentTemplate';
import { buildLessonDocument } from './lessonDocument';

// Conteúdo de aulas: aceita HTML (ex.: material convertido do Moodle) e o limpa antes de exibir.
// Estilos fixos, scripts e iframes de sites fora da lista são removidos; a aparência vem do layout do curso.

const ALLOWED_EMBEDS = [
  /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//,
  /^https:\/\/player\.vimeo\.com\/video\//,
  /^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview/,
  /^https:\/\/docs\.google\.com\/(presentation|document|spreadsheets)\/d\/[^/]+\/embed/
];

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'IFRAME') {
      const src = node.getAttribute('src') || '';
      if (!ALLOWED_EMBEDS.some((pattern) => pattern.test(src))) {
        const wrapper = node.parentElement;
        node.remove();
        if (wrapper?.classList.contains('video-embed')) wrapper.remove();
        return;
      }
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noreferrer noopener');
    }
  });
}

export function looksLikeHtml(text = '') {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

// Substitui os marcadores de personalização do Moodle pelos dados do aluno e remove emojis (o layout usa ícones e títulos).
// `{GENERICO:type=NomeUsuario}` vira o nome; outros marcadores que sobrarem são removidos.
export function personalizeText(text = '', { name = '', html = false } = {}) {
  const safeName = html ? escapeHtml(name) : name;
  return text
    .replace(/\{GENERICO:type=NomeUsuario\}/g, safeName)
    .replace(/\{GENERICO:[^}]*\}/g, '')
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Arquivos anexados no Moodle (@@PLUGINFILE@@) não foram copiados. Em vez de imagem quebrada, mostra o texto alternativo.
function replaceMissingFiles(html) {
  return html
    .replace(/<img\b[^>]*src="@@PLUGINFILE@@[^"]*"[^>]*>/gi, (tag) => {
      const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || 'Imagem';
      return `<span class="media-missing">[Imagem não migrada: ${alt}]</span>`;
    })
    .replace(/<a\b[^>]*href="@@PLUGINFILE@@[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, (_, label) => {
      return `<span class="media-missing">${label} (arquivo não migrado)</span>`;
    });
}

// Dá hierarquia visual ao texto corrido do Moodle: destaques (Dica, Nota...), feedbacks (Correto/Incorreto)
// e títulos de teste. Também remove o "•" digitado à mão antes de itens de lista, que vira marcador duplo.
export function enhanceLessonHtml(html = '') {
  return html
    // Iframes soltos ganham um contêiner 16:9, senão colapsam para altura zero.
    .replace(/(<div class="video-embed">\s*)?<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi, (match, wrapped, attrs) =>
      wrapped ? match : `<div class="video-embed"><iframe${attrs}></iframe></div>`
    )
    .replace(/<li>(\s|&nbsp;)*•(\s|&nbsp;)*/gi, '<li>')
    .replace(/<p>(\s|&nbsp;)*•(\s|&nbsp;)*/gi, '<p>')
    .replace(
      /<p>((?:\s*<strong>)?\s*(?:Dica|Nota|Atenção|Importante|Resumo|Observação|Lembre-se)\b)/gi,
      '<p class="callout">$1'
    )
    .replace(/<(p|div)>(\s*(?:<strong>)?\s*)(Correto!?|Incorreto\.?)/gi, (_, tag, lead, word) => {
      const ok = /^correto/i.test(word);
      return `<${tag} class="feedback ${ok ? 'is-correct' : 'is-wrong'}">${lead}${word}`;
    })
    .replace(
      /<(p|div|h[1-6])([^>]*)>(\s*(?:<strong>)?\s*)(Teste seu Conhecimento|Quiz rápido|QUIZ RÁPIDO)/gi,
      (_, tag, attrs, lead, title) => `<${tag}${attrs} class="quiz-title">${lead}${title}`
    );
}

// Tempo estimado de leitura (≈ 200 palavras por minuto), a partir do texto da aula.
export function readingMinutes(content = '') {
  const text = looksLikeHtml(content) ? content.replace(/<[^>]+>/g, ' ') : content;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}


// Quizzes embutidos no material (Moodle): o botão tem onclick e o feedback vem oculto. O sanitizador remove os dois,
// então antes de limpar marcamos cada alternativa com o gabarito e ligamos cada alternativa ao seu feedback.
const CORRECT_START = /^\W*correto\b/i;

function feedbackFor(button, doc) {
  const onclick = button.getAttribute('onclick') || '';
  const numbered = onclick.match(/verificarQ(\d+)\(\s*'(acerto|erro)'/);
  if (numbered) {
    const correct = numbered[2] === 'acerto';
    const el = doc.getElementById(`msg_q${numbered[1]}_${correct ? 'ok' : 'no'}`);
    return el ? { el, correct } : null;
  }
  const single = onclick.match(/\(\s*'([^']+)'\s*\)/);
  if (!single) return null;
  const el = doc.getElementById(`feedback-${single[1]}`);
  if (!el) return null;
  return { el, correct: CORRECT_START.test((el.textContent || '').trim()) };
}

function commonAncestor(a, b) {
  const ancestors = new Set();
  for (let node = a; node; node = node.parentElement) ancestors.add(node);
  for (let node = b; node; node = node.parentElement) {
    if (ancestors.has(node)) return node;
  }
  return null;
}

function markInlineQuizzes(html) {
  if (typeof DOMParser === 'undefined' || !/onclick=/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  let count = 0;
  doc.body.querySelectorAll('button[onclick]').forEach((button) => {
    const target = feedbackFor(button, doc);
    if (!target) return;
    let root = commonAncestor(button, target.el);
    if (!root || root === doc.body || root.classList.contains('atlas-doc')) root = button.parentElement;
    if (!root) return;
    if (!root.hasAttribute('data-quiz-root')) root.setAttribute('data-quiz-root', String(++count));
    const token = `${root.getAttribute('data-quiz-root')}-${target.el.id || Math.random().toString(36).slice(2, 8)}`;
    button.setAttribute('data-quiz-target', token);
    button.setAttribute('data-correct', String(target.correct));
    target.el.setAttribute('data-quiz-feedback', token);
    target.el.setAttribute('data-correct', String(target.correct));
    target.el.classList.add('quiz-answer-feedback');
  });
  return doc.body.innerHTML;
}

// Chamado pelo clique no botão de uma alternativa: trava o quiz, marca a escolha e mostra o feedback dela.
export function answerInlineQuiz(button) {
  const root = button.closest('[data-quiz-root]');
  if (!root || root.dataset.answered === 'true') return;
  root.dataset.answered = 'true';
  const token = button.getAttribute('data-quiz-target');
  root.querySelectorAll('button[data-quiz-target]').forEach((option) => {
    option.disabled = true;
    if (option.dataset.correct === 'true') option.classList.add('is-correct');
    else if (option === button) option.classList.add('is-wrong');
  });
  root.querySelectorAll('[data-quiz-feedback]').forEach((el) => {
    el.classList.toggle('is-open', el.getAttribute('data-quiz-feedback') === token);
  });
}

export function sanitizeLessonHtml(html = '', options = {}) {
  installHooks();
  const prepared = replaceMissingFiles(
    markInlineQuizzes(
      buildLessonDocument(enhanceLessonHtml(interpretStyledContent(personalizeText(html, { ...options, html: true })))),
    )
  );
  return DOMPurify.sanitize(prepared, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['style', 'onclick']
  });
}
