import { LAYOUTS, FONT_OPTIONS, RADIUS_OPTIONS, DENSITY_OPTIONS, courseThemeStyle, getLayout } from '../../layouts/registry';

// Escolha do layout e ajustes da identidade visual, com prévia ao vivo.
// O professor não edita código: cores, fonte, forma, densidade, banner e logo são campos desta tela.
export default function ThemeFields({ values, onChange }) {
  const selectedLayout = getLayout(values.layout);
  const previewCourse = {
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
  };

  return (
    <section className="manage-stack">
      <fieldset className="theme-fieldset">
        <legend>Layout do curso</legend>
        <div className="layout-picker" role="radiogroup" aria-label="Layout do curso">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              role="radio"
              aria-checked={values.layout === layout.id}
              className={values.layout === layout.id ? 'layout-option active' : 'layout-option'}
              onClick={() => onChange('layout', layout.id)}
            >
              <span
                className="layout-swatch"
                style={{ background: layout.swatch.bg, color: layout.swatch.ink, borderColor: layout.swatch.accent }}
                aria-hidden="true"
              >
                <span style={{ background: layout.swatch.accent }} />
                <span style={{ background: layout.swatch.ink }} />
              </span>
              <strong>{layout.name}</strong>
              <small>{layout.description}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="theme-fieldset">
        <legend>Identidade visual</legend>
        <div className="form-grid">
          <label>
            <span>Cor principal</span>
            <input name="primary" type="color" value={values.primary} onChange={(event) => onChange('primary', event.target.value)} />
          </label>
          <label>
            <span>Cor de destaque</span>
            <input name="highlight" type="color" value={values.highlight} onChange={(event) => onChange('highlight', event.target.value)} />
          </label>
          <label>
            <span>Fonte</span>
            <select name="font" value={values.font} onChange={(event) => onChange('font', event.target.value)}>
              {FONT_OPTIONS.map((font) => (
                <option key={font.id} value={font.id}>{font.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Forma</span>
            <select name="radius" value={values.radius} onChange={(event) => onChange('radius', event.target.value)}>
              {RADIUS_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Densidade</span>
            <select name="density" value={values.density} onChange={(event) => onChange('density', event.target.value)}>
              {DENSITY_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Imagem de capa (URL https)</span>
            <input name="bannerUrl" value={values.bannerUrl} onChange={(event) => onChange('bannerUrl', event.target.value)} placeholder="https://..." />
          </label>
          <label>
            <span>Logo (URL https)</span>
            <input name="logoUrl" value={values.logoUrl} onChange={(event) => onChange('logoUrl', event.target.value)} placeholder="https://..." />
          </label>
        </div>
      </fieldset>

      <fieldset className="theme-fieldset">
        <legend>Prévia — {selectedLayout.name}</legend>
        <div className={`course-layout layout-${values.layout} density-${values.density} theme-preview`} style={courseThemeStyle(previewCourse)}>
          <div className="course-hero">
            <span className="eyebrow">Nível</span>
            <h2>Título do curso</h2>
            <p>Assim o aluno verá a capa do curso, com as cores e a fonte escolhidas.</p>
          </div>
          <div className="lesson-card">
            <div className="lesson-header">
              <h3>Aula de exemplo</h3>
              <button type="button" className="ghost-button">Marcar como concluída</button>
            </div>
            <p className="lesson-content lesson-text">Texto da aula. Títulos, botões e cartões usam a identidade do curso.</p>
            <button type="button" className="primary-button small">Botão principal</button>
          </div>
        </div>
      </fieldset>
    </section>
  );
}
