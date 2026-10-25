import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Feedback, errorText } from '../components/manage/shared';
import CalendarioAulas from '../components/presenca/CalendarioAulas';
import AulaFormulario from '../components/presenca/AulaFormulario';
import ChamadaAula from '../components/presenca/ChamadaAula';
import RelatorioPresenca from '../components/presenca/RelatorioPresenca';
import GerarCronograma from '../components/presenca/GerarCronograma';
import { baixarHtml, gerarCronogramaHtml } from '../utils/cronogramaHtml';
import '../styles/cronograma.css';
import '../styles/docente.css';

// Presença de turmas e grupos de curso: é o mesmo espaço para o aluno. Admin gerencia tudo;
// professor faz a chamada e gerencia os grupos dos seus cursos; gestão acompanha, filtra e exporta.
export default function PresencaTurmasPage() {
  const { isAdmin, isTeacher, isGestao } = useAuth();
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState('');
  const [aulas, setAulas] = useState([]);
  const [hoje, setHoje] = useState('');
  const [professores, setProfessores] = useState([]);
  const [todosProfessores, setTodosProfessores] = useState([]);
  const [editandoProfessores, setEditandoProfessores] = useState(false);
  const [escolhidos, setEscolhidos] = useState([]);
  const [aba, setAba] = useState('calendario');
  const [formulario, setFormulario] = useState(null);
  const [chamada, setChamada] = useState(null);
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [valorLote, setValorLote] = useState({ dias: '', horario: '', modulo: '', titulo: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linkEditado, setLinkEditado] = useState(null);
  const [podeGerenciarGrupo, setPodeGerenciarGrupo] = useState(false);
  const [novaAulaGrupo, setNovaAulaGrupo] = useState(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const espacos = api.get('/presenca/gestao/espacos').then(({ data }) => data).catch(() => ({ turmas: [], grupos: [] }));
    const docente = api.get('/docente/turmas').then(({ data }) => data.turmas).catch(() => null);
    Promise.all([docente, espacos])
      .then(([turmasDocente, espacosData]) => {
        const listaTurmas = (turmasDocente || espacosData.turmas || []).map((t) => ({ ...t, tipo: 'turma' }));
        const listaGrupos = (espacosData.grupos || []).map((g) => ({
          ...g,
          tipo: 'grupo',
          modalidade: 'Grupo',
          turno: '',
          diasSemana: '',
          horario: '',
          ativa: true
        }));
        const lista = [...listaTurmas, ...listaGrupos];
        setTurmas(lista);
        const primeira = lista.find((t) => t.ativa) || lista[0];
        if (primeira) setTurmaId(primeira.id);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
    if (isAdmin) {
      api.get('/docente/professores').then(({ data }) => setTodosProfessores(data.professores)).catch(() => {});
    }
  }, [isAdmin]);

  const turma = turmas.find((t) => t.id === turmaId);
  const ehGrupo = turma?.tipo === 'grupo';
  // Quem pode mudar as aulas: admin nas turmas; nos grupos, quem gerencia o curso (admin ou docente do curso).
  const podeEditar = ehGrupo ? podeGerenciarGrupo : isAdmin;
  // Quem faz a chamada: o mesmo que pode editar, além do professor da turma.
  const podeChamada = ehGrupo ? podeGerenciarGrupo : isAdmin || isTeacher;

  const carregarAulas = () => {
    if (!turmaId || !turma) return Promise.resolve();
    setLoading(true);
    const url = ehGrupo ? `/presenca/gestao/espacos/grupo/${turmaId}/aulas` : `/docente/turmas/${turmaId}/aulas`;
    return api
      .get(url)
      .then(({ data }) => {
        setAulas(data.aulas);
        setHoje(data.hoje);
        setProfessores(data.professores || []);
        if (ehGrupo) setPodeGerenciarGrupo(Boolean(data.podeGerenciar));
        setSelecionadas((atual) => new Set([...atual].filter((id) => data.aulas.some((a) => a.sessionId === id))));
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setFormulario(null);
    setChamada(null);
    setNovaAulaGrupo(null);
    setGerando(false);
    setSelecionadas(new Set());
    setEditandoProfessores(false);
    carregarAulas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, turmas.length]);

  async function salvarLink(event) {
    event.preventDefault();
    try {
      const { data } = await api.put(`/docente/turmas/${turmaId}/link`, { linkAoVivo: linkEditado ?? '' });
      setTurmas((atual) => atual.map((t) => (t.id === turmaId ? { ...t, linkAoVivo: data.linkAoVivo } : t)));
      setLinkEditado(null);
      setFeedback({ type: 'success', text: data.linkAoVivo ? 'Link da aula ao vivo salvo.' : 'Link da aula ao vivo removido.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  const resumo = useMemo(() => {
    const ativas = aulas.filter((a) => a.situacao !== 'cancelada');
    const realizadas = ativas.filter((a) => a.situacao === 'realizada');
    const comChamada = realizadas.filter((a) => a.marcadas > 0 && a.matriculados > 0);
    const presencas = comChamada.reduce((s, a) => s + a.presentes + a.justificadas, 0);
    const possiveis = comChamada.reduce((s, a) => s + a.matriculados, 0);
    return {
      total: ativas.length,
      realizadas: realizadas.length,
      previstas: ativas.length - realizadas.length,
      media: possiveis ? Math.round((presencas / possiveis) * 100) : null
    };
  }, [aulas]);

  const percentual = (a) => (a.matriculados ? Math.round(((a.presentes + a.justificadas) / a.matriculados) * 100) : null);
  const formatarData = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  function aoConcluir(mensagem) {
    setFormulario(null);
    setFeedback({ type: 'success', text: mensagem });
    carregarAulas();
  }

  // CSV com cabeçalho data;horario;modulo;titulo (o professor é o da turma). Data em dd/mm/aaaa ou aaaa-mm-dd.
  async function importarCsv(arquivo) {
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const separador = (linhas[0] || '').includes(';') ? ';' : ',';
      const cabecalho = (linhas[0] || '').toLowerCase().split(separador).map((c) => c.trim().replace(/"/g, ''));
      const temCabecalho = cabecalho.includes('data');
      const colunas = temCabecalho ? cabecalho : ['data', 'horario', 'modulo', 'titulo'];
      const dados = temCabecalho ? linhas.slice(1) : linhas;
      const itens = [];
      for (let i = 0; i < dados.length; i++) {
        const valores = dados[i].split(separador).map((v) => v.trim().replace(/^"|"$/g, ''));
        const linha = Object.fromEntries(colunas.map((c, idx) => [c, valores[idx] || '']));
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(linha.data);
        const data = m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(linha.data) ? linha.data : null;
        if (!data) {
          setFeedback({ type: 'error', text: `Linha ${i + 1}: data inválida. Use dd/mm/aaaa.` });
          return;
        }
        itens.push({ data, horario: linha.horario || '', modulo: linha.modulo || '', titulo: linha.titulo || '' });
      }
      if (!itens.length) {
        setFeedback({ type: 'error', text: 'O arquivo não tem linhas para importar.' });
        return;
      }
      const { data } = await api.post(`/docente/turmas/${turmaId}/aulas/importar`, { linhas: itens });
      const ignoradas = data.ignoradas.length ? ` ${data.ignoradas.length} linha(s) ignorada(s) por data já ocupada.` : '';
      setFeedback({ type: 'success', text: `${data.criadas} aula(s) importada(s).${ignoradas}` });
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function preencherModulos() {
    try {
      const { data } = await api.post(`/docente/turmas/${turmaId}/aulas/preencher-modulos`);
      const sobra = data.sobrando ? ` Sobraram ${data.sobrando} aula(s) da ementa sem uso.` : '';
      setFeedback({ type: 'success', text: `${data.preenchidas} aula(s) receberam módulo e título da ementa.${sobra}` });
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function criarAulaGrupo(event) {
    event.preventDefault();
    try {
      await api.post(`/presenca/gestao/espacos/grupo/${turmaId}/aulas`, novaAulaGrupo);
      setNovaAulaGrupo(null);
      setFeedback({ type: 'success', text: 'Aula criada para o grupo.' });
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function alternarCancelamento(aula) {
    const cancelar = aula.situacao !== 'cancelada';
    try {
      await api.post(`/presenca/gestao/aulas/${aula.sessionId}/cancelamento`, { cancelada: cancelar });
      setFeedback({ type: 'success', text: cancelar ? 'Aula cancelada. Ela sai do cálculo de presença, mas o histórico fica.' : 'Aula reativada.' });
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function remover(aula) {
    if (!window.confirm(`Remover a aula de ${formatarData(aula.date)}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/presenca/gestao/aulas/${aula.sessionId}`);
      setFeedback({ type: 'success', text: 'Aula removida.' });
      if (chamada?.sessionId === aula.sessionId) setChamada(null);
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  // Ações em lote (só turmas, pelo cronograma).
  async function executarLote(acao, parametros = {}, confirmacao = null) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    try {
      const { data } = await api.post(`/docente/turmas/${turmaId}/aulas/lote`, {
        sessionIds: [...selecionadas],
        acao,
        ...parametros
      });
      let texto = `${data.afetadas} aula(s) atualizada(s).`;
      if (data.ignoradas?.length) {
        texto += ` ${data.ignoradas.length} não puderam ser removidas porque já têm presença registrada (use cancelar).`;
      }
      setFeedback({ type: 'success', text: texto });
      setSelecionadas(new Set());
      setValorLote({ dias: '', horario: '', modulo: '', titulo: '' });
      carregarAulas();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  function alternarSelecao(id) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function alternarTodas() {
    setSelecionadas((atual) => (atual.size === aulas.length ? new Set() : new Set(aulas.map((a) => a.sessionId))));
  }

  function abrirChamada(aula) {
    setChamada(aula);
    setFormulario(null);
  }

  async function salvarProfessores() {
    try {
      const { data } = await api.put(`/docente/turmas/${turmaId}/professores`, { userIds: escolhidos });
      setProfessores(data.professores);
      setEditandoProfessores(false);
      setFeedback({ type: 'success', text: 'Professores da turma atualizados. Eles passam a ver e editar este curso.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  function alternarProfessor(id) {
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  const tudoSelecionado = aulas.length > 0 && selecionadas.size === aulas.length;
  const cursos = useMemo(() => {
    const mapa = new Map();
    turmas.forEach((t) => t.cursoId && mapa.set(t.cursoId, t.curso));
    return [...mapa].map(([id, nome]) => ({ id, nome }));
  }, [turmas]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content cron-gestao">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">{isAdmin ? 'Gestão' : isGestao ? 'Gestão' : 'Professor'}</span>
            <h1>Presença</h1>
            <p>
              {isAdmin
                ? 'Turmas e grupos de curso. Aulas e tópicos são ajustados aqui, em massa ou aula a aula. Em Relatório, filtre e exporte a presença.'
                : isGestao
                  ? 'Acompanhamento da presença das turmas e grupos, com filtros e exportação. Os ajustes são feitos pela equipe do curso.'
                  : 'Turmas e grupos dos seus cursos: chamada e cronograma.'}
            </p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="cron-barra">
          <label>
            <span>Turma ou grupo</span>
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              {turmas.map((t) => (
                <option key={`${t.tipo}:${t.id}`} value={t.id}>
                  {t.curso} · {t.tipo === 'grupo' ? 'Grupo' : 'Turma'}: {t.nome}{t.ativa ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </label>
          {turma && (
            <p className="muted">
              {turma.tipo === 'grupo' ? 'Grupo do curso' : turma.modalidade} {turma.turno ? `· ${turma.turno}` : ''}{turma.diasSemana ? ` · ${turma.diasSemana}` : ''}{turma.horario ? ` · ${turma.horario}` : ''} · {turma.alunos} aluno(s){ehGrupo ? ' no grupo' : ' ativo(s)'}
            </p>
          )}
          {isAdmin && turma && !ehGrupo && (
            <form className="docente-link-turma" onSubmit={salvarLink}>
              <label>
                <span>Link da aula ao vivo</span>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={linkEditado ?? turma.linkAoVivo ?? ''}
                  onChange={(e) => setLinkEditado(e.target.value)}
                  maxLength={500}
                />
              </label>
              <button type="submit" className="ghost-button small" disabled={linkEditado === null}>Salvar link</button>
            </form>
          )}
          {!isAdmin && turma?.linkAoVivo && !ehGrupo && (
            <a className="ghost-button small" href={turma.linkAoVivo} target="_blank" rel="noopener noreferrer">Entrar na aula ao vivo</a>
          )}
          {podeEditar && !ehGrupo && (
            <div className="docente-acoes">
              <button type="button" className="primary-button small" onClick={() => setGerando(true)} disabled={!turmaId}>
                Gerar cronograma
              </button>
              <label className="ghost-button small">
                Importar CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    importarCsv(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="ghost-button small" onClick={preencherModulos} disabled={!turmaId}>
                Preencher módulos
              </button>
              <button type="button" className="ghost-button small" onClick={() => setFormulario({ modo: 'avulsa' })} disabled={!turmaId}>
                Nova aula avulsa
              </button>
            </div>
          )}
          {podeEditar && ehGrupo && (
            <div className="docente-acoes">
              <button type="button" className="primary-button small" onClick={() => setGerando(true)}>
                Gerar cronograma
              </button>
              <button type="button" className="ghost-button small" onClick={() => setNovaAulaGrupo({ data: '', titulo: '', horario: '' })}>
                Nova aula do grupo
              </button>
            </div>
          )}
        </section>

        {!ehGrupo && (
          <section className="docente-professores" aria-label="Professores da turma">
            <div className="docente-professores-lista">
              <span className="docente-rotulo">Professores</span>
              {professores.length === 0 && <span className="muted">Nenhum professor vinculado.</span>}
              {professores.map((p) => (
                <span key={p.id} className="docente-chip">{p.name}</span>
              ))}
              {isAdmin && !editandoProfessores && (
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => {
                    setEscolhidos(professores.map((p) => p.id));
                    setEditandoProfessores(true);
                  }}
                >
                  Editar
                </button>
              )}
            </div>
            {isAdmin && editandoProfessores && (
              <div className="docente-professores-editar">
                {todosProfessores.length === 0 && <span className="muted">Nenhuma conta de professor ativa.</span>}
                {todosProfessores.map((p) => (
                  <label key={p.id} className="docente-check">
                    <input type="checkbox" checked={escolhidos.includes(p.id)} onChange={() => alternarProfessor(p.id)} />
                    {p.name}
                  </label>
                ))}
                <div className="docente-acoes">
                  <button type="button" className="primary-button small" onClick={salvarProfessores}>Salvar</button>
                  <button type="button" className="ghost-button small" onClick={() => setEditandoProfessores(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        )}

        {gerando && turma && podeEditar && (
          <GerarCronograma
            tipo={turma.tipo}
            id={turmaId}
            onCancel={() => setGerando(false)}
            onDone={(mensagem) => {
              setGerando(false);
              setFeedback({ type: 'success', text: mensagem });
              carregarAulas();
            }}
          />
        )}

        {turma && aulas.length > 0 && (
          <div className="docente-acoes">
            <button
              type="button"
              className="ghost-button small"
              onClick={() =>
                baixarHtml(
                  `cronograma-${turma.nome}`,
                  gerarCronogramaHtml({
                    titulo: `${turma.curso} · ${turma.tipo === 'grupo' ? 'Grupo' : 'Turma'}: ${turma.nome}`,
                    subtitulo: 'Cronograma de aulas e presença',
                    aulas
                  })
                )
              }
            >
              Exportar cronograma (HTML)
            </button>
          </div>
        )}

        {novaAulaGrupo && (
          <form className="surface-card docente-form" onSubmit={criarAulaGrupo}>
            <h2>Nova aula do grupo</h2>
            <label>
              <span>Data</span>
              <input type="date" value={novaAulaGrupo.data} onChange={(e) => setNovaAulaGrupo({ ...novaAulaGrupo, data: e.target.value })} required />
            </label>
            <label>
              <span>Horário (opcional)</span>
              <input placeholder="08:00-10:00" value={novaAulaGrupo.horario} onChange={(e) => setNovaAulaGrupo({ ...novaAulaGrupo, horario: e.target.value })} maxLength={60} />
            </label>
            <label>
              <span>Tópico (opcional)</span>
              <input value={novaAulaGrupo.titulo} onChange={(e) => setNovaAulaGrupo({ ...novaAulaGrupo, titulo: e.target.value })} maxLength={200} />
            </label>
            <div className="docente-acoes">
              <button type="submit" className="primary-button small">Criar aula</button>
              <button type="button" className="ghost-button small" onClick={() => setNovaAulaGrupo(null)}>Cancelar</button>
            </div>
          </form>
        )}

        {formulario && turma && isAdmin && !ehGrupo && (
          <AulaFormulario
            modo={formulario.modo}
            turma={turma}
            aula={formulario.aula}
            onDone={aoConcluir}
            onCancel={() => setFormulario(null)}
          />
        )}

        {aba !== 'relatorio' && (
          <section className="cron-numeros" aria-label="Resumo da turma">
            <div><strong>{resumo.total}</strong><span>aulas no cronograma</span></div>
            <div><strong>{resumo.realizadas}</strong><span>realizadas</span></div>
            <div><strong>{resumo.previstas}</strong><span>previstas</span></div>
            <div><strong>{resumo.media !== null ? `${resumo.media}%` : '—'}</strong><span>presença média nas realizadas</span></div>
          </section>
        )}

        <div className="cron-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'calendario'} className={aba === 'calendario' ? 'is-active' : ''} onClick={() => setAba('calendario')}>Calendário</button>
          <button type="button" role="tab" aria-selected={aba === 'aulas'} className={aba === 'aulas' ? 'is-active' : ''} onClick={() => setAba('aulas')}>Aulas</button>
          <button type="button" role="tab" aria-selected={aba === 'relatorio'} className={aba === 'relatorio' ? 'is-active' : ''} onClick={() => setAba('relatorio')}>Relatório</button>
        </div>

        {loading && <div className="page-state">Carregando aulas…</div>}

        {!loading && aba === 'relatorio' && <RelatorioPresenca cursos={cursos} />}

        {!loading && aba === 'calendario' && (
          <CalendarioAulas
            aulas={aulas}
            hoje={hoje}
            onSelect={podeChamada ? abrirChamada : undefined}
            emptyText={podeEditar ? 'Esta turma ainda não tem aulas. Crie uma aula para começar.' : 'Ainda não há aulas cadastradas.'}
            renderChip={(aula, lista) =>
              lista ? (
                <span className="cron-presenca">
                  {aula.situacao === 'cancelada' ? 'cancelada' : aula.marcadas ? `${aula.presentes + aula.justificadas}/${aula.matriculados} presentes` : 'sem chamada'}
                </span>
              ) : (
                <>
                  <small>{aula.horario}</small>
                  {aula.titulo}
                  {aula.situacao === 'cancelada' && <em> · cancelada</em>}
                  {aula.marcadas > 0 && aula.situacao !== 'cancelada' && <em> · {aula.presentes + aula.justificadas}/{aula.matriculados}</em>}
                </>
              )
            }
          />
        )}

        {!loading && aba === 'aulas' && (
          <section className="cron-tabela-box">
            {podeEditar && !ehGrupo && selecionadas.size > 0 && (
              <div className="docente-lote" role="region" aria-label="Ações em lote">
                <strong>{selecionadas.size} aula(s) selecionada(s)</strong>
                <div className="docente-lote-acoes">
                  <div className="docente-lote-campo">
                    <input
                      type="number"
                      placeholder="Dias (ex.: 7 ou -2)"
                      value={valorLote.dias}
                      onChange={(e) => setValorLote({ ...valorLote, dias: e.target.value })}
                    />
                    <button type="button" className="ghost-button small" disabled={!valorLote.dias} onClick={() => executarLote('deslocar', { dias: Number(valorLote.dias) })}>
                      Deslocar datas
                    </button>
                  </div>
                  <div className="docente-lote-campo">
                    <input placeholder="08:00-10:00" value={valorLote.horario} onChange={(e) => setValorLote({ ...valorLote, horario: e.target.value })} />
                    <button type="button" className="ghost-button small" disabled={!valorLote.horario} onClick={() => executarLote('horario', { horario: valorLote.horario })}>
                      Definir horário
                    </button>
                  </div>
                  <div className="docente-lote-campo">
                    <input placeholder="Módulo" value={valorLote.modulo} onChange={(e) => setValorLote({ ...valorLote, modulo: e.target.value })} />
                    <button type="button" className="ghost-button small" disabled={!valorLote.modulo} onClick={() => executarLote('modulo', { modulo: valorLote.modulo })}>
                      Definir módulo
                    </button>
                  </div>
                  <div className="docente-lote-campo">
                    <input placeholder="Tópico da aula" value={valorLote.titulo} onChange={(e) => setValorLote({ ...valorLote, titulo: e.target.value })} />
                    <button type="button" className="ghost-button small" disabled={!valorLote.titulo} onClick={() => executarLote('titulo', { titulo: valorLote.titulo })}>
                      Definir tópico
                    </button>
                  </div>
                  <button type="button" className="ghost-button small" onClick={() => executarLote('cancelar')}>Cancelar aulas</button>
                  <button type="button" className="ghost-button small" onClick={() => executarLote('reativar')}>Reativar</button>
                  <button
                    type="button"
                    className="danger-button small"
                    onClick={() => executarLote('remover', {}, `Remover ${selecionadas.size} aula(s)? As que têm presença registrada não serão removidas.`)}
                  >
                    Remover
                  </button>
                  <button type="button" className="ghost-button small" onClick={() => setSelecionadas(new Set())}>Limpar seleção</button>
                </div>
              </div>
            )}
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    {podeEditar && !ehGrupo && (
                      <th>
                        <input type="checkbox" aria-label="Selecionar todas" checked={tudoSelecionado} onChange={alternarTodas} />
                      </th>
                    )}
                    <th>Data</th><th>Horário</th><th>Módulo</th><th>Tópico</th><th>Professor</th><th>Situação</th><th>Presença</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {aulas.map((a) => (
                    <tr key={a.sessionId} className={a.situacao === 'cancelada' ? 'docente-linha-cancelada' : ''}>
                      {podeEditar && !ehGrupo && (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar aula de ${formatarData(a.date)}`}
                            checked={selecionadas.has(a.sessionId)}
                            onChange={() => alternarSelecao(a.sessionId)}
                          />
                        </td>
                      )}
                      <td className="nowrap">{formatarData(a.date)}</td>
                      <td className="nowrap">{a.horario || '—'}</td>
                      <td>{a.modulo || '—'}</td>
                      <td className="cell-name">
                        <strong>{a.titulo || 'Aula'}</strong>
                        {a.tipo === 'extra' && <small className="docente-origem"> · extra</small>}
                      </td>
                      <td>{a.professor || '—'}</td>
                      <td className="nowrap">
                        <span className={`cron-status is-${a.situacao}`}>
                          {a.situacao === 'cancelada' ? 'Cancelada' : a.situacao === 'realizada' ? 'Realizada' : 'Prevista'}
                        </span>
                      </td>
                      <td className="nowrap">
                        {a.marcadas ? `${a.presentes + a.justificadas}/${a.matriculados}${percentual(a) !== null ? ` (${percentual(a)}%)` : ''}` : '—'}
                      </td>
                      <td className="docente-acoes-celula">
                        <div className="docente-acoes-linha">
                          {podeChamada && <button type="button" className="ghost-button small" onClick={() => abrirChamada(a)}>Chamada</button>}
                          {podeEditar && (
                            <>
                              {!ehGrupo && <button type="button" className="ghost-button small" onClick={() => setFormulario({ modo: 'editar', aula: a })}>Editar</button>}
                              <button type="button" className="ghost-button small" onClick={() => alternarCancelamento(a)}>
                                {a.situacao === 'cancelada' ? 'Reativar' : 'Cancelar'}
                              </button>
                              <button
                                type="button"
                                className="danger-button small"
                                disabled={a.marcadas > 0}
                                title={a.marcadas > 0 ? 'Esta aula tem presença registrada. Cancele em vez de remover.' : 'Remover aula'}
                                onClick={() => remover(a)}
                              >
                                Remover
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {aulas.length === 0 && <tr><td colSpan={podeEditar && !ehGrupo ? 9 : 8} className="users-empty">Nenhuma aula nesta turma ou grupo.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="muted cron-nota">
              Cancelar mantém a aula e os registros, mas tira a aula do cálculo. Remover só é possível sem presença registrada.
            </p>
          </section>
        )}

        {chamada && (
          <ChamadaAula aula={chamada} onClose={() => setChamada(null)} onChange={carregarAulas} />
        )}
      </div>
    </div>
  );
}
