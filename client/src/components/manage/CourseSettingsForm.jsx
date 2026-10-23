import { useState } from 'react';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import { FormActions, errorText } from './shared';
import ThemeFields from './ThemeFields';
import { DEFAULT_THEME } from '../../layouts/registry';

// Edição dos dados gerais do curso, do layout e da identidade visual (equivalente às configurações do Moodle).
export default function CourseSettingsForm({ course, onSaved, onFeedback }) {
  const theme = { ...DEFAULT_THEME, primary: course.accent || DEFAULT_THEME.primary, ...(course.theme || {}) };

  const { values, handleChange, setFieldValue } = useForm({
    title: course.title || '',
    summary: course.summary || '',
    banner: course.banner || '',
    level: course.level || '',
    estimatedHours: course.estimatedHours || 0,
    visible: course.visible !== false,
    selfEnrolment: course.selfEnrolment !== false,
    layout: course.layout || 'caderno',
    primary: theme.primary,
    highlight: theme.accent,
    font: theme.font,
    radius: theme.radius,
    density: theme.density,
    bannerUrl: theme.bannerUrl || '',
    logoUrl: theme.logoUrl || ''
  });
  const [saving, setSaving] = useState(false);

  const handleThemeChange = (name, value) => setFieldValue(name, value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/courses/${course.slug}`, {
        title: values.title,
        summary: values.summary,
        banner: values.banner,
        level: values.level,
        estimatedHours: Number(values.estimatedHours) || 0,
        visible: values.visible,
        selfEnrolment: values.selfEnrolment,
        layout: values.layout,
        accent: values.primary,
        theme: {
          primary: values.primary,
          accent: values.highlight,
          font: values.font,
          radius: values.radius,
          density: values.density,
          bannerUrl: values.bannerUrl,
          logoUrl: values.logoUrl
        }
      });
      onSaved(data.course);
      onFeedback({ type: 'success', text: 'Configurações salvas.' });
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="surface-card manage-form" onSubmit={handleSubmit}>
      <h2>Configurações do curso</h2>
      <p className="muted">
        O identificador (slug) <strong>{course.slug}</strong> não pode ser alterado, pois é usado no progresso e nos certificados dos alunos.
      </p>

      <div className="form-grid">
        <label>
          <span>Título</span>
          <input name="title" value={values.title} onChange={handleChange} required />
        </label>
        <label>
          <span>Nível</span>
          <input name="level" value={values.level} onChange={handleChange} placeholder="Iniciante" />
        </label>
        <label>
          <span>Carga horária estimada (horas)</span>
          <input name="estimatedHours" type="number" min="0" value={values.estimatedHours} onChange={handleChange} />
        </label>
      </div>

      <label>
        <span>Resumo</span>
        <textarea name="summary" rows="2" value={values.summary} onChange={handleChange} />
      </label>

      <label>
        <span>Texto de apresentação (banner)</span>
        <textarea name="banner" rows="2" value={values.banner} onChange={handleChange} />
      </label>

      <ThemeFields values={values} onChange={handleThemeChange} />

      <label className="checkbox-row">
        <input type="checkbox" name="visible" checked={values.visible} onChange={handleChange} />
        <span>Curso publicado (visível para os alunos)</span>
      </label>

      <label className="checkbox-row">
        <input type="checkbox" name="selfEnrolment" checked={values.selfEnrolment} onChange={handleChange} />
        <span>Autoinscrição: o aluno entra no curso ao acessá-lo. Se desligada, só participantes matriculados pelo docente acessam.</span>
      </label>

      <FormActions submitLabel={saving ? 'Salvando...' : 'Salvar configurações'} disabled={saving} />
    </form>
  );
}
