import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import CourseSettingsForm from '../components/manage/CourseSettingsForm';
import ContentEditor from '../components/manage/ContentEditor';
import ParticipantsPanel from '../components/manage/ParticipantsPanel';
import GroupsPanel from '../components/manage/GroupsPanel';
import BackupPanel from '../components/manage/BackupPanel';
import { Feedback, errorText } from '../components/manage/shared';

const TABS = [
  { id: 'conteudo', label: 'Conteúdo' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'backup', label: 'Backup' }
];

// Tela de gestão de um curso, com abas no estilo do Moodle.
export default function ManageCoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('conteudo');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .get(`/courses/${slug}`)
      .then(({ data }) => {
        if (!active) return;
        setCourse(data.course);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setFeedback({ type: 'error', text: errorText(error) });
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Excluir o curso "${course.title}" permanentemente?`)) return;
    try {
      await api.delete(`/courses/${course.slug}`);
      navigate('/cursos');
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  if (status === 'loading') {
    return <div className="page-state">Carregando curso...</div>;
  }

  if (status === 'error' || !course) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-content">
          <Feedback feedback={feedback} />
          <Link to="/cursos" className="ghost-button as-link">
            Voltar à gestão de cursos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <Link to="/cursos" className="text-link">
            ← Gestão de cursos
          </Link>
          <h1>{course.title}</h1>
          <p className="muted">
            /{course.slug} · {course.visible ? 'Publicado' : 'Oculto para alunos'} ·{' '}
            {course.selfEnrolment ? 'Autoinscrição' : 'Matrícula manual'}
          </p>
          <div className="editor-actions">
            <Link to={`/cursos/${course.slug}`} className="ghost-button small as-link">
              Ver como aluno
            </Link>
            {course.permissions.canDelete && (
              <button type="button" className="danger-button small" onClick={handleDelete}>
                Excluir curso
              </button>
            )}
          </div>
        </section>

        <nav className="module-tabs" aria-label="Seções de gestão">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === tab ? 'tab active' : 'tab'}
              onClick={() => {
                setFeedback(null);
                setTab(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <Feedback feedback={feedback} />

        {tab === 'conteudo' && (
          <ContentEditor course={course} onCourseChange={setCourse} onFeedback={setFeedback} />
        )}

        {tab === 'configuracoes' && (
          <CourseSettingsForm course={course} onSaved={setCourse} onFeedback={setFeedback} />
        )}

        {tab === 'participantes' && <ParticipantsPanel slug={course.slug} onFeedback={setFeedback} />}

        {tab === 'grupos' && <GroupsPanel slug={course.slug} onFeedback={setFeedback} />}

        {tab === 'backup' && (
          <BackupPanel course={course} onCourseChange={setCourse} onFeedback={setFeedback} />
        )}
      </div>
    </div>
  );
}
