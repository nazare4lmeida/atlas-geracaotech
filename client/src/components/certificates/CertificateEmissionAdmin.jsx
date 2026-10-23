import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { errorText, Feedback } from '../manage/shared';
import Pager from '../Pager';
import { tipoLabel } from '../../utils/linkedin';

const dateText = (value) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

function aptidaoLabel(item) {
  if (!item.tipo) return { text: 'Não apto', tone: 'no' };
  return { text: `Apto · ${tipoLabel(item.tipo).toLowerCase()}`, tone: item.tipo };
}

// Gestão: aptidão de cada aluno no curso, solicitações, e geração individual ou em lote.
export default function CertificateEmissionAdmin({ courses }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({ q: '', aptidao: '', solicitou: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!slug && courses.length > 0) setSlug(courses[0].slug);
  }, [courses, slug]);

  const load = async (targetSlug = slug) => {
    if (!targetSlug) return;
    setLoading(true);
    setReport(null);
    try {
      const { data: response } = await api.get(`/courses/${targetSlug}/certificates/eligibility`);
      setData(response);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const students = data?.students || [];

  const filtered = useMemo(() => {
    const text = filters.q.trim().toLowerCase();
    return students.filter((item) => {
      if (text && !`${item.name} ${item.email}`.toLowerCase().includes(text)) return false;
      if (filters.aptidao === 'none' && item.tipo) return false;
      if (filters.aptidao && filters.aptidao !== 'none' && item.tipo !== filters.aptidao) return false;
      if (filters.solicitou === 'yes' && !item.requestedAt) return false;
      if (filters.solicitou === 'no' && item.requestedAt) return false;
      return true;
    });
  }, [students, filters]);

  const counts = useMemo(
    () => ({
      conclusao: students.filter((item) => item.tipo === 'conclusao').length,
      participacao: students.filter((item) => item.tipo === 'participacao').length,
      naoApto: students.filter((item) => !item.tipo).length,
      solicitaram: students.filter((item) => item.requestedAt && !item.issued).length
    }),
    [students]
  );

  const generate = async ({ userIds = null, onlyRequested = false, label }) => {
    const pending = onlyRequested
      ? students.filter((item) => item.requestedAt && item.tipo && !item.issued).length
      : userIds
        ? userIds.length
        : students.filter((item) => item.tipo && !item.issued).length;

    if (pending === 0) {
      setFeedback({ type: 'error', text: 'Nenhum aluno elegível para esta geração.' });
      return;
    }
    const releaseNote =
      data?.releaseAt && new Date(data.releaseAt) > new Date()
        ? `\n\nA liberação do curso está prevista para ${dateText(data.releaseAt)}, ainda não chegou.`
        : '';
    if (!window.confirm(`${label}: ${pending} certificado(s) serão emitidos.${releaseNote}\n\nContinuar?`)) return;

    setFeedback(null);
    try {
      const { data: response } = await api.post(`/courses/${slug}/certificates/generate`, { userIds, onlyRequested });
      setReport(response.report);
      setFeedback({ type: 'success', text: `${response.report.emitidos} certificado(s) emitido(s).` });
      load();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const course = courses.find((item) => item.slug === slug);
  const missingTemplates = data && (!data.templates.conclusao || !data.templates.participacao);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const safePage = Math.min(page, Math.max(Math.ceil(filtered.length / pageSize), 1));

  return (
    <section className="surface-card cert-admin">
      <div className="cert-admin-head">
        <div>
          <h2>Emissão de certificados</h2>
          <p className="muted">
            A aluna solicita quando estiver apta. Você confere a aptidão e gera, um a um ou em lote.
          </p>
        </div>
        <label className="cert-course-pick">
          <span>Curso</span>
          <select value={slug} onChange={(event) => setSlug(event.target.value)}>
            {courses.map((item) => (
              <option key={item.slug} value={item.slug}>{item.title}</option>
            ))}
          </select>
        </label>
      </div>

      <Feedback feedback={feedback} />

      {course && data && (
        <>
          <div className="emission-summary">
            <span className="badge">Conclusão: {counts.conclusao}</span>
            <span className="badge">Participação: {counts.participacao}</span>
            <span className="badge hidden">Não aptos: {counts.naoApto}</span>
            <span className="badge">Solicitações pendentes: {counts.solicitaram}</span>
            <span className="muted">
              Liberação: {data.releaseAt ? dateText(data.releaseAt) : 'não definida'}
            </span>
          </div>

          {missingTemplates && (
            <div className="alert error">
              Este curso ainda não tem
              {!data.templates.conclusao && ' modelo de conclusão'}
              {!data.templates.conclusao && !data.templates.participacao && ' nem'}
              {!data.templates.participacao && ' modelo de participação'}
              . Configure em "Modelo por curso" acima antes de gerar.
            </div>
          )}

          <div className="emission-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => generate({ onlyRequested: true, label: 'Gerar para aptos que solicitaram' })}
            >
              Gerar para aptos que solicitaram
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => generate({ label: 'Gerar para todos os aptos' })}
            >
              Gerar para todos os aptos
            </button>
          </div>

          {report && (
            <div className="emission-report" role="status">
              Emitidos: {report.emitidos} (conclusão {report.conclusao}, participação {report.participacao}) ·
              Ignorados: {report.ignorados}
              {report.erros.length > 0 && (
                <ul>
                  {report.erros.map((item) => (
                    <li key={item.email}>{item.email}: {item.mensagem}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="emission-filters">
            <input
              placeholder="Buscar por nome ou e-mail"
              value={filters.q}
              onChange={(event) => {
                setFilters({ ...filters, q: event.target.value });
                setPage(1);
              }}
            />
            <select value={filters.aptidao} onChange={(event) => { setFilters({ ...filters, aptidao: event.target.value }); setPage(1); }}>
              <option value="">Todas as aptidões</option>
              <option value="conclusao">Apto · conclusão</option>
              <option value="participacao">Apto · participação</option>
              <option value="none">Não apto</option>
            </select>
            <select value={filters.solicitou} onChange={(event) => { setFilters({ ...filters, solicitou: event.target.value }); setPage(1); }}>
              <option value="">Solicitação: todos</option>
              <option value="yes">Solicitou</option>
              <option value="no">Não solicitou</option>
            </select>
          </div>

          {loading ? (
            <p className="muted">Carregando alunos…</p>
          ) : (
            <div className="emission-table-wrap">
              <table className="emission-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Progresso</th>
                    <th>Presença</th>
                    <th>Projeto</th>
                    <th>Aptidão</th>
                    <th>Solicitou</th>
                    <th>Certificado</th>
                    <th className="col-actions">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => {
                    const apt = aptidaoLabel(item);
                    const canGenerate = item.tipo && !item.issued;
                    return (
                      <tr key={item.userId}>
                        <td className="cell-name">
                          <strong title={item.name}>{item.name}</strong>
                          <div className="muted" title={item.email}>{item.email}</div>
                        </td>
                        <td className="nowrap">{item.percentage}%</td>
                        <td className="nowrap">{item.presence}%</td>
                        <td className="nowrap">{item.finalProjectDone ? 'Entregue' : '—'}</td>
                        <td className="nowrap"><span className={`apt-badge is-${apt.tone}`}>{apt.text}</span></td>
                        <td className="nowrap">{item.requestedAt ? dateText(item.requestedAt) : '—'}</td>
                        <td className="nowrap">
                          {item.issued ? `${tipoLabel(item.issued.tipo)} · ${dateText(item.issued.issuedAt)}` : '—'}
                        </td>
                        <td className="col-actions">
                          {canGenerate ? (
                            <button type="button" className="primary-button small" onClick={() => generate({ userIds: [item.userId], label: `Gerar para ${item.name}` })}>
                              Gerar
                            </button>
                          ) : item.issued ? (
                            <span className="muted">Emitido</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pageRows.length === 0 && <p className="muted">Nenhum aluno com estes filtros.</p>}
            </div>
          )}

          <Pager
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            sizes={[10, 25, 50]}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
    </section>
  );
}
