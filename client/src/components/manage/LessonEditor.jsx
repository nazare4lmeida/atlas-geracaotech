import { useEffect, useState } from 'react';
import { EditorContent, Extension, Mark, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import api from '../../services/api';

// Cores do material: sempre do tema do curso. Guardamos o nome do tom (lc-primary...) e não a cor,
// porque o aluno vê o texto sem o estilo inline. Veja `.lesson-html .lc-*` em course.css.
const TONES = [
  { id: 'primary', label: 'Cor do curso' },
  { id: 'danger', label: 'Vermelho' },
  { id: 'ok', label: 'Verde' },
  { id: 'warn', label: 'Âmbar' }
];

const ThemeTone = Mark.create({
  name: 'themeTone',
  addAttributes() {
    return { tone: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: 'span[class*="lc-"]',
        getAttrs: (el) => {
          const cls = [...el.classList].find((name) => name.startsWith('lc-'));
          return cls ? { tone: cls.slice(3) } : false;
        }
      }
    ];
  },
  renderHTML({ mark }) {
    return ['span', { class: `lc-${mark.attrs.tone}` }, 0];
  },
  addCommands() {
    return {
      setTone:
        (tone) =>
        ({ commands }) =>
          commands.setMark(this.name, { tone }),
      unsetTone:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name)
    };
  }
});

// Estilos de parágrafo e título (centro, linha lateral, caixa, destaque). Guardamos o nome do estilo e a
// classe é `atlas-bloco-<nome>`; as cores vêm do tema do curso. Veja `.lesson-html .atlas-bloco-*` em aulas-blocos.css.
const ESTILOS_BLOCO = [
  { id: 'centro', label: 'Centralizado' },
  { id: 'lateral', label: 'Linha lateral' },
  { id: 'caixa', label: 'Caixa com borda' },
  { id: 'destaque', label: 'Fundo de destaque' }
];

const BlocoEstilo = Extension.create({
  name: 'blocoEstilo',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          estilo: {
            default: null,
            parseHTML: (el) => {
              const classe = [...el.classList].find((nome) => nome.startsWith('atlas-bloco-'));
              return classe ? classe.slice('atlas-bloco-'.length) : null;
            },
            renderHTML: (attrs) => (attrs.estilo ? { class: `atlas-bloco-${attrs.estilo}` } : {})
          }
        }
      }
    ];
  }
});

// Imagem com o id do arquivo (data-media) e largura em pixels (atributo width, que sobrevive à limpeza).
const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width'),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {})
      },
      'data-media': {
        default: null,
        parseHTML: (el) => el.getAttribute('data-media'),
        renderHTML: (attrs) => (attrs['data-media'] ? { 'data-media': attrs['data-media'] } : {})
      }
    };
  }
});

const SIZES = [
  { label: 'Pequena', width: 320 },
  { label: 'Média', width: 560 },
  { label: 'Grande', width: 800 },
  { label: 'Original', width: null }
];

// Conteúdo que o editor visual não representa sem perder a estrutura (caixas, quiz, vídeo embutido).
// Nesses casos o professor edita o HTML, para não achatar o material.
export function needsHtmlMode(html = '') {
  return /<(div|button|iframe|table|svg|script|style)\b|\sstyle=/i.test(html);
}

function toEditableHtml(value = '') {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n+/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
}

export default function LessonEditor({ value, onChange }) {
  const [htmlMode, setHtmlMode] = useState(() => needsHtmlMode(value));
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      ThemeTone,
      BlocoEstilo,
      MediaImage.configure({ allowBase64: false })
    ],
    content: toEditableHtml(value),
    editorProps: {
      attributes: { class: 'lesson-editor-surface lesson-html', spellcheck: 'true' }
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML())
  });

  // Ao trocar de aula, o editor recebe o novo conteúdo.
  useEffect(() => {
    if (!editor || htmlMode) return;
    if (editor.getHTML() !== toEditableHtml(value) && value !== editor.getHTML()) {
      editor.commands.setContent(toEditableHtml(value), false);
    }
  }, [value, editor, htmlMode]);

  if (htmlMode || !editor) {
    return (
      <div className="lesson-editor">
        {needsHtmlMode(value) && (
          <p className="lesson-editor-note">
            Esta aula tem blocos do modelo (cartões, quiz ou mídia embutida). O editor visual os achataria, então
            o conteúdo fica em HTML. Você ainda pode editar o texto aqui.
          </p>
        )}
        <textarea
          name="content"
          rows="12"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
        {!needsHtmlMode(value) && (
          <button type="button" className="ghost-button small" onClick={() => setHtmlMode(false)}>
            Voltar ao editor visual
          </button>
        )}
      </div>
    );
  }

  const run = (fn) => () => fn(editor.chain().focus()).run();

  // Estilo do bloco em que o cursor está (título ou parágrafo).
  const tipoBloco = editor.isActive('heading') ? 'heading' : 'paragraph';
  const estiloAtual = editor.getAttributes(tipoBloco).estilo || null;
  const aplicarEstilo = (estilo) => editor.chain().focus().updateAttributes(tipoBloco, { estilo }).run();

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const { data } = await api.post('/media', file, { headers: { 'Content-Type': file.type } });
      editor.chain().focus().setImage({ src: data.url, alt: '', 'data-media': data.path }).run();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const imageSelected = editor.isActive('image');

  return (
    <div className="lesson-editor">
      <div className="lesson-editor-toolbar" role="toolbar" aria-label="Formatação do texto">
        <button type="button" className={editor.isActive('bold') ? 'is-on' : ''} onClick={run((c) => c.toggleBold())} aria-label="Negrito">
          <strong>N</strong>
        </button>
        <button type="button" className={editor.isActive('italic') ? 'is-on' : ''} onClick={run((c) => c.toggleItalic())} aria-label="Itálico">
          <em>I</em>
        </button>
        <button type="button" className={editor.isActive('underline') ? 'is-on' : ''} onClick={run((c) => c.toggleUnderline())} aria-label="Sublinhado">
          <u>S</u>
        </button>
        <span className="lesson-editor-sep" />
        <button type="button" className={editor.isActive('heading', { level: 3 }) ? 'is-on' : ''} onClick={run((c) => c.toggleHeading({ level: 3 }))}>
          Título
        </button>
        <button type="button" className={editor.isActive('bulletList') ? 'is-on' : ''} onClick={run((c) => c.toggleBulletList())}>
          Lista
        </button>
        <button type="button" className={editor.isActive('orderedList') ? 'is-on' : ''} onClick={run((c) => c.toggleOrderedList())}>
          Numerada
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Endereço do link (começando com https://)');
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
        >
          Link
        </button>
        <span className="lesson-editor-sep" />
        {TONES.map((tone) => (
          <button
            key={tone.id}
            type="button"
            className={`lesson-editor-tone lc-swatch-${tone.id} ${editor.isActive('themeTone', { tone: tone.id }) ? 'is-on' : ''}`}
            onClick={run((c) => c.setTone(tone.id))}
            aria-label={`Colorir: ${tone.label}`}
            title={tone.label}
          />
        ))}
        <button type="button" onClick={run((c) => c.unsetTone())}>
          Sem cor
        </button>
        <span className="lesson-editor-sep" />
        {ESTILOS_BLOCO.map((item) => (
          <button
            key={item.id}
            type="button"
            className={estiloAtual === item.id ? 'is-on' : ''}
            onClick={() => aplicarEstilo(estiloAtual === item.id ? null : item.id)}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
        <span className="lesson-editor-sep" />
        <label className={`lesson-editor-upload ${uploading ? 'is-busy' : ''}`}>
          {uploading ? 'Enviando...' : 'Inserir imagem'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickImage} disabled={uploading} />
        </label>
      </div>

      {imageSelected && (
        <div className="lesson-editor-toolbar lesson-editor-image-bar" role="toolbar" aria-label="Imagem selecionada">
          <span>Imagem:</span>
          {SIZES.map((size) => (
            <button
              key={size.label}
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: size.width }).run()}
            >
              {size.label}
            </button>
          ))}
          <button type="button" className="danger-button small" onClick={() => editor.chain().focus().deleteSelection().run()}>
            Remover imagem
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      <div className="lesson-editor-foot">
        {message && <span className="lesson-editor-error">{message}</span>}
        <button type="button" className="ghost-button small" onClick={() => setHtmlMode(true)}>
          Editar HTML
        </button>
      </div>
    </div>
  );
}
