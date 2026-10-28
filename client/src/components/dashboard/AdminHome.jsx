import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Icon from '../Icon';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ColumnChart, BarList, DonutChart } from '../charts/Charts';
import { Feedback, errorText } from '../manage/shared';
import '../../styles/home-admin.css';

// Painel do administrador: o que precisa de atenção, números por tema, gráficos e atalhos por área.
// Os dados vêm de /api/dashboard/gestao (mesma fonte da visão geral de gestão).

const SITUACAO_LABEL = { ativo: 'Ativos', concluido: 'Concluídos', desistente: 'Desistentes', removido: 'Removidos' };
const JUSTIFICATIVA_LABEL = { pendente: 'Em análise', aceita: 'Aceitas', abonada: 'Abonadas', recusada: 'Recusadas' };

const GRUPOS_ATALHOS = [
  {
    titulo: 'Acadêmico',
    itens: [
      { to: '/gestao/presenca', icon: 'calendar', titulo: 'Cronograma e presença', texto: 'Aulas em massa e chamada' },
      { to: '/gestao/justificativas', icon: 'note', titulo: 'Justificativas', texto: 'Análise das faltas' },
      { to: '/gestao/relatorios', icon: 'grid', titulo: 'Relatórios', texto: 'Números e exportações' }
    ]
  },
  {
    titulo: 'Pessoas',
    itens: [
      { to: '/gestao/usuarios', icon: 'users', titulo: 'Usuários', texto: 'Contas e papéis' },
      { to: '/gestao/acessos', icon: 'settings', titulo: 'Acessos', texto: 'Quem entrou e quando' },
      { to: '/gestao/atendimento', icon: 'chat', titulo: 'Atendimento', texto: 'Conversas com os alunos' }
    ]
  },
  {
    titulo: 'Conteúdo',
    itens: [
      { to: '/cursos', icon: 'book', titulo: 'Cursos', texto: 'Criar e importar cursos' },
      { to: '/gestao/ponto', icon: 'clock', titulo: 'Ponto dos professores', texto: 'Acompanhar e exportar' }
    ]
  }
];

function saudacao(agora) {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora));
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataExtensa(data) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(data);
}

function Indicador({ valor, rotulo, dica, to }) {
  const corpo = (
    <>
      <strong className="num">{valor}</strong>
      <span>{rotulo}</span>
      <small>{dica}</small>
    </>
  );
  return to ? (
    <Link to={to} className="admin-kpi">{corpo}</Link>
  ) : (
    <article className="admin-kpi">{corpo}</article>
  );
}

export default function AdminHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [agora] = useState(() => new Date());
  const primeiroNome = (user?.name || '').split(' ')[0];

  useEffect(() => {
    api
      .get('/dashboard/gestao')
      .then(({ data: body }) => setData(body))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }, []);

  const k = data?.kpis;
  const g = data?.graficos || {};

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content home-page admin-home">
        <header className="admin-saudacao">
          <span className="admin-etiqueta">{dataExtensa(agora)} · Visão geral</span>
          <h1>{saudacao(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
        </header>

        <Feedback feedback={feedback} />

        {!k && !feedback && <div className="page-state">Carregando a visão geral...</div>}

        {k && (
          <>
            <section className="admin-bloco admin-atencao" aria-labelledby="admin-atencao-titulo">
              <div className="admin-bloco-cabecalho">
                <h2 id="admin-atencao-titulo">Precisa de atenção</h2>
                <span className="admin-muted">Itens que pedem decisão</span>
              </div>
              <div className="admin-atencao-itens">
                <Link to="/gestao/justificativas" className={`admin-alerta ${k.justificativas_pendentes > 0 ? 'is-pendente' : 'is-ok'}`}>
                  <strong className="num">{k.justificativas_pendentes}</strong>
                  <span className="admin-alerta-texto">
                    <b>Justificativas de falta</b>
                    <small>{k.justificativas_pendentes > 0 ? 'Aguardando análise' : 'Nada aguardando análise'}</small>
                  </span>
                </Link>
                <Link to="/gestao/atendimento" className={`admin-alerta ${k.chamados_abertos > 0 ? 'is-pendente' : 'is-ok'}`}>
                  <strong className="num">{k.chamados_abertos}</strong>
                  <span className="admin-alerta-texto">
                    <b>Atendimentos abertos</b>
                    <small>{k.chamados_abertos > 0 ? 'Alunos aguardando a equipe' : 'Nenhum aluno aguardando'}</small>
                  </span>
                </Link>
              </div>
            </section>

            <section className="admin-numeros" aria-labelledby="admin-numeros-titulo">
              <h2 id="admin-numeros-titulo">Números</h2>
              <p className="admin-grupo-titulo">Pessoas</p>
              <div className="admin-kpis">
                <Indicador valor={k.alunos_ativos} rotulo="Alunos ativos" dica={`${k.matriculados} matriculados no total`} />
                <Indicador valor={k.concluidos} rotulo="Concluídos" dica={`${k.certificados} certificados emitidos`} />
                <Indicador valor={k.desistentes} rotulo="Desistentes" dica="Situação atual" />
                <Indicador valor={k.turmas_ativas} rotulo="Turmas ativas" dica="Sincronizadas do site do GT" />
              </div>
              <p className="admin-grupo-titulo">Operação</p>
              <div className="admin-kpis">
                <Indicador valor={k.presencaUltimos30Dias !== null ? `${k.presencaUltimos30Dias}%` : '—'} rotulo="Presença (30 dias)" dica="Presentes e justificadas" />
                <Indicador valor={k.justificativas_pendentes} rotulo="Justificativas" dica="Aguardando decisão" to="/gestao/justificativas" />
                <Indicador valor={k.chamados_abertos} rotulo="Atendimentos" dica="Alunos aguardando a equipe" to="/gestao/atendimento" />
              </div>
            </section>

            <section className="admin-graficos" aria-label="Gráficos">
              <article className="admin-bloco">
                <div className="admin-bloco-cabecalho">
                  <h2>Matrículas por mês</h2>
                  <span className="admin-muted">Últimos 12 meses</span>
                </div>
                <ColumnChart data={g.matriculasPorMes} ariaLabel="Matrículas por mês" />
              </article>

              <article className="admin-bloco">
                <div className="admin-bloco-cabecalho">
                  <h2>Situação dos alunos</h2>
                  <span className="admin-muted">Atual</span>
                </div>
                <DonutChart data={g.situacao} labels={SITUACAO_LABEL} ariaLabel="Situação dos alunos" />
              </article>

              <article className="admin-bloco">
                <div className="admin-bloco-cabecalho">
                  <h2>Alunos ativos por curso</h2>
                  <span className="admin-muted">Os cursos com mais alunos</span>
                </div>
                <BarList data={g.porCurso} />
              </article>

              <article className="admin-bloco">
                <div className="admin-bloco-cabecalho">
                  <h2>Presença nas últimas aulas</h2>
                  <span className="admin-muted">Presentes e justificadas</span>
                </div>
                <ColumnChart data={g.presencaAulas} max={100} suffix="%" ariaLabel="Presença nas últimas aulas" />
              </article>

              <article className="admin-bloco admin-bloco-largo">
                <div className="admin-bloco-cabecalho">
                  <h2>Justificativas de falta</h2>
                  <span className="admin-muted">Situação das justificativas enviadas</span>
                </div>
                <DonutChart data={g.justificativas} labels={JUSTIFICATIVA_LABEL} ariaLabel="Justificativas de falta" />
              </article>
            </section>

            <section className="admin-bloco" aria-labelledby="admin-atalhos-titulo">
              <div className="admin-bloco-cabecalho">
                <h2 id="admin-atalhos-titulo"><Icon name="grid" size={18} /> Atalhos</h2>
              </div>
              <div className="admin-atalhos-grupos">
                {GRUPOS_ATALHOS.map((grupo) => (
                  <div key={grupo.titulo} className="admin-atalho-grupo">
                    <h3>{grupo.titulo}</h3>
                    {grupo.itens.map((item) => (
                      <Link key={item.to} to={item.to} className="admin-atalho">
                        <span className="admin-atalho-icone"><Icon name={item.icon} size={18} /></span>
                        <span className="admin-atalho-texto">
                          <strong>{item.titulo}</strong>
                          <small>{item.texto}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
