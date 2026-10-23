import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import useForm from '../hooks/useForm';
import api from '../services/api';
import { Feedback, FormActions, errorText } from '../components/manage/shared';
import { LAYOUTS, getLayout } from '../layouts/registry';
import { ImportCoursePanel } from '../components/manage/BackupPanel';

// Lista e criação de cursos (equivalente a "Gerenciar cursos" no Moodle).
export default function ManageCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const { values, handleChange, reset } = useForm({
    title: '',
    slug: '',
    summary: '',
    level: 'Iniciante',
    layout: 'caderno',
    estimatedHours: 0,
    accent: '#6366f1',
    visible: false,
    selfEnrolment: true
  });

  useEffect(() => {
    api
      .get('/courses')
      .then(({ data }) => setCourses(data.courses.filter((course) => course.permissions.canManage)))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const { data } = await api.post('/courses', {
        ...values,
        estimatedHours: Number(values.estimatedHours) || 0
      });
      navigate(`/gestao/cursos/${data.course.slug}`);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Excluir o curso "${course.title}"? Seções, matrículas, grupos e o progresso dos alunos neste curso serão removidos. Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.delete(`/courses/${course.slug}`);
      setCourses((current) => current.filter((item) => item.slug !== course.slug));
      setFeedback({ type: 'success', text: 'Curso excluído.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>Gestão de cursos</h1>
          <p>Crie cursos, organize seções e recursos, matricule participantes e forme grupos.</p>
        </section>

        <Feedback feedback={feedback} />

        <ImportCoursePanel
          onFeedback={setFeedback}
          onImported={(course) => navigate(`/gestao/cursos/${course.slug}`)}
        />

        <div className="manage-two-col">
          <form className="surface-card manage-form" onSubmit={handleCreate}>
            <h2>Novo curso</h2>
            <label>
              <span>Título</span>
              <input name="title" value={values.title} onChange={handleChange} required />
            </label>
            <label>
              <span>Identificador (slug, opcional)</span>
              <input
                name="slug"
                value={values.slug}
                onChange={handleChange}
                placeholder="gerado a partir do título"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Use letras minúsculas, números e hífens"
              />
            </label>
            <label>
              <span>Resumo</span>
              <textarea name="summary" rows="2" value={values.summary} onChange={handleChange} />
            </label>
            <div className="form-grid">
              <label>
                <span>Nível</span>
                <input name="level" value={values.level} onChange={handleChange} />
              </label>
              <label>
                <span>Horas estimadas</span>
                <input name="estimatedHours" type="number" min="0" value={values.estimatedHours} onChange={handleChange} />
              </label>
              <label>
                <span>Cor</span>
                <input name="accent" type="color" value={values.accent} onChange={handleChange} />
              </label>
              <label>
                <span>Layout</span>
                <select name="layout" value={values.layout} onChange={handleChange}>
                  {LAYOUTS.map((layout) => (
                    <option key={layout.id} value={layout.id}>{layout.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="muted">{getLayout(values.layout).description} Você ajusta cores, fonte e capa depois, em Configurações.</p>
            <label className="checkbox-row">
              <input type="checkbox" name="visible" checked={values.visible} onChange={handleChange} />
              <span>Publicar agora (senão o curso fica oculto até você publicar)</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="selfEnrolment" checked={values.selfEnrolment} onChange={handleChange} />
              <span>Autoinscrição ao acessar o curso</span>
            </label>
            <FormActions submitLabel="Criar e configurar" />
            <button type="button" className="ghost-button small" onClick={reset}>
              Limpar formulário
            </button>
          </form>

          <section className="manage-stack">
            {loading && <p className="muted">Carregando cursos...</p>}
            {!loading && courses.length === 0 && (
              <p className="muted">Você ainda não gerencia nenhum curso. Crie o primeiro ao lado.</p>
            )}
            {courses.map((course) => (
              <article key={course.slug} className="surface-card course-manage-card">
                <div className="manage-item-header">
                  <div>
                    <h3>{course.title}</h3>
                    <span className="muted manage-url">/{course.slug}</span>
                  </div>
                  <div className="manage-item-actions">
                    <span className={`badge ${course.visible ? '' : 'hidden'}`}>
                      {course.visible ? 'Publicado' : 'Oculto'}
                    </span>
                    <span className="badge">{course.selfEnrolment ? 'Autoinscrição' : 'Matrícula manual'}</span>
                  </div>
                </div>
                <p className="muted">
                  {course.modules.length} seção(ões) · {course.level || 'Sem nível'} · {course.estimatedHours}h
                </p>
                <div className="editor-actions">
                  <Link to={`/gestao/cursos/${course.slug}`} className="primary-button small as-link">
                    Gerenciar
                  </Link>
                  <Link to={`/cursos/${course.slug}`} className="ghost-button small as-link">
                    Ver como aluno
                  </Link>
                  {course.permissions.canDelete && (
                    <button type="button" className="danger-button small" onClick={() => handleDelete(course)}>
                      Excluir
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
