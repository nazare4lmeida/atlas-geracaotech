import { useState } from 'react';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import { sanitizeLessonHtml } from '../../utils/lessonHtml';
import { DIAS_DA_SEMANA, LESSON_TYPE_LABELS, lerEncontro, montarEncontro } from '../../utils/aulas';
import { FormActions, errorText } from './shared';
import LessonEditor from './LessonEditor';
import '../../styles/aulas-blocos.css';

// Editor de conteúdo do curso.
// Seção = módulo; Recurso = aula; Atividade de teste = questões da seção;
// Atividade de entrega = projeto final do curso.

// Tipos oferecidos ao criar um recurso. Propositalmente poucos: só o que o professor usa no dia a dia.
const TIPOS_NOVOS = [
  { id: 'page', titulo: 'Página de texto', ajuda: 'Texto com negrito, cores e destaques.' },
  { id: 'ao_vivo', titulo: 'Encontro ao vivo', ajuda: 'Cartão com dia, horário e link.' },
  { id: 'video', titulo: 'Vídeo', ajuda: 'Vídeo incorporado (YouTube ou similar).' },
  { id: 'link', titulo: 'Link externo', ajuda: 'Botão que abre outro site.' },
  { id: 'html', titulo: 'Bloco HTML', ajuda: 'Código livre, com prévia ao lado.' }
];

// Executa uma ação para cada item, em sequência, parando no primeiro erro. Devolve quantos deram certo.
async function emSequencia(lista, fazer) {
  let feitos = 0;
  for (const item of lista) {
    const ok = await fazer(item);
    if (!ok) break;
    feitos += 1;
  }
  return feitos;
}

function toggleNoConjunto(conjunto, id) {
  const proximo = new Set(conjunto);
  if (proximo.has(id)) proximo.delete(id);
  else proximo.add(id);
  return proximo;
}

function BarraSelecao({ quantidade, acoes, onLimpar }) {
  if (!quantidade) return null;
  return (
    <div className="bulk-bar" role="toolbar" aria-label="Ações para os itens selecionados">
      <span className="bulk-count">{quantidade} selecionado(s)</span>
      {acoes.map((acao) => (
        <button
          key={acao.label}
          type="button"
          className={acao.perigo ? 'danger-button small' : 'ghost-button small'}
          onClick={acao.onClick}
        >
          {acao.label}
        </button>
      ))}
      <button type="button" className="ghost-button small" onClick={onLimpar}>
        Limpar seleção
      </button>
    </div>
  );
}

const TONS_BARRA = [
  { id: 'primary', label: 'Cor do curso' },
  { id: 'ok', label: 'Verde' },
  { id: 'warn', label: 'Âmbar' },
  { id: 'danger', label: 'Vermelho' }
];

// Barra de progresso do aluno: o que aparece e a cor. Só as aulas marcadas como "conta na barra" entram no cálculo.
function ProgressBarForm({ initial, onSubmit }) {
  const { values, handleChange } = useForm(initial);

  return (
    <form
      className="manage-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <label>
        <span>Título da barra (deixe vazio para o automático)</span>
        <input name="titulo" value={values.titulo} onChange={handleChange} maxLength={80} placeholder="Ex.: Seu progresso no curso" />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="mostrarPercentual" checked={values.mostrarPercentual} onChange={handleChange} />
        <span>Mostrar a porcentagem</span>
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="mostrarContagem" checked={values.mostrarContagem} onChange={handleChange} />
        <span>Mostrar a contagem de aulas e testes (desmarque para não mostrar o total ao aluno)</span>
      </label>
      <label>
        <span>Cor da barra</span>
        <select name="tom" value={values.tom} onChange={handleChange}>
          {TONS_BARRA.map((tom) => (
            <option key={tom.id} value={tom.id}>
              {tom.label}
            </option>
          ))}
        </select>
      </label>
      <FormActions submitLabel="Salvar barra de progresso" />
    </form>
  );
}

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

function AddResourcePicker({ onPick, onCancel }) {
  return (
    <div className="tipo-picker">
      <p className="tipo-picker-title">Escolha o tipo de recurso</p>
      <div className="tipo-picker-grid">
        {TIPOS_NOVOS.map((tipo) => (
          <button key={tipo.id} type="button" className="tipo-card" onClick={() => onPick(tipo.id)}>
            <strong>{tipo.titulo}</strong>
            <span>{tipo.ajuda}</span>
          </button>
        ))}
      </div>
      <button type="button" className="ghost-button small" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}

function LessonForm({
  initial = { title: '', unit: '', type: 'page', url: '', content: '', visible: true, dia: '', inicio: '', fim: '' },
  submitLabel,
  onSubmit,
  onCancel
}) {
  const { values, handleChange, setFieldValue } = useForm(initial);
  const isLive = values.type === 'ao_vivo';
  const isHtml = values.type === 'html';
  const isPage = values.type === 'page';
  const needsUrl = values.type === 'video' || values.type === 'link' || isLive;

  return (
    <form
      className="manage-form manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(isLive ? { ...values, content: montarEncontro(values) } : values);
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
            {Object.entries(LESSON_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsUrl && (
        <label>
          <span>{isLive ? 'Link do encontro (Google Meet, Zoom...)' : 'URL (começando com https://)'}</span>
          <input
            name="url"
            value={values.url}
            onChange={handleChange}
            placeholder={isLive ? 'https://meet.google.com/...' : 'https://www.youtube.com/embed/...'}
          />
        </label>
      )}

      {isLive && (
        <div className="form-grid">
          <label>
            <span>Dia da semana</span>
            <select name="dia" value={values.dia} onChange={handleChange}>
              <option value="">Escolha</option>
              {DIAS_DA_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Início</span>
            <input type="time" name="inicio" value={values.inicio} onChange={handleChange} />
          </label>
          <label>
            <span>Término</span>
            <input type="time" name="fim" value={values.fim} onChange={handleChange} />
          </label>
        </div>
      )}

      {isHtml && (
        <div className="html-editor">
          <label>
            <span>Código HTML</span>
            <textarea
              name="content"
              rows="14"
              value={values.content}
              onChange={handleChange}
              spellCheck={false}
              className="html-editor-code"
            />
          </label>
          <div className="html-preview">
            <span className="html-preview-label">Prévia (como o aluno vê)</span>
            <div
              className="lesson-content lesson-html html-preview-body"
              dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(values.content || '', { name: 'Nome do aluno' }) }}
            />
          </div>
        </div>
      )}

      {(isPage || values.type === 'video' || values.type === 'link') && (
        <div className="lesson-editor-field">
          <span className="lesson-editor-label">{isPage ? 'Conteúdo da página' : 'Texto de apoio'}</span>
          <LessonEditor value={values.content} onChange={(html) => setFieldValue('content', html)} />
        </div>
      )}

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
  const { values, handleChange, setFieldValue } = useForm({
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
      <div className="lesson-editor-field">
        <span className="lesson-editor-label">Descrição e critérios de entrega</span>
        <LessonEditor value={values.description} onChange={(html) => setFieldValue('description', html)} />
      </div>
      <FormActions submitLabel="Salvar projeto final" />
    </form>
  );
}

function SectionBlock({ section, index, total, editing, setEditing, actions, expanded, onToggle, marcada, onMarcar }) {
  const sectionKey = `section:${section.id}`;
  const newLessonKey = `newLesson:${section.id}`;
  const newQuestionKey = `newQuestion:${section.id}`;
  const [selectedLessons, setSelectedLessons] = useState(() => new Set());
  const [newType, setNewType] = useState(null);

  const chosenLessons = section.lessons.filter((lesson) => selectedLessons.has(lesson.id));
  const limparNovo = () => {
    setEditing(null);
    setNewType(null);
  };

  // Ações em massa sobre os recursos marcados. Subir e descer seguem a ordem da lista para os blocos ficarem juntos.
  const acoesRecursos = [
    {
      label: 'Subir',
      onClick: async () => {
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.moveLesson(section, lesson, 'up'));
        if (feitos) actions.notify(`${feitos} recurso(s) movido(s).`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Descer',
      onClick: async () => {
        const feitos = await emSequencia([...chosenLessons].reverse(), (lesson) => actions.moveLesson(section, lesson, 'down'));
        if (feitos) actions.notify(`${feitos} recurso(s) movido(s).`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Contar na barra',
      onClick: async () => {
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.setLessonCounts(section, lesson, true));
        if (feitos) actions.notify(`${feitos} recurso(s) passam a contar na barra.`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Tirar da barra',
      onClick: async () => {
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.setLessonCounts(section, lesson, false));
        if (feitos) actions.notify(`${feitos} recurso(s) saem da barra.`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Mostrar',
      onClick: async () => {
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.setLessonVisible(section, lesson, true));
        if (feitos) actions.notify(`${feitos} recurso(s) visível(is).`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Ocultar',
      onClick: async () => {
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.setLessonVisible(section, lesson, false));
        if (feitos) actions.notify(`${feitos} recurso(s) oculto(s).`);
        setSelectedLessons(new Set());
      }
    },
    {
      label: 'Excluir',
      perigo: true,
      onClick: async () => {
        if (!window.confirm(`Excluir ${chosenLessons.length} recurso(s) selecionado(s)? O progresso dos alunos nesses itens também será removido.`)) return;
        const feitos = await emSequencia(chosenLessons, (lesson) => actions.removeLesson(section, lesson));
        if (feitos) actions.notify(`${feitos} recurso(s) excluído(s).`);
        setSelectedLessons(new Set());
      }
    }
  ];

  return (
    <article className="manage-item">
      <header className="manage-item-header">
        <div className="manage-item-title">
          <input
            type="checkbox"
            className="bulk-check"
            checked={marcada}
            onChange={onMarcar}
            aria-label={`Selecionar a seção ${section.title}`}
          />
          <button type="button" className="manage-toggle" onClick={onToggle} aria-expanded={expanded}>
            <strong>{index + 1}. {section.title}</strong>
            <span className="muted">
              {section.lessons.length} recurso(s) · {section.quiz.length} questão(ões)
            </span>
          </button>
        </div>
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
          <BarraSelecao quantidade={chosenLessons.length} acoes={acoesRecursos} onLimpar={() => setSelectedLessons(new Set())} />
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
                      visible: lesson.visible,
                      ...lerEncontro(lesson.content)
                    }}
                    submitLabel="Salvar recurso"
                    onSubmit={(values) => actions.updateLesson(section, lesson, values).then((ok) => ok && setEditing(null))}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <input
                      type="checkbox"
                      className="bulk-check"
                      checked={selectedLessons.has(lesson.id)}
                      onChange={() => setSelectedLessons((current) => toggleNoConjunto(current, lesson.id))}
                      aria-label={`Selecionar o recurso ${lesson.title}`}
                    />
                    <div>
                      <strong>{lesson.title}</strong>{' '}
                      {lesson.unit && <span className="tag">{lesson.unit}</span>}{' '}
                      <span className="tag">{LESSON_TYPE_LABELS[lesson.type] || 'Recurso'}</span>{' '}
                      {!lesson.visible && <span className="badge hidden">Oculto</span>}{' '}
                      {lesson.countsProgress === false && <span className="badge hidden">Fora da barra</span>}
                      {lesson.url && <div className="muted manage-url">{lesson.url}</div>}
                    </div>
                    <div className="manage-item-actions">
                      <button type="button" className="ghost-button small" disabled={lessonIndex === 0} onClick={() => actions.moveLesson(section, lesson, 'up')}>
                        Subir
                      </button>
                      <button type="button" className="ghost-button small" disabled={lessonIndex === section.lessons.length - 1} onClick={() => actions.moveLesson(section, lesson, 'down')}>
                        Descer
                      </button>
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={() => actions.setLessonCounts(section, lesson, lesson.countsProgress === false)}
                      >
                        {lesson.countsProgress === false ? 'Contar na barra' : 'Tirar da barra'}
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
            newType ? (
              <LessonForm
                initial={{ title: '', unit: '', type: newType, url: '', content: '', visible: true, dia: '', inicio: '', fim: '' }}
                submitLabel="Adicionar recurso"
                onSubmit={(values) =>
                  actions.addLesson(section, values).then((ok) => {
                    if (ok) limparNovo();
                  })
                }
                onCancel={limparNovo}
              />
            ) : (
              <AddResourcePicker onPick={setNewType} onCancel={limparNovo} />
            )
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
  const [selectedSections, setSelectedSections] = useState(() => new Set());
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
    setExpandedIds((current) => toggleNoConjunto(current, id));
  };

  const confirmDelete = (message) => window.confirm(message);
  const notify = (text) => onFeedback({ type: 'success', text });

  const actions = {
    notify,
    addSection: (values) => run(() => api.post(`${basePath}/modules`, values), 'Seção criada.'),
    updateSection: (section, values) => run(() => api.put(`${basePath}/modules/${section.id}`, values), 'Seção salva.'),
    moveSection: (section, direction) =>
      run(() => api.post(`${basePath}/modules/${section.id}/move`, { direction })),
    toggleSection: (section) =>
      run(() => api.put(`${basePath}/modules/${section.id}`, { visible: !section.visible }), 'Visibilidade atualizada.'),
    setSectionVisible: (section, visible) =>
      run(() => api.put(`${basePath}/modules/${section.id}`, { visible })),
    removeSection: (section) => run(() => api.delete(`${basePath}/modules/${section.id}`)),
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
    setLessonVisible: (section, lesson, visible) =>
      run(() => api.put(`${basePath}/modules/${section.id}/lessons/${lesson.id}`, { visible })),
    setLessonCounts: (section, lesson, countsProgress) =>
      run(() => api.put(`${basePath}/modules/${section.id}/lessons/${lesson.id}`, { countsProgress })),
    toggleLesson: (section, lesson) =>
      run(() => api.put(`${basePath}/modules/${section.id}/lessons/${lesson.id}`, { visible: !lesson.visible }), 'Visibilidade atualizada.'),
    removeLesson: (section, lesson) =>
      run(() => api.delete(`${basePath}/modules/${section.id}/lessons/${lesson.id}`)),
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

  // Ações em massa sobre as seções marcadas (na ordem em que aparecem no curso).
  const chosenSections = course.modules.filter((section) => selectedSections.has(section.id));
  const limparSecoes = () => setSelectedSections(new Set());
  const acoesSecoes = [
    {
      label: 'Subir',
      onClick: async () => {
        const feitos = await emSequencia(chosenSections, (section) => actions.moveSection(section, 'up'));
        if (feitos) notify(`${feitos} seção(ões) movida(s).`);
        limparSecoes();
      }
    },
    {
      label: 'Descer',
      onClick: async () => {
        const feitos = await emSequencia([...chosenSections].reverse(), (section) => actions.moveSection(section, 'down'));
        if (feitos) notify(`${feitos} seção(ões) movida(s).`);
        limparSecoes();
      }
    },
    {
      label: 'Mostrar',
      onClick: async () => {
        const feitos = await emSequencia(chosenSections, (section) => actions.setSectionVisible(section, true));
        if (feitos) notify(`${feitos} seção(ões) visível(is).`);
        limparSecoes();
      }
    },
    {
      label: 'Ocultar',
      onClick: async () => {
        const feitos = await emSequencia(chosenSections, (section) => actions.setSectionVisible(section, false));
        if (feitos) notify(`${feitos} seção(ões) oculta(s).`);
        limparSecoes();
      }
    },
    {
      label: 'Excluir',
      perigo: true,
      onClick: async () => {
        if (!confirmDelete(`Excluir ${chosenSections.length} seção(ões) com seus recursos e questões? O progresso dos alunos nesses itens também será removido.`)) return;
        const feitos = await emSequencia(chosenSections, (section) => actions.removeSection(section));
        if (feitos) notify(`${feitos} seção(ões) excluída(s).`);
        limparSecoes();
      }
    }
  ];

  return (
    <div className="content-editor">
      <section className="surface-card">
        <div className="section-heading">
          <h2>Barra de progresso do aluno</h2>
          <p>
            Escolha o que aparece e a cor. Recursos marcados como "Fora da barra" continuam no curso, mas não entram no percentual do aluno.
            Se não quiser mostrar o total de aulas, desmarque a contagem.
          </p>
        </div>
        <ProgressBarForm
          initial={{
            titulo: course.progressBar?.titulo || '',
            mostrarPercentual: course.progressBar?.mostrarPercentual !== false,
            mostrarContagem: course.progressBar?.mostrarContagem !== false,
            tom: course.progressBar?.tom || 'primary'
          }}
          onSubmit={(values) => run(() => api.put(`${basePath}/progress-bar`, values), 'Barra de progresso salva.')}
        />
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <h2>Seções, recursos e atividades</h2>
          <p>
            Organize o curso como no Moodle: cada seção reúne recursos (aulas) e uma atividade de teste.
            Marque vários itens para mover, ocultar ou excluir de uma vez.
          </p>
        </div>

        <BarraSelecao quantidade={chosenSections.length} acoes={acoesSecoes} onLimpar={limparSecoes} />

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
            marcada={selectedSections.has(section.id)}
            onMarcar={() => setSelectedSections((current) => toggleNoConjunto(current, section.id))}
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
