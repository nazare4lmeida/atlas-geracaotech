import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/courses-manager.css';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import CourseCard from '../CourseCard';
import Pager from '../Pager';
import { Feedback, FormActions, errorText } from './shared';
import { LAYOUTS, getLayout } from '../../layouts/registry';
import { ImportCoursePanel } from './BackupPanel';

// Cursos da administração. Duas visões, sem repetir a lista:
// - Gestão (padrão): cada curso com status, Gerenciar, Ver como aluno e Excluir.
// - Visualizar: os cards como o aluno vê a biblioteca.
// Criar curso abre um pop-up com todas as informações necessárias.
const CAMPOS_INICIAIS = {
  title: '',
  slug: '',
  summary: '',
  level: 'Iniciante',
  layout: 'caderno',
  estimatedHours: 0,
  accent: '#6366f1',
  visible: false,
  selfEnrolment: true
};

export default function CoursesManager({ courses = [], progress = {}, onChanged }) {
  const navigate = useNavigate();
  const [modo, setModo] = useState('gestao');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);
  const [novoAberto, setNovoAberto] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const { values, handleChange, reset } = useForm(CAMPOS_INICIAIS);

  const gerenciaveis = courses.filter((course) => course.permissions?.canManage);
  // Paginação: a lista de gestão e a de visualização são paginadas para reduzir a rolagem.
  const itens = modo === 'gestao' ? gerenciaveis : courses;
  const paginasTotais = Math.max(1, Math.ceil(itens.length / porPagina));
  const paginaAtual = Math.min(pagina, paginasTotais);
  const visiveis = itens.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  function trocarModo(novo) {
    setModo(novo);
    setPagina(1);
  }

  useEffect(() => {
    if (!novoAberto) return undefined;
    const fechar = (event) => {
      if (event.key === 'Escape') fecharNovo();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [novoAberto]);

  function abrirNovo() {
    setFeedback(null);
    reset();
    setNovoAberto(true);
  }

  function fecharNovo() {
    if (salvando) return;
    setNovoAberto(false);
  }

  async function criarCurso(event) {
    event.preventDefault();
    setFeedback(null);
    setSalvando(true);
    try {
      const { data } = await api.post('/courses', {
        ...values,
        estimatedHours: Number(values.estimatedHours) || 0
      });
      setNovoAberto(false);
      navigate(`/gestao/cursos/${data.course.slug}`);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCurso(course) {
    if (!window.confirm(`Excluir o curso "${course.title}"? Seções, matrículas, grupos e o progresso dos alunos neste curso serão removidos. Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.delete(`/courses/${course.slug}`);
      setFeedback({ type: 'success', text: 'Curso excluído.' });
      onChanged?.();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  return (
    <div className="courses-manager">
      <div className="cursos-barra">
        <div className="cursos-modos" role="radiogroup" aria-label="Modo de exibição">
          <button type="button" role="radio" aria-checked={modo === 'gestao'} className={modo === 'gestao' ? 'is-active' : ''} onClick={() => trocarModo('gestao')}>
            Gestão
          </button>
          <button type="button" role="radio" aria-checked={modo === 'visualizar'} className={modo === 'visualizar' ? 'is-active' : ''} onClick={() => trocarModo('visualizar')}>
            Visualizar
          </button>
        </div>
        <button type="button" className="primary-button small" onClick={abrirNovo}>
          + Novo curso
        </button>
      </div>

      <Feedback feedback={feedback} />

      {modo === 'gestao' ? (
        <>
          <ImportCoursePanel
            onFeedback={setFeedback}
            onImported={(course) => navigate(`/gestao/cursos/${course.slug}`)}
          />

          <section className="manage-stack">
            {gerenciaveis.length === 0 && (
              <p className="muted">Nenhum curso ainda. Use “+ Novo curso” para criar o primeiro.</p>
            )}
            {visiveis.map((course) => (
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
                  {course.permissions?.canDelete && (
                    <button type="button" className="danger-button small" onClick={() => excluirCurso(course)}>
                      Excluir
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <div className="course-grid">
          {visiveis.map((course) => (
            <CourseCard key={course.slug} course={course} progress={progress[course.slug]} />
          ))}
        </div>
      )}

      {itens.length > 0 && (
        <Pager
          total={itens.length}
          page={paginaAtual}
          pageSize={porPagina}
          sizes={[5, 10, 20]}
          onPage={setPagina}
          onPageSize={(tamanho) => {
            setPorPagina(tamanho);
            setPagina(1);
          }}
        />
      )}

      {novoAberto && (
        <div className="modal-backdrop" role="presentation" onClick={fecharNovo}>
          <div
            className="modal-card cm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-novo-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cm-modal-cabecalho">
              <h2 id="cm-novo-titulo">Novo curso</h2>
              <button type="button" className="icon-button" onClick={fecharNovo} aria-label="Fechar">×</button>
            </div>

            <form className="cm-form" onSubmit={criarCurso}>
              <Feedback feedback={feedback} />

              <label>
                <span>Título</span>
                <input name="title" value={values.title} onChange={handleChange} required autoFocus />
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
                <textarea name="summary" rows="3" value={values.summary} onChange={handleChange} />
              </label>

              <div className="cm-grid">
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

              <div className="cm-acoes">
                <button type="button" className="ghost-button small" onClick={reset} disabled={salvando}>
                  Limpar
                </button>
                <FormActions submitLabel={salvando ? 'Criando…' : 'Criar e configurar'} onCancel={fecharNovo} disabled={salvando} />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
