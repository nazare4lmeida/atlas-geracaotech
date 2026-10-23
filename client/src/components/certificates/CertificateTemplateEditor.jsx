import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';

export const TOKEN_LIST = [
  'NOME_DO_ALUNO',
  'CURSO',
  'PERIODO',
  'CARGA_HORARIA',
  'LOCAL',
  'DATA_EMISSAO',
  'CONTEUDO_PROGRAMATICO',
  'CODIGO_AUTENTICACAO'
];
const VARIABLE_KEYS = ['LOCAL', 'PERIODO', 'CARGA_HORARIA'];
const SAMPLE = {
  NOME_DO_ALUNO: 'Nome do aluno',
  CURSO: 'Nome do curso',
  PERIODO: 'mês/ano a mês/ano',
  CARGA_HORARIA: '192h/aula',
  LOCAL: 'Cidade',
  DATA_EMISSAO: '01 de janeiro de 2026',
  CONTEUDO_PROGRAMATICO: 'Módulo 01\n   Unidade 1\n   Unidade 2\n\nMódulo 02\n   Unidade 3',
  CODIGO_AUTENTICACAO: 'GT-FULLST-2026-0001'
};

function newField(patch = {}) {
  return {
    id: crypto.randomUUID(),
    tipo: 'texto',
    texto: 'Novo texto',
    x: 0.1,
    y: 0.1,
    w: 0.5,
    h: 0.08,
    tamanhoPt: 16,
    negrito: false,
    cor: '#091A38',
    alinhamento: 'left',
    ...patch
  };
}

export function defaultVersoFields() {
  return [
    newField({ texto: 'Conteúdo programático', x: 0.09, y: 0.12, w: 0.82, h: 0.08, tamanhoPt: 26, negrito: true }),
    newField({ texto: '{CURSO}', x: 0.09, y: 0.2, w: 0.82, h: 0.05, tamanhoPt: 14 }),
    newField({ texto: '{CONTEUDO_PROGRAMATICO}', x: 0.09, y: 0.28, w: 0.82, h: 0.6, tamanhoPt: 13 })
  ];
}

export function defaultFields() {
  return [
    newField({ texto: 'CERTIFICADO', x: 0.09, y: 0.22, w: 0.7, h: 0.1, tamanhoPt: 47, negrito: true }),
    newField({ texto: 'certifica que', x: 0.09, y: 0.36, w: 0.8, h: 0.05, tamanhoPt: 17 }),
    newField({ texto: '{NOME_DO_ALUNO}', x: 0.09, y: 0.5, w: 0.82, h: 0.06, tamanhoPt: 22, negrito: true, cor: '#087F91' }),
    newField({
      texto: 'participou do curso {CURSO}, realizado entre {PERIODO} com duração de {CARGA_HORARIA}.',
      x: 0.09,
      y: 0.6,
      w: 0.84,
      h: 0.09,
      tamanhoPt: 17
    }),
    newField({ texto: '{LOCAL}, {DATA_EMISSAO}', x: 0.6, y: 0.7, w: 0.3, h: 0.04, tamanhoPt: 12, alinhamento: 'right' }),
    newField({ tipo: 'qrcode', texto: '', x: 0.07, y: 0.74, w: 0.14, h: 0.2 }),
    newField({ texto: 'Código de autenticação: {CODIGO_AUTENTICACAO}', x: 0.07, y: 0.95, w: 0.45, h: 0.03, tamanhoPt: 9 })
  ];
}

function resolveSample(text) {
  return String(text).replace(/\{([A-Z_]+)\}/g, (match, key) => SAMPLE[key] ?? match);
}

// Editor visual: o fundo aparece como está, os campos ficam por cima e são arrastados e redimensionados.
export default function CertificateTemplateEditor({ templateId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [sides, setSides] = useState({
    frente: { background: '', config: { largura_pt: 893, altura_pt: 632, variaveis: {}, campos: [] } },
    verso: { background: '', config: { largura_pt: 893, altura_pt: 632, variaveis: {}, campos: [] } }
  });
  const [side, setSide] = useState('frente');
  const [selectedId, setSelectedId] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef(null);
  const backgroundRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    api
      .get(`/certificate-templates/${templateId}`)
      .then(({ data }) => {
        const { template } = data;
        setName(template.name);
        const withVariables = (config) => ({ ...config, variaveis: config.variaveis || {} });
        setSides({
          frente: { background: template.background, config: withVariables(template.config) },
          verso: template.verso
            ? { background: template.verso.background || '', config: withVariables(template.verso.config) }
            : { background: '', config: { largura_pt: 893, altura_pt: 632, variaveis: {}, campos: [] } }
        });
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  }, [templateId]);

  const current = sides[side];
  const config = current.config;
  const background = current.background;
  const fields = config.campos || [];
  const selected = fields.find((field) => field.id === selectedId) || null;

  const updateConfig = (updater) =>
    setSides((all) => ({ ...all, [side]: { ...all[side], config: updater(all[side].config) } }));
  const updateField = (id, patch) =>
    updateConfig((cfg) => ({
      ...cfg,
      campos: cfg.campos.map((field) => (field.id === id ? { ...field, ...patch } : field))
    }));

  const addField = (patch) => {
    const field = newField(patch);
    updateConfig((cfg) => ({ ...cfg, campos: [...cfg.campos, field] }));
    setSelectedId(field.id);
  };

  const removeField = (id) => {
    updateConfig((cfg) => ({ ...cfg, campos: cfg.campos.filter((field) => field.id !== id) }));
    setSelectedId(null);
  };

  // Delete / Backspace excluem o campo selecionado (fora de campos de texto).
  useEffect(() => {
    const onKey = (event) => {
      if (!selectedId) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
      event.preventDefault();
      removeField(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const switchSide = (next) => {
    setSide(next);
    setSelectedId(null);
    setUploadError('');
  };

  // Troca o fundo do lado atual (frente ou verso).
  const replaceBackground = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setUploadError('Use uma imagem PNG ou JPG.');
    if (file.size > 3 * 1024 * 1024) return setUploadError('A imagem passa de 3 MB.');
    const reader = new FileReader();
    reader.onload = () => {
      setUploadError('');
      setSides((all) => ({ ...all, [side]: { ...all[side], background: reader.result } }));
    };
    reader.readAsDataURL(file);
  };

  const insertToken = (token) => {
    if (!selected) return;
    updateField(selected.id, { texto: `${selected.texto}{${token}}` });
  };

  // Arrastar (mover) e puxar o canto (redimensionar), em frações do tamanho do fundo.
  const startDrag = (event, id, mode) => {
    event.preventDefault();
    event.stopPropagation();
    const field = fields.find((item) => item.id === id);
    const rect = stageRef.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, mode, startX: event.clientX, startY: event.clientY, rect, origin: { ...field } };
    setSelectedId(id);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.rect.width;
    const dy = (event.clientY - drag.startY) / drag.rect.height;
    const { origin } = drag;
    if (drag.mode === 'move') {
      updateField(drag.id, {
        x: Math.min(1 - origin.w, Math.max(0, origin.x + dx)),
        y: Math.min(1 - origin.h, Math.max(0, origin.y + dy))
      });
    } else {
      updateField(drag.id, {
        w: Math.min(1 - origin.x, Math.max(0.02, origin.w + dx)),
        h: Math.min(1 - origin.y, Math.max(0.02, origin.h + dy))
      });
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await api.put(`/certificate-templates/${templateId}`, {
        name,
        config: sides.frente.config,
        background: sides.frente.background,
        verso: sides.verso.background ? { background: sides.verso.background, config: sides.verso.config } : null
      });
      setFeedback({ type: 'success', text: 'Modelo salvo.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="muted-text">Carregando modelo…</p>;

  return (
    <div className="cert-editor">
      <div className="cert-editor-toolbar">
        <input className="cert-name-input" value={name} onChange={(event) => setName(event.target.value)} aria-label="Nome do modelo" />
        <label className="cert-check">
          <input type="checkbox" checked={showSample} onChange={(event) => setShowSample(event.target.checked)} /> Ver com dados de exemplo
        </label>
        <button type="button" className="primary-button" onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar modelo'}
        </button>
        <button type="button" className="ghost-button" onClick={onClose}>Voltar</button>
      </div>
      {feedback && <div className={`alert ${feedback.type === 'error' ? 'error' : 'success'}`}>{feedback.text}</div>}

      <div className="cert-side-bar">
        <div className="cert-side-tabs" role="tablist">
          {[['frente', 'Frente'], ['verso', 'Verso']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={side === key}
              className={`cert-side-tab${side === key ? ' is-active' : ''}`}
              onClick={() => switchSide(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="ghost-button" onClick={() => backgroundRef.current?.click()}>
          {background ? 'Trocar fundo' : 'Enviar fundo'}
        </button>
        <input
          ref={backgroundRef}
          type="file"
          accept="image/png,image/jpeg"
          hidden
          onChange={(event) => {
            replaceBackground(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {side === 'verso' && <span className="cert-hint">O verso é opcional. Sem fundo, não é emitido.</span>}
        {uploadError && <span className="cert-error">{uploadError}</span>}
      </div>

      {selected && (
        <div className="cert-selected-bar" role="toolbar" aria-label="Campo selecionado">
          <span>
            Campo selecionado: <strong>{selected.tipo === 'qrcode' ? 'QR code' : selected.texto.slice(0, 40) || 'texto vazio'}</strong>
          </span>
          <button type="button" className="cert-delete-button" onClick={() => removeField(selected.id)}>
            Excluir campo
          </button>
          <span className="cert-hint">ou tecla Delete</span>
        </div>
      )}

      <div className="cert-editor-body">
        <div className="cert-stage-wrap">
          {!background && <p className="cert-hint">Este lado ainda não tem fundo. Envie uma imagem para editar os campos.</p>}
          <div
            className="cert-stage"
            ref={stageRef}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerDown={() => setSelectedId(null)}
          >
            {background && <img src={background} alt="" className="cert-stage-bg" draggable={false} />}
            {fields.map((field) => (
              <div
                key={field.id}
                className={`cert-field${field.tipo === 'qrcode' ? ' is-qr' : ''}${field.id === selectedId ? ' is-selected' : ''}`}
                style={{
                  left: `${field.x * 100}%`,
                  top: `${field.y * 100}%`,
                  width: `${field.w * 100}%`,
                  height: `${field.h * 100}%`,
                  fontSize: `calc(${field.tamanhoPt} / ${config.largura_pt} * 100cqw)`,
                  fontWeight: field.negrito ? 700 : 400,
                  color: field.cor,
                  textAlign: field.alinhamento
                }}
                onPointerDown={(event) => startDrag(event, field.id, 'move')}
              >
                {field.tipo === 'qrcode' ? 'QR code' : showSample ? resolveSample(field.texto) : field.texto}
                {field.id === selectedId && (
                  <>
                    <button
                      type="button"
                      className="cert-field-delete"
                      aria-label="Excluir campo"
                      title="Excluir campo"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeField(field.id);
                      }}
                    >
                      ×
                    </button>
                    <span className="cert-handle" onPointerDown={(event) => startDrag(event, field.id, 'resize')} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="cert-panel">
          <div className="cert-panel-block">
            <p className="cert-panel-title">Adicionar</p>
            <div className="cert-panel-row">
              <button type="button" className="ghost-button" onClick={() => addField()}>Texto</button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => addField({ texto: '{NOME_DO_ALUNO}', negrito: true, cor: '#087F91', tamanhoPt: 22 })}
              >
                Nome do aluno
              </button>
            </div>
            <div className="cert-panel-row">
              <button
                type="button"
                className="ghost-button"
                onClick={() => addField({ texto: '{CODIGO_AUTENTICACAO}', tamanhoPt: 11, w: 0.34, h: 0.04 })}
              >
                Código de autenticação
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => addField({ tipo: 'qrcode', texto: '', x: 0.08, y: 0.76, w: 0.14, h: 0.2 })}
              >
                QR code
              </button>
            </div>
            <p className="cert-hint">O QR code leva à página de verificação do certificado.</p>
          </div>

          <div className="cert-panel-block">
            <p className="cert-panel-title">Dados fixos do modelo</p>
            <p className="cert-hint">Usados quando o campo não é preenchido pela emissão. Ex.: LOCAL, PERIODO.</p>
            {VARIABLE_KEYS.map((key) => (
              <label key={key} className="cert-field-label">
                {key}
                <input
                  value={config.variaveis?.[key] || ''}
                  onChange={(event) =>
                    updateConfig((current) => ({ ...current, variaveis: { ...current.variaveis, [key]: event.target.value } }))
                  }
                />
              </label>
            ))}
          </div>

          {selected?.tipo === 'qrcode' ? (
            <div className="cert-panel-block">
              <p className="cert-panel-title">QR code selecionado</p>
              <p className="cert-hint">Gerado automaticamente com o endereço de verificação de cada certificado. Arraste e redimensione para posicionar.</p>
            </div>
          ) : selected ? (
            <div className="cert-panel-block">
              <p className="cert-panel-title">Campo selecionado</p>
              <textarea
                rows={3}
                value={selected.texto}
                onChange={(event) => updateField(selected.id, { texto: event.target.value })}
              />
              <div className="cert-token-row">
                {TOKEN_LIST.map((token) => (
                  <button key={token} type="button" className="cert-token" onClick={() => insertToken(token)}>
                    {`{${token}}`}
                  </button>
                ))}
              </div>
              <div className="cert-panel-row">
                <label className="cert-field-label">
                  Tamanho (pt)
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={selected.tamanhoPt}
                    onChange={(event) => updateField(selected.id, { tamanhoPt: Number(event.target.value) || 16 })}
                  />
                </label>
                <label className="cert-field-label">
                  Cor
                  <input type="color" value={selected.cor} onChange={(event) => updateField(selected.id, { cor: event.target.value })} />
                </label>
              </div>
              <div className="cert-panel-row">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`ghost-button${selected.alinhamento === align ? ' is-active' : ''}`}
                    onClick={() => updateField(selected.id, { alinhamento: align })}
                  >
                    {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                  </button>
                ))}
              </div>
              <label className="cert-check">
                <input type="checkbox" checked={selected.negrito} onChange={(event) => updateField(selected.id, { negrito: event.target.checked })} /> Negrito
              </label>
            </div>
          ) : (
            <p className="cert-hint">Clique em um campo no fundo para editar. Arraste para mover; puxe o canto para redimensionar.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
