import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { exportTable } from '../utils/sheetExport';
import '../styles/relatorios.css';

// Relatórios da gestão (somente administração), no padrão da aba Relatórios do site:
// marcos do período e lista de alunos com busca, filtros e exportação em planilha ou CSV.
const MODALIDADES = ['Online', 'Presencial'];
const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const SITUACOES = [
  { value: 'todos', label: 'Todas' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'concluido', label: 'Concluídos' },
  { value: 'desistente', label: 'Desistentes' },
  { value: 'removido', label: 'Removidos' }
];
const SITUACAO_TEXT = { ativo: 'Ativo', concluido: 'Concluído', desistente: 'Desistente', removido: 'Removido' };

const ALUNO_COLUMNS = [
  { label: 'aluno', key: 'nome' },
  { label: 'email', key: 'email' },
  { label: 'cpf', key: 'cpfMasked' },
  { label: 'curso', key: 'curso' },
  { label: 'modalidade', key: 'modalidade' },
  { label: 'turno', key: 'turno' },
  { label: 'turma_atual', key: 'turma' },
  { label: 'situacao', key: 'situacao' },
  { label: 'data_matricula', key: 'dataMatricula' }
];

const MARCOS_COLUMNS = [
  { label: 'de', key: 'de' },
  { label: 'ate', key: 'ate' },
  { label: 'matriculados', key: 'matriculados' },
  { label: 'presencas', key: 'presencas' },
  { label: 'aulas', key: 'aulas' },
  { label: 'desistentes', key: 'desistentes' }
];

const EMPTY_FILTERS = { q: '', curso: '', modalidade: '', turno: '', situacao: 'todos' };

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export default function RelatoriosGestaoPage() {
  const [courses, setCourses] = useState([]);
  const [periodo, setPeriodo] = useState({ de: startOfYear(), ate: today() });
  const [marcos, setMarcos] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [aplicados, setAplicados] = useState(EMPTY_FILTERS);
  const [lista, setLista] = useState({ resumo: null, alunos: [] });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregarMarcos = async (p = periodo) => {
    try {
      const { data } = await api.get('/reports/operacao/marcos', { params: p });
      setMarcos(data);
    } catch (error) {
      setMarcos(null);
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const carregarLista = async (f = aplicados) => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/operacao/alunos', { params: f });
      setLista(data);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses || [])).catch(() => {});
    carregarMarcos();
    carregarLista(EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicar = (event) => {
    event.preventDefault();
    setAplicados(filters);
    carregarLista(filters);
  };

  const limpar = () => {
    setFilters(EMPTY_FILTERS);
    setAplicados(EMPTY_FILTERS);
    carregarLista(EMPTY_FILTERS);
  };

  const exportarMarcos = (format) => {
    if (!marcos) return;
    exportTable([{ ...marcos.periodo, ...marcos }], MARCOS_COLUMNS, format, 'marcos-periodo');
  };

  const exportarLista = (format) => {
    exportTable(lista.alunos, ALUNO_COLUMNS, format, 'lista-alunos');
  };

  const resumo = lista.resumo;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content rel">
        <section className="rel-head">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Relatórios</h1>
            <p>Dados do Geração Tech para conferência, IEL e Adece. Cada bloco traz seus próprios filtros e exportações.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        {/* Bloco 1: marcos do período */}
        <section className="rel-bloco">
          <header className="rel-bloco-head">
            <div>
              <h2>1. Marcos do período</h2>
              <p>Totais de matrículas, presenças e aulas entre as duas datas. Desistentes mostram a situação atual.</p>
            </div>
          </header>

          <div className="rel-periodo">
            <label>
              <span>De</span>
              <input type="date" value={periodo.de} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
            </label>
            <label>
              <span>Até</span>
              <input type="date" value={periodo.ate} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} />
            </label>
            <button type="button" className="ghost-button small" onClick={() => carregarMarcos(periodo)}>Atualizar período</button>
          </div>

          {marcos ? (
            <>
              <div className="rel-numeros">
                <div><strong>{marcos.matriculados}</strong><span>Matriculados no período</span></div>
                <div><strong>{marcos.presencas}</strong><span>Presenças no período</span></div>
                <div><strong>{marcos.aulas}</strong><span>Aulas no período</span></div>
                <div><strong>{marcos.desistentes}</strong><span>Desistentes (situação atual)</span></div>
              </div>
              <div className="rel-acoes">
                <span className="muted">Exporta os 4 números acima para o período escolhido.</span>
                <button type="button" className="primary-button small" onClick={() => exportarMarcos('xlsx')}>Exportar planilha</button>
                <button type="button" className="ghost-button small" onClick={() => exportarMarcos('csv')}>CSV</button>
              </div>
            </>
          ) : (
            <p className="users-empty">Não foi possível carregar os marcos deste período.</p>
          )}
        </section>

        {/* Bloco 2: lista de alunos */}
        <section className="rel-bloco">
          <header className="rel-bloco-head">
            <div>
              <h2>2. Lista de alunos</h2>
              <p>Uma linha por matrícula. Use os filtros para montar o recorte e exporte o resultado.</p>
            </div>
          </header>

          {resumo && (
            <div className="rel-numeros">
              <div><strong>{resumo.total}</strong><span>Total</span></div>
              <div><strong>{resumo.ativo}</strong><span>Ativos</span></div>
              <div><strong>{resumo.concluido}</strong><span>Concluídos</span></div>
              <div><strong>{resumo.desistente}</strong><span>Desistentes</span></div>
            </div>
          )}

          <form className="rel-filtros" onSubmit={aplicar}>
            <p className="rel-filtros-titulo">Filtrar por</p>
            <div className="rel-filtros-grid">
              <label className="rel-campo rel-campo-busca">
                <span>Busca</span>
                <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Nome, e-mail ou CPF" />
              </label>
              <label className="rel-campo">
                <span>Curso</span>
                <select value={filters.curso} onChange={(e) => setFilters({ ...filters, curso: e.target.value })}>
                  <option value="">Todos</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label className="rel-campo">
                <span>Modalidade</span>
                <select value={filters.modalidade} onChange={(e) => setFilters({ ...filters, modalidade: e.target.value })}>
                  <option value="">Todas</option>
                  {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="rel-campo">
                <span>Turno</span>
                <select value={filters.turno} onChange={(e) => setFilters({ ...filters, turno: e.target.value })}>
                  <option value="">Todos</option>
                  {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="rel-campo">
                <span>Situação</span>
                <select value={filters.situacao} onChange={(e) => setFilters({ ...filters, situacao: e.target.value })}>
                  {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
            <div className="rel-acoes">
              <button type="button" className="ghost-button small" onClick={limpar}>Limpar filtros</button>
              <button type="submit" className="primary-button small">Aplicar filtros</button>
            </div>
          </form>

          <div className="rel-resultado">
            <span><strong>{lista.alunos.length}</strong> aluno(s) no recorte</span>
            <div className="rel-acoes-inline">
              <button type="button" className="primary-button small" onClick={() => exportarLista('xlsx')} disabled={!lista.alunos.length}>Exportar planilha</button>
              <button type="button" className="ghost-button small" onClick={() => exportarLista('csv')} disabled={!lista.alunos.length}>CSV</button>
            </div>
          </div>

          {loading ? (
            <div className="page-state">Carregando alunos...</div>
          ) : lista.alunos.length === 0 ? (
            <p className="users-empty">Nenhum aluno encontrado com esses filtros.</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Curso</th>
                    <th>Modalidade</th>
                    <th>Turno</th>
                    <th>Turma atual</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.alunos.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-name"><strong>{a.nome}</strong><div className="muted">{a.email}</div></td>
                      <td>{a.curso}</td>
                      <td className="nowrap">{a.modalidade}</td>
                      <td className="nowrap">{a.turno}</td>
                      <td>{a.turma || '—'}</td>
                      <td className="nowrap">{SITUACAO_TEXT[a.situacao] || a.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
