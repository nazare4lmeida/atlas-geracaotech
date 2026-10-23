import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { errorText, Feedback } from '../manage/shared';
import Pager from '../Pager';
import CertificateTemplateEditor from './CertificateTemplateEditor';

const MAX_FILE_BYTES = 3 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

// Gestão de certificados (professores e administradores): biblioteca de modelos e modelo de cada curso.
export default function CertificateTemplatesAdmin({ courses, onCoursesChanged }) {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePageSize, setCoursePageSize] = useState(10);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/certificate-templates');
      setTemplates(data.templates);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setFeedback({ type: 'error', text: 'Use uma imagem PNG ou JPG como fundo.' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFeedback({ type: 'error', text: 'A imagem passa de 3 MB. Reduza o tamanho e tente de novo.' });
      return;
    }

    const name = window.prompt('Nome do modelo (ex.: Full Stack 4.0):', file.name.replace(/\.(png|jpe?g)$/i, ''));
    if (!name || !name.trim()) return;

    setBusy(true);
    setFeedback(null);
    try {
      const background = await readAsDataUrl(file);
      const { data } = await api.post('/certificate-templates', {
        name: name.trim(),
        background,
        config: { largura_pt: 893, altura_pt: 632, variaveis: {}, campos: [] },
        verso: null
      });
      await load();
      setEditingId(data.template.id);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const removeTemplate = async (template) => {
    if (!window.confirm(`Excluir o modelo "${template.name}"? Os cursos que o usam voltam ao certificado padrão.`)) return;
    try {
      await api.delete(`/certificate-templates/${template.id}`);
      await load();
      setFeedback({ type: 'success', text: 'Modelo excluído.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  // Salva uma configuração do curso (modelo de conclusão, de participação ou data de liberação).
  const saveCourseSetting = async (course, patch, successText) => {
    setFeedback(null);
    try {
      await api.put(`/courses/${course.slug}/certificate-template`, patch);
      await load();
      await onCoursesChanged?.();
      setFeedback({ type: 'success', text: successText });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  if (editingId) {
    return (
      <section className="surface-card cert-admin">
        <CertificateTemplateEditor
          key={editingId}
          templateId={editingId}
          onClose={() => {
            setEditingId(null);
            load();
          }}
        />
      </section>
    );
  }


  return (
    <section className="surface-card cert-admin">
      <div className="cert-admin-head">
        <div>
          <h2>Modelos de certificado</h2>
          <p className="muted-text">Envie o fundo, ajuste os campos e escolha o modelo de cada curso.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleFile} />
        <button type="button" className="primary-button" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Enviando…' : 'Novo modelo (PNG ou JPG)'}
        </button>
      </div>

      <Feedback feedback={feedback} />

      {templates.length === 0 ? (
        <p className="muted-text">Nenhum modelo cadastrado. Enquanto isso, os cursos usam o certificado padrão.</p>
      ) : (
        <div className="cert-template-grid">
          {templates.map((template) => (
            <article key={template.id} className="cert-template-card">
              <h3>{template.name}</h3>
              <p className="muted-text">
                {template.courses.length > 0
                  ? `Usado em: ${template.courses.map((item) => item.title).join(', ')}`
                  : 'Não usado por nenhum curso.'}
              </p>
              <div className="editor-actions">
                <button type="button" className="ghost-button" onClick={() => setEditingId(template.id)}>Editar campos</button>
                <button type="button" className="ghost-button" onClick={() => removeTemplate(template)}>Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h3 className="cert-subtitle">Modelos e liberação por curso</h3>
      <p className="muted">Conclusão e participação usam modelos diferentes. A data de liberação é a previsão para o aluno.</p>
      {courses.length === 0 ? (
        <p className="muted">Nenhum curso disponível.</p>
      ) : (
        <div className="cert-course-table">
          <div className="cert-course-row cert-course-head">
            <span>Curso</span>
            <span>Modelo de conclusão</span>
            <span>Modelo de participação</span>
            <span>Liberação</span>
          </div>
          {courses.slice((coursePage - 1) * coursePageSize, coursePage * coursePageSize).map((course) => (
            <div key={course.slug} className="cert-course-row">
              <span>{course.title}</span>
              <select
                value={course.certificateTemplateId || ''}
                onChange={(event) => saveCourseSetting(course, { templateId: event.target.value || null }, `Modelo de conclusão de "${course.title}" atualizado.`)}
                aria-label={`Modelo de conclusão de ${course.title}`}
              >
                <option value="">Sem modelo</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <select
                value={course.certificateParticipacaoTemplateId || ''}
                onChange={(event) => saveCourseSetting(course, { participacaoTemplateId: event.target.value || null }, `Modelo de participação de "${course.title}" atualizado.`)}
                aria-label={`Modelo de participação de ${course.title}`}
              >
                <option value="">Sem modelo</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <input
                type="date"
                defaultValue={course.certificateReleaseAt ? String(course.certificateReleaseAt).slice(0, 10) : ''}
                key={`${course.slug}-${course.certificateReleaseAt || ''}`}
                onBlur={(event) => {
                  const value = event.target.value;
                  const current = course.certificateReleaseAt ? String(course.certificateReleaseAt).slice(0, 10) : '';
                  if (value !== current) {
                    saveCourseSetting(course, { releaseAt: value ? `${value}T12:00:00` : null }, `Liberação de "${course.title}" salva.`);
                  }
                }}
                aria-label={`Data de liberação de ${course.title}`}
              />
            </div>
          ))}
        </div>
      )}
      <Pager
        total={courses.length}
        page={Math.min(coursePage, Math.max(Math.ceil(courses.length / coursePageSize), 1))}
        pageSize={coursePageSize}
        onPage={setCoursePage}
        onPageSize={(size) => {
          setCoursePageSize(size);
          setCoursePage(1);
        }}
      />
    </section>
  );
}
