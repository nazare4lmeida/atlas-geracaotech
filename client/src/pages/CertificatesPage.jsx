import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import CertificateTemplatesAdmin from '../components/certificates/CertificateTemplatesAdmin';
import CertificateEmissionAdmin from '../components/certificates/CertificateEmissionAdmin';
import Pager from '../components/Pager';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { drawCertificate } from '../utils/certificateRender';
import { linkedinAddUrl, linkedinPostText, tipoLabel } from '../utils/linkedin';
import { errorText } from '../components/manage/shared';

const SEEN_KEY = 'atlas-certificados-vistos';

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markSeen(codes) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...codes]));
  } catch {
    // Sem armazenamento disponível, o aviso só some na sessão atual.
  }
}

const dateText = (value) => (value ? new Date(value).toLocaleDateString('pt-BR') : '');

// "embedded": usada dentro da página Documentos (sem menu lateral nem título próprio).
export default function CertificatesPage({ embedded = false }) {
  const { isAdmin, isTeacher } = useAuth();
  const [dashboard, setDashboard] = useState({ progress: {}, certificates: [], certificateStatus: {} });
  const [courses, setCourses] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [seen, setSeen] = useState(() => readSeen());
  const [notice, setNotice] = useState(null);
  const [busySlug, setBusySlug] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const frontRef = useRef(null);
  const versoRef = useRef(null);

  const loadDashboard = useCallback(() => api.get('/users/dashboard').then(({ data }) => setDashboard(data)), []);
  const loadCourses = useCallback(() => api.get('/courses').then(({ data }) => setCourses(data.courses || [])), []);

  useEffect(() => {
    // Administração: gestão de modelos e emissão. Professor: só os certificados dele, sem lista de cursos.
    if (isAdmin) {
      loadCourses().catch(() => setCourses([]));
    } else if (isTeacher) {
      loadDashboard().catch(() => setNotice({ type: 'error', text: 'Não foi possível carregar seus certificados.' }));
    } else {
      Promise.all([loadDashboard(), loadCourses()]).catch(() => setNotice({ type: 'error', text: 'Não foi possível carregar seus certificados.' }));
    }
  }, [isAdmin, isTeacher, loadDashboard, loadCourses]);

  // Desenha frente e verso quando um certificado é aberto.
  useEffect(() => {
    const template = viewing?.template;
    if (!template || !frontRef.current) return;
    drawCertificate(frontRef.current, template).catch((err) => setNotice({ type: 'error', text: err.message }));
    if (template.verso && versoRef.current) {
      drawCertificate(versoRef.current, template.verso).catch((err) => setNotice({ type: 'error', text: err.message }));
    }
  }, [viewing]);

  const issued = dashboard.certificates || [];
  const unseen = issued.filter((item) => !seen.has(item.authCode));

  const dismissCongrats = () => {
    const next = new Set([...seen, ...issued.map((item) => item.authCode)]);
    setSeen(next);
    markSeen(next);
  };

  const openCertificate = async (slug) => {
    setNotice(null);
    try {
      const { data } = await api.get(`/courses/${slug}/certificate`);
      setViewing(data.certificate);
    } catch (error) {
      setNotice({ type: 'error', text: errorText(error) });
    }
  };

  const requestCertificate = async (course, tipo) => {
    setBusySlug(course.slug);
    setNotice(null);
    try {
      await api.post(`/courses/${course.slug}/certificate-request`);
      await loadDashboard();
      setNotice({ type: 'success', text: `Solicitação enviada. Seu certificado de ${tipoLabel(tipo).toLowerCase()} será liberado pela gestão.` });
    } catch (error) {
      setNotice({ type: 'error', text: errorText(error) });
    } finally {
      setBusySlug('');
    }
  };

  const downloadViewing = () => {
    if (!viewing) return;
    const link = (canvas, suffix) => {
      const anchor = document.createElement('a');
      anchor.href = canvas.toDataURL('image/png');
      anchor.download = `${viewing.courseSlug}-certificado-${suffix}.png`;
      anchor.click();
    };
    if (frontRef.current) link(frontRef.current, 'frente');
    if (viewing.template?.verso && versoRef.current) setTimeout(() => link(versoRef.current, 'verso'), 300);
  };

  const copyPostText = async () => {
    try {
      await navigator.clipboard.writeText(linkedinPostText(viewing));
      setNotice({ type: 'success', text: 'Texto copiado. Cole na sua publicação no LinkedIn.' });
    } catch {
      setNotice({ type: 'error', text: 'Não consegui copiar automaticamente. Selecione o texto e copie manualmente.' });
    }
  };

  const envoltorio = (conteudo) =>
    embedded ? (
      conteudo
    ) : (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-content">{conteudo}</div>
      </div>
    );

  if (isAdmin) {
    return envoltorio(
      <>
        {!embedded && (
          <section className="section-heading">
            <h1>Certificados</h1>
            <p>Modelos, aptidão dos alunos e geração dos certificados.</p>
          </section>
        )}
        <div className="cert-admin-wrap">
          <CertificateTemplatesAdmin courses={courses} onCoursesChanged={loadCourses} />
        </div>
        <div className="cert-admin-wrap">
          <CertificateEmissionAdmin courses={courses} />
        </div>
      </>
    );
  }

  const statusOf = (course) => dashboard.certificateStatus?.[course.slug] || {};
  const pageCourses = courses.slice((page - 1) * pageSize, page * pageSize);
  const safePage = Math.min(page, Math.max(Math.ceil(courses.length / pageSize), 1));

  return envoltorio(
      <>
        {!embedded && (
          <section className="section-heading">
            <h1>Certificações</h1>
            <p>Seus certificados emitidos pela Geração Tech e a situação de cada curso.</p>
          </section>
        )}

        {notice && <div className={`alert ${notice.type === 'error' ? 'error' : 'success'}`}>{notice.text}</div>}

        {unseen.length > 0 && (
          <div className="cert-congrats" role="status">
            <div>
              <strong>Parabéns!</strong> {unseen.length === 1
                ? `Seu certificado de ${tipoLabel(unseen[0].tipo).toLowerCase()} em "${unseen[0].courseName}" já está disponível.`
                : `Você tem ${unseen.length} novos certificados disponíveis.`}
            </div>
            <div className="cert-congrats-actions">
              <button type="button" className="ghost-button small" onClick={() => openCertificate(unseen[0].courseSlug)}>Ver certificado</button>
              <button type="button" className="ghost-button small" onClick={dismissCongrats}>Ok</button>
            </div>
          </div>
        )}

        <section className="surface-card cert-list-section">
          <h2>Meus certificados</h2>
          {issued.length === 0 && <p className="muted">Nenhum certificado emitido ainda.</p>}
          <div className="cert-issued-grid">
            {issued.map((item) => (
              <article key={item.authCode} className="cert-issued-card">
                <span className="cert-badge">{tipoLabel(item.tipo)}</span>
                <h3>{item.courseName}</h3>
                <p className="muted">Emitido em {dateText(item.issuedAt)} · {item.authCode}</p>
                <div className="editor-actions">
                  <button type="button" className="primary-button small" onClick={() => openCertificate(item.courseSlug)}>Ver e baixar</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {viewing && (
          <section className="surface-card cert-viewer">
            <div className="cert-viewer-head">
              <h2>{viewing.courseName}</h2>
              <button type="button" className="ghost-button small" onClick={() => setViewing(null)}>Fechar</button>
            </div>
            {viewing.template ? (
              <div className="certificate-sides">
                <canvas ref={frontRef} className="certificate-canvas" aria-label="Certificado (frente)" />
                {viewing.template.verso && <canvas ref={versoRef} className="certificate-canvas" aria-label="Certificado (verso)" />}
              </div>
            ) : (
              <p className="muted">Este certificado ainda não tem modelo visual. Peça à gestão para configurar.</p>
            )}
            <p className="certificate-code">
              Código de autenticação: <strong>{viewing.authCode}</strong> · verificação em{' '}
              <a href={viewing.verificationUrl} target="_blank" rel="noreferrer">{viewing.verificationUrl}</a>
            </p>
            <div className="cert-share-actions">
              <button type="button" className="primary-button" onClick={downloadViewing} disabled={!viewing.template}>
                {viewing.template?.verso ? 'Baixar frente e verso (PNG)' : 'Baixar certificado (PNG)'}
              </button>
              <a className="ghost-button" href={linkedinAddUrl(viewing)} target="_blank" rel="noreferrer">
                Adicionar ao LinkedIn
              </a>
              <button type="button" className="ghost-button" onClick={copyPostText}>Copiar texto para publicar</button>
            </div>
            <details className="cert-post-preview">
              <summary>Ver texto para publicação</summary>
              <pre>{linkedinPostText(viewing)}</pre>
            </details>
          </section>
        )}

        {!isTeacher && (
        <section className="surface-card cert-list-section">
          <h2>Cursos</h2>
          <div className="course-grid">
            {pageCourses.map((course) => {
              const status = statusOf(course);
              const issuedHere = issued.find((item) => item.courseSlug === course.slug);
              return (
                <article key={course.slug} className="surface-card">
                  <h3>{course.title}</h3>
                  {issuedHere ? (
                    <p>Certificado de {tipoLabel(issuedHere.tipo).toLowerCase()} emitido.</p>
                  ) : status.requestedAt ? (
                    <p>
                      Emissão solicitada em {dateText(status.requestedAt)}.
                      {status.releaseAt && new Date(status.releaseAt) > new Date() && ` Liberação prevista para ${dateText(status.releaseAt)}.`}
                    </p>
                  ) : status.eligibleTipo ? (
                    <p>Você atende aos requisitos de certificado de {tipoLabel(status.eligibleTipo).toLowerCase()}.</p>
                  ) : (
                    <p>Em andamento: {Math.round(status.percentage || 0)}% concluído.</p>
                  )}
                  <div className="editor-actions">
                    {issuedHere ? (
                      <button type="button" className="ghost-button small" onClick={() => openCertificate(course.slug)}>Ver certificado</button>
                    ) : !status.requestedAt && status.eligibleTipo ? (
                      <button
                        type="button"
                        className="primary-button small"
                        disabled={busySlug === course.slug}
                        onClick={() => requestCertificate(course, status.eligibleTipo)}
                      >
                        Solicitar certificado
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <Pager
            total={courses.length}
            page={safePage}
            pageSize={pageSize}
            sizes={[6, 12, 24, 48]}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
        )}
      </>
  );
}
