import { useState } from 'react';
import api from '../../services/api';
import { errorText } from './shared';

// Blocos da formação: cor, modo de liberação e datas.
// Só administração e editores veem esta tela (a API também recusa os demais).
const PUBLICO = [
  { id: 'todas', label: 'Todos os alunos' },
  { id: 'online', label: 'Só turmas Online' },
  { id: 'presencial', label: 'Só turmas Presenciais' }
];

const MODOS = [
  { id: 'sequential', label: 'Em sequência (libera ao concluir o bloco anterior)' },
  { id: 'open', label: 'Sempre liberado' }
];

function BlockRow({ block, slug, onSaved, onFeedback }) {
  const [values, setValues] = useState({
    accent: block.accent || '#6366f1',
    unlockMode: block.unlockMode || 'sequential',
    audience: block.audience || 'todas',
    startsOn: block.startsOn || '',
    endsOn: block.endsOn || ''
  });
  const [saving, setSaving] = useState(false);

  const change = (campo) => (event) => setValues({ ...values, [campo]: event.target.value });

  async function salvar(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/courses/${slug}/blocks/${block.id}`, values);
      onSaved(data.course);
      onFeedback({ type: 'ok', text: `Bloco "${block.title}" salvo.` });
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="manage-form block-settings-row" onSubmit={salvar}>
      <h3>{block.title}</h3>
      <div className="form-grid">
        <label>
          <span>Cor da faixa</span>
          <input type="color" value={values.accent} onChange={change('accent')} />
        </label>
        <label>
          <span>Quem vê</span>
          <select value={values.audience} onChange={change('audience')}>
            {PUBLICO.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Liberação</span>
          <select value={values.unlockMode} onChange={change('unlockMode')}>
            {MODOS.map((modo) => (
              <option key={modo.id} value={modo.id}>
                {modo.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Abre em (opcional)</span>
          <input type="date" value={values.startsOn} onChange={change('startsOn')} />
        </label>
        <label>
          <span>Prazo final (opcional)</span>
          <input type="date" value={values.endsOn} onChange={change('endsOn')} />
        </label>
      </div>
      <div className="manage-form-actions">
        <button type="submit" className="primary-button small" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar bloco'}
        </button>
      </div>
    </form>
  );
}

export default function BlocksPanel({ course, onCourseChange, onFeedback }) {
  const blocos = [...(course.blocks || [])].sort((a, b) => a.position - b.position);

  return (
    <section className="blocks-panel">
      <p className="muted">
        Cada bloco aparece com a cor escolhida. Com "Abre em", o bloco fica bloqueado até a data. O "Prazo final" é só informativo: o conteúdo continua disponível depois dele.
      </p>
      {blocos.length === 0 && <p className="muted">Este curso ainda não tem blocos.</p>}
      {blocos.map((block) => (
        <BlockRow
          key={`${block.id}-${block.accent}-${block.unlockMode}-${block.audience}-${block.startsOn}-${block.endsOn}`}
          block={block}
          slug={course.slug}
          onSaved={onCourseChange}
          onFeedback={onFeedback}
        />
      ))}
    </section>
  );
}
