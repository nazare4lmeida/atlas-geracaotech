import { useState } from 'react';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import { FormActions, errorText } from './shared';
import LessonEditor from './LessonEditor';

// Editor de conteúdo do curso.
// Seção = módulo; Recurso = aula (vídeo, página ou link); Atividade de teste = questões da seção;
// Atividade de entrega = projeto final do curso.

const LESSON_TYPE_LABELS = {
  video: 'Vídeo',
  page: 'Página',
  link: 'Link externo'
};

function SectionForm({ initial = { title: '', description: '', visible: true }, submitLabel, onSubmit, onCancel }) {
  const { values, handleChange } = useForm(initial);

  return (
    <form
      className="manage-form manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <label>
        <span>Título da seção</span>
        <input name="title" value={values.title} onChange={handleChange} required />
      </label>
      <label>
        <span>Descrição</span>
        <textarea name="description" rows="2" value={values.description} onChange={handleChange} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="visible" checked={values.visible} onChange={handleChange} />
        <span>Visível para os alunos</span>
      </label>
      <FormActions submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function LessonForm({ initial = { title: '', unit: '', type: 'video', url: '', content: '', visible: true }, submitLabel, onSubmit, onCancel }) {
  const { values, handleChange, setFieldValue } = useForm(initial);
  const needsUrl = values.type === 'video' || values.type === 'link';

  return (
    <form
      className="manage-form manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="form-grid">
        <label>
          <span>Título do recurso</span>
          <input name="title" value={values.title} onChange={handleChange} required />
        </label>
        <label>
          <span>Unidade (opcional)</span>
          <input name="unit" value={values.unit} onChange={handleChange} placeholder="ex.: Unidade 1" maxLength={160} />
        </label>
        <label>
          <span>Tipo</span>
          <select name="type" value={values.type} onChange={handleChange}>
            <option value="video">Vídeo (URL de incorporação)</option>
            <option value="page">Página de texto</option>
            <option value="link">Link externo</option>
          </select>
        </label>
      </div>
      {needsUrl && (
        <label>
          <span>URL (começando com https://)</span>
          <input name="url" value={values.url} onChange={handleChange} placeholder="https://www.youtube.com/embed/..." />
        </label>
      )}
      <div className="lesson-editor-field">
        <span className="lesson-editor-label">{values.type === 'page' ? 'Conteúdo da página' : 'Texto de apoio'}</span>
        <LessonEditor value={values.content} onChange={(html) => setFieldValue('content', html)} />
      </div>
      <label className="checkbox-row">
        <input type="checkbox" name="visible" checked={values.visible} onChange={handleChange} />
        <span>Visível para os alunos</span>
      </label>
      <FormActions submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function QuestionForm({ initial = { question: '', options: '', answer: 1, explanation: '', feedback: '' }, submitLabel, onSubmit, onCancel }) {
  const { values, handleChange } = useForm(initial);

  return (
    <form
      className="manage-form manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        const options = String(values.options)
          .split('\n')
          .map((option) => option.trim())
          .filter(Boolean);
        // Uma linha de feedback por alternativa, na mesma ordem das alternativas (linha vazia = sem feedback).
        const optionFeedback = String(values.feedback || '').split('\n').slice(0, options.length).map((line) => line.trim());
        onSubmit({
          question: values.question,
          options,
          answer: Number(values.answer) - 1,
          explanation: String(values.explanation || '').trim(),
          optionFeedback
        });
      }}
    >
      <label>
        <span>Enunciado</span>
        <input name="question" value={values.question} onChange={handleChange} required />
      </label>
      <label>
        <span>Alternativas (uma por linha, mínimo duas)</span>
        <textarea name="options" rows="4" value={values.options} onChange={handleChange} required />
      </label>
      <label>
        <span>Número da alternativa correta (1 = primeira linha)</span>
        <input name="answer" type="number" min="1" value={values.answer} onChange={handleChange} required />
      </label>
      <label>
        <span>Feedback por alternativa (uma linha por alternativa, na mesma ordem; explica por que está certa ou errada)</span>
        <textarea name="feedback" rows="4" value={values.feedback || ''} onChange={handleChange} />
      </label>
      <label>
        <span>Explicação geral (aparece depois da resposta)</span>
        <textarea name="explanation" rows="2" value={values.explanation || ''} onChange={handleChange} />
      </label>
      <FormActions submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function FinalProjectForm({ project, onSubmit }) {
  const { values, handleChange } = useForm({
    title: project.title || '',
    description: project.description || ''
  });

  return (
    <form
      className="manage-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <label>
        <span>Título do projeto final</span>
        <input name="title" value={values.title} onChange={handleChange} placeholder="Deixe em branco se o curso não tiver projeto" />
      </label>
      <label>
        <span>Descrição e critérios de entrega</span>
        <textarea name="description" rows="3" value={values.description} onChange={handleChange} />
      </label>
      <FormActions submitLabel="Salvar projeto final" />
    </form>
  );
}

function SectionBlock({ section, index, total, editing, setEditing, actions, expanded, onToggle }) {
  const sectionKey = `section:${section.id}`;
  const newLessonKey = `newLesson:${section.id}`;
  const newQuestionKey = `newQuestion:${section.id}`;

  return (
    <article className="manage-item">
      <header className="manage-item-header">
        <button type="button" className="manage-toggle" onClick={onToggle} aria-expanded={expanded}>
          <strong>{index + 1}. {section.title}</strong>
          <span className="muted">
            {section.lessons.length} recurso(s) · {section.quiz.length} questão(ões)
          </span>
        </button>
        <div className="manage-item-actions">
          <span className={`badge ${section.visible ? '' : 'hidden'}`}>{section.visible ? 'Visível' : 'Oculta'}</span>
          <button type="button" className="ghost-button small" disabled={index === 0} onClick={() => actions.moveSection(section, 'up')}>
            Subir
          </button>
          <button type="button" className="ghost-button small" disabled={index === total - 1} onClick={() => actions.moveSection(section, 'down')}>
            Descer
          </button>
          <button type="button" className="ghost-button small" onClick={() => actions.toggleSection(section)}>
            {section.visible ? 'Ocultar' : 'Mostrar'}
          </button>
          <button type="button" className="ghost-button small" onClick={() => setEditing(sectionKey)}>
            Editar
          </button>
          <button type="button" className="danger-button small" onClick={() => actions.deleteSection(section)}>
            Excluir
          </button>
        </div>
      </header>

      {editing === sectionKey && (
        <SectionForm
          initial={{ title: section.title, description: section.description, visible: section.visible }}
          submitLabel="Salvar seção"
          onSubmit={(values) => actions.updateSection(section, values).then((ok) => ok && setEditing(null))}
          onCancel={() => setEditing(null)}
        />
      )}

      {expanded && (
        <div className="manage-item-body">
          {section.description && <p className="muted">{section.description}</p>}

          <h4>Recursos</h4>
          {section.lessons.length === 0 && <p className="muted">Nenhum recurso nesta seção.</p>}

          {section.lessons.map((lesson, lessonIndex) => {
            const lessonKey = `lesson:${lesson.id}`;
            return (
              <div key={lesson.id} className="manage-row">
                {editing === lessonKey ? (
                  <LessonForm
                    initial={{
                      title: lesson.title,
                      unit: lesson.unit || '',
                      type: lesson.type,
                      url: lesson.url,
                      content: lesson.content,
                      visible: lesson.visible
                    }}
                    submitLabel="Salvar recurso"
                    onSubmit={(values) => actions.updateLesson(section, lesson, values).then((ok) => ok && setEditing(null))}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div>
                      <strong>{lesson.title}</strong>{' '}
                      {lesson.unit && <span className="tag">{lesson.unit}</span>}{' '}
                      <span className="tag">{LESSON_TYPE_LABELS[lesson.type] || 'Recurso'}</span>{' '}
                      {!lesson.visible && <span className="badge hidden">Oculto</span>}
                      {lesson.url && <div className="muted manage-url">{lesson.url}</div>}
                    </div>
                    <div className="manage-item-actions">
                      <button type="button" className="ghost-button small" disabled={lessonIndex === 0} onClick={() => actions.moveLesson(section, lesson, 'up')}>
                        Subir
                      </button>
                      <button type="button" className="ghost-button small" disabled={lessonIndex === section.lessons.length - 1} onClick={() => actions.moveLesson(section, lesson, 'down')}>
                        Descer
                      </button>
                      <button type="button" className="ghost-button small" onClick={() => actions.toggleLesson(section, lesson)}>
                        {lesson.visible ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button type="button" className="ghost-button small" onClick={() => setEditing(lessonKey)}>
                        Editar
                      </button>
                      <button type="button" className="danger-button small" onClick={() => actions.deleteLesson(section, lesson)}>
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {editing === newLessonKey ? (
            <LessonForm
              submitLabel="Adicionar recurso"
              onSubmit={(values) => actions.addLesson(section, values).then((ok) => ok && setEditing(null))}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button type="button" className="ghost-button small" onClick={() => setEditing(newLessonKey)}>
              + Adicionar recurso
            </button>
          )}

          <h4>Atividade de teste (questionário da seção)</h4>
          <p className="muted">O aluno precisa acertar todas as questões para ser aprovado nesta seção.</p>

          {section.quiz.map((question, questionIndex) => {
            const questionKey = `question:${question.id}`;
            return (
              <div key={question.id} className="manage-row">
                {editing === questionKey ? (
                  <QuestionForm
                    initial={{
                      question: question.question,
                      options: question.options.join('\n'),
                      answer: question.answer + 1,
                      feedback: (question.optionFeedback || []).join('\n'),
                      explanation: question.explanation || ''
                    }}
                    submitLabel="Salvar questão"
                    onSubmit={(values) => actions.updateQuestion(section, question, values).then((ok) => ok && setEditing(null))}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div>
                      <strong>{questionIndex + 1}. {question.question}</strong>
                      <div className="muted manage-url">
                        Correta: {question.options[question.answer]} · {question.options.length} alternativas
                      </div>
                    </div>
                    <div className="manage-item-actions">
                      <button type="button" className="ghost-button small" onClick={() => setEditing(questionKey)}>
                        Editar
                      </button>
                      <button type="button" className="danger-button small" onClick={() => actions.deleteQuestion(section, question)}>
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {editing === newQuestionKey ? (
            <QuestionForm
              submitLabel="Adicionar questão"
              onSubmit={(values) => actions.addQuestion(section, values).then((ok) => ok && setEditing(null))}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button type="button" className="ghost-button small" onClick={() => setEditing(newQuestionKey)}>
              + Adicionar questão
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function ContentEditor({ course, onCourseChange, onFeedback }) {
  const [editing, setEditing] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set(course.modules[0] ? [course.modules[0].id] : []));
  const basePath = `/courses/${course.slug}`;

  // Executa uma alteração no servidor e atualiza o curso na tela com a resposta.
  const run = async (request, successText) => {
    try {
      const { data } = await request();
      onCourseChange(data.course);
      if (successText) onFeedback({ type: 'success', text: successText });
      return true;
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
      return false;
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = (message) => window.confirm(message);

  const actions = {
    addSection: (values) => run(() => api.post(`${basePath}/modules`, values), 'Seção criada.'),
    updateSection: (section, values) => run(() => api.put(`${basePath}/modules/${section.id}`, values), 'Seção salva.'),
    moveSection: (section, direction) =>
      run(() => api.post(`${basePath}/modules/${section.id}/move`, { direction })),
    toggleSection: (section) =>
      run(() => api.put(`${basePath}/modules/${section.id}`, { visible: !section.visible }), 'Visibilidade atualizada.'),
    deleteSection: (section) => {
      if (!confirmDelete(`Excluir a seção "${section.title}" com seus recursos e questões? O progresso dos alunos nesses itens também será removido.`)) return;
      run(() => api.delete(`${basePath}/modules/${section.id}`), 'Seção excluída.');
    },

    addLesson: (section, values) =>
      run(() => api.post(`${basePath}/modules/${section.id}/lessons`, values), 'Recurso adicionado.'),
    updateLesson: (section, lesson, values) =>
      run(() => api.put(`${basePath}/modules/${section.id}/lessons/${lesson.id}`, values), 'Recurso salvo.'),
    moveLesson: (section, lesson, direction) =>
      run(() => api.post(`${basePath}/modules/${section.id}/lessons/${lesson.id}/move`, { direction })),
    toggleLesson: (section, lesson) =>
      run(() => api.put(`${basePath}/modules/${section.id}/lessons/${lesson.id}`, { visible: !lesson.visible }), 'Visibilidade atualizada.'),
    deleteLesson: (section, lesson) => {
      if (!confirmDelete(`Excluir o recurso "${lesson.title}"?`)) return;
      run(() => api.delete(`${basePath}/modules/${section.id}/lessons/${lesson.id}`), 'Recurso excluído.');
    },

    addQuestion: (section, values) =>
      run(() => api.post(`${basePath}/modules/${section.id}/questions`, values), 'Questão adicionada.'),
    updateQuestion: (section, question, values) =>
      run(() => api.put(`${basePath}/modules/${section.id}/questions/${question.id}`, values), 'Questão salva.'),
    deleteQuestion: (section, question) => {
      if (!confirmDelete('Excluir esta questão?')) return;
      run(() => api.delete(`${basePath}/modules/${section.id}/questions/${question.id}`), 'Questão excluída.');
    }
  };

  const [newSectionOpen, setNewSectionOpen] = useState(false);

  return (
    <div className="content-editor">
      <section className="surface-card">
        <div className="section-heading">
          <h2>Seções, recursos e atividades</h2>
          <p>
            Organize o curso: cada seção reúne recursos (aulas) e uma atividade de teste.
            Use Subir/Descer para ordenar e Ocultar para esconder algo dos alunos sem perder o conteúdo.
          </p>
        </div>

        {course.modules.length === 0 && <p className="muted">Nenhuma seção criada ainda.</p>}

        {course.modules.map((section, index) => (
          <SectionBlock
            key={section.id}
            section={section}
            index={index}
            total={course.modules.length}
            editing={editing}
            setEditing={setEditing}
            actions={actions}
            expanded={expandedIds.has(section.id)}
            onToggle={() => toggleExpanded(section.id)}
          />
        ))}

        {newSectionOpen ? (
          <SectionForm
            submitLabel="Criar seção"
            onSubmit={(values) =>
              actions.addSection(values).then((ok) => {
                if (ok) setNewSectionOpen(false);
              })
            }
            onCancel={() => setNewSectionOpen(false)}
          />
        ) : (
          <button type="button" className="primary-button small" onClick={() => setNewSectionOpen(true)}>
            + Nova seção
          </button>
        )}
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <h2>Projeto final (atividade de entrega)</h2>
          <p>Entregue ao concluir todas as seções. Marcar o projeto como concluído é o último requisito do certificado.</p>
        </div>
        <FinalProjectForm
          project={course.finalProject}
          onSubmit={(values) =>
            run(() => api.put(`${basePath}/final-project`, values), 'Projeto final salvo.')
          }
        />
      </section>
    </div>
  );
}
