import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Icon from '../components/Icon';
import GestaoDashboard from '../components/dashboard/GestaoDashboard';
import TurmaCard from '../components/portal/TurmaCard';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';
import '../styles/home.css';
import '../styles/home-aluno.css';

// Página inicial: boas-vindas, próximas aulas com o link ao vivo, lembretes, acesso rápido,
// dicas e instruções de uso. Cada papel vê os atalhos e as dicas do seu trabalho.

const ACESSO_ALUNO = [
  { to: '/cursos', icon: 'book', titulo: 'Cursos', texto: 'Trilhas, módulos e seu progresso' },
  { to: '/cronogramas', icon: 'calendar', titulo: 'Cronograma', texto: 'Datas e tópicos das aulas' },
  { to: '/presenca', icon: 'users', titulo: 'Minha presença', texto: 'Chamada e justificativas' },
  { to: '/atendimento', icon: 'chat', titulo: 'Atendimento', texto: 'Fale com a equipe' },
  { to: '/documentos', icon: 'award', titulo: 'Documentos', texto: 'Termo, aditivos e certificados' },
  { to: '/mural', icon: 'bell', titulo: 'Mural da turma', texto: 'Avisos e dúvidas da turma' },
  { to: '/anotacoes', icon: 'note', titulo: 'Anotações', texto: 'Guarde o que aprendeu' },
  { to: '/editor', icon: 'code', titulo: 'Editor', texto: 'Teste seu código' },
  { to: '/perfil', icon: 'user', titulo: 'Meu perfil', texto: 'Dados e avatar' }
];

const ACESSO_PROFESSOR = [
  { to: '/gestao/presenca', icon: 'calendar', titulo: 'Turmas e presença', texto: 'Cronograma e chamada' },
  { to: '/ponto', icon: 'clock', titulo: 'Meu ponto', texto: 'Entrada e saída nas aulas' },
  { to: '/cursos', icon: 'book', titulo: 'Meus cursos', texto: 'Edite o conteúdo que você leciona' },
  { to: '/minha-area', icon: 'user', titulo: 'Meu perfil', texto: 'Turmas, aulas e arquivos' }
];

const ACESSO_ADMIN = [
  { to: '/gestao/presenca', icon: 'calendar', titulo: 'Cronograma e presença', texto: 'Aulas em massa e chamada' },
  { to: '/gestao/ponto', icon: 'clock', titulo: 'Ponto dos professores', texto: 'Acompanhar e exportar' },
  { to: '/gestao/atendimento', icon: 'chat', titulo: 'Atendimento', texto: 'Conversas com os alunos' },
  { to: '/gestao/justificativas', icon: 'note', titulo: 'Justificativas', texto: 'Análise das faltas' },
  { to: '/gestao/relatorios', icon: 'grid', titulo: 'Relatórios', texto: 'Números e exportações' },
  { to: '/gestao/usuarios', icon: 'users', titulo: 'Usuários', texto: 'Contas e papéis' },
  { to: '/gestao/acessos', icon: 'settings', titulo: 'Acessos', texto: 'Quem entrou e quando' },
  { to: '/cursos', icon: 'book', titulo: 'Cursos', texto: 'Criar e importar cursos' }
];

const DICAS_ALUNO = [
  { titulo: 'Estude em blocos', texto: 'Trinta a cinquenta minutos de foco, com uma pausa curta, rendem mais do que uma tarde inteira de estudo cansado.' },
  { titulo: 'Entre na aula ao vivo', texto: 'Use o link da sua turma na página inicial. Sem o link, peça à equipe pelo Atendimento.' },
  { titulo: 'Escreva o que aprendeu', texto: 'Anote os conceitos com suas palavras em Anotações. Explicar com as próprias palavras fixa o conteúdo.' },
  { titulo: 'Pratique no Editor', texto: 'Antes de entregar um projeto, rode o código no Editor e teste os casos simples primeiro.' },
  { titulo: 'Refaça o quiz', texto: 'Errou? Volte ao módulo, releia o trecho e tente de novo. O erro é parte do aprendizado.' },
  { titulo: 'Peça ajuda cedo', texto: 'Travou por mais de uma hora? Chame a equipe no Atendimento. Perguntar cedo economiza tempo.' }
];

const DICAS_PROFESSOR = [
  { titulo: 'Confira o cronograma', texto: 'No início de cada semana, veja as aulas da sua turma em Turmas e presença e ajuste o tópico se precisar.' },
  { titulo: 'Faça a chamada no dia', texto: 'A chamada fica disponível na própria aula. Marcar no dia evita ajustes depois.' },
  { titulo: 'Bata o ponto dentro da janela', texto: 'A entrada libera 30 minutos antes da aula e fecha no horário de término. A saída você registra ao final.' },
  { titulo: 'Mantenha o conteúdo atual', texto: 'Os cursos que você leciona podem ser editados em Meus cursos. Revise os módulos antes de cada turma.' }
];

const PASSOS_ALUNO = [
  { titulo: 'Abra seu curso', texto: 'Em Cursos, escolha a trilha e siga pelos módulos na ordem.' },
  { titulo: 'Marque sua presença', texto: 'No dia da aula, marque sua presença em Minha presença.' },
  { titulo: 'Acompanhe as datas', texto: 'Em Cronograma você vê as próximas aulas e os tópicos.' },
  { titulo: 'Peça ajuda', texto: 'Dúvidas e pedidos vão para o Atendimento. A equipe responde por lá.' }
];

const PASSOS_PROFESSOR = [
  { titulo: 'Faça a chamada', texto: 'Em Turmas e presença, abra a aula do dia e marque presente, falta ou justificada.' },
  { titulo: 'Registre o ponto', texto: 'Em Meu ponto, bata entrada na janela da aula e a saída no fim.' },
  { titulo: 'Edite seus cursos', texto: 'Em Meus cursos, atualize o conteúdo das trilhas que você leciona.' }
];

const SAUDACAO = (agora) => {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora));
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

function dataCurta(iso) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}`;
}

function dataExtensa(data) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(data);
}

export default function DashboardPage() {
  const { user, isTeacher, isAdmin, isAtendente, isGestao, isEditor } = useAuth();
  if (isAtendente) return <Navigate to="/gestao/atendimento" replace />;
  if (isEditor) return <Navigate to="/cursos" replace />;
  if (isGestao) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-content">
          <section className="home-numeros" aria-label="Números do Geração Tech">
            <h2 className="home-numeros-titulo">Números do Geração Tech</h2>
            <GestaoDashboard />
          </section>
        </div>
      </div>
    );
  }

  const papel = isAdmin ? 'admin' : isTeacher ? 'professor' : 'aluno';
  const acessos = papel === 'admin' ? ACESSO_ADMIN : papel === 'professor' ? ACESSO_PROFESSOR : ACESSO_ALUNO;
  const dicas = papel === 'professor' ? DICAS_PROFESSOR : DICAS_ALUNO;
  const passos = papel === 'professor' ? PASSOS_PROFESSOR : PASSOS_ALUNO;
  const primeiroNome = (user?.name || '').split(' ')[0];

  const [home, setHome] = useState(null);
  const [lembretes, setLembretes] = useState(null);
  const [novoLembrete, setNovoLembrete] = useState('');
  const [erro, setErro] = useState('');
  const [indicadores, setIndicadores] = useState(null);
  const [agora] = useState(() => new Date());

  useEffect(() => {
    api
      .get('/me/home')
      .then(({ data }) => setHome(data))
      .catch(() => setHome({ proximasAulas: [] }));
    if (papel === 'aluno') {
      Promise.all([api.get('/users/dashboard'), api.get('/courses'), api.get('/presenca/aluno/historico')])
        .then(([dash, cursos, hist]) => {
          const progresso = Object.values(dash.data.progress || {});
          setIndicadores({
            cursos: (cursos.data.courses || []).length,
            emAndamento: progresso.filter((item) => (item.completedLessons || []).length > 0).length,
            presenca: hist.data.resumo?.percentual ?? null,
            certificados: dash.data.certificates?.length || 0
          });
        })
        .catch(() => setIndicadores({ cursos: 0, emAndamento: 0, presenca: null, certificados: 0 }));
    }
    if (papel !== 'admin') {
      api
        .get('/me/reminders')
        .then(({ data }) => setLembretes(data.reminders || []))
        .catch(() => setLembretes([]));
    }
  }, [papel]);

  const aulas = home?.proximasAulas || [];
  const proxima = aulas[0];
  const lembretesAbertos = useMemo(() => (lembretes || []).filter((r) => !r.done), [lembretes]);

  async function alternarLembrete(lembrete) {
    try {
      const { data } = await api.patch(`/me/reminders/${lembrete.id}`, { done: !lembrete.done });
      setLembretes((atual) => atual.map((r) => (r.id === lembrete.id ? data.reminder : r)));
    } catch {
      setErro('Não foi possível atualizar o lembrete.');
    }
  }

  async function criarLembrete(event) {
    event.preventDefault();
    const titulo = novoLembrete.trim();
    if (titulo.length < 2) return;
    try {
      const { data } = await api.post('/me/reminders', { title: titulo });
      setLembretes((atual) => [data.reminder, ...(atual || [])]);
      setNovoLembrete('');
      setErro('');
    } catch (error) {
      setErro(error.response?.data?.message || 'Não foi possível criar o lembrete.');
    }
  }

  if (papel === 'aluno') {
    const aulasVisiveis = aulas.slice(0, 4);
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-content home-page aluno-home">
          <header className="aluno-saudacao">
            <span className="aluno-etiqueta">{dataExtensa(agora)}</span>
            <h1>{SAUDACAO(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
          </header>

          <section className="aluno-proxima" aria-labelledby="aluno-proxima-titulo">
            <div className="aluno-proxima-texto">
              <span className="aluno-etiqueta is-destaque">Próxima aula</span>
              <h2 id="aluno-proxima-titulo">{proxima ? proxima.titulo || 'Aula' : 'Nenhuma aula agendada'}</h2>
              {proxima && (
                <p className="aluno-muted">
                  {proxima.curso} · {proxima.turma} · {dataCurta(proxima.date)}{proxima.horario ? ` · ${proxima.horario}` : ''}
                </p>
              )}
            </div>
            <div className="aluno-acoes">
              {proxima?.linkAoVivo ? (
                <a className="aluno-botao" href={proxima.linkAoVivo} target="_blank" rel="noopener noreferrer">
                  <Icon name="video" size={18} /> Entrar na aula ao vivo
                </a>
              ) : (
                proxima && <span className="home-sem-link">Link da aula ao vivo ainda não cadastrado.</span>
              )}
              <Link className="aluno-botao is-ghost" to="/cursos">Ver cursos</Link>
            </div>
          </section>

          {indicadores && (
            <section className="aluno-indicadores" aria-label="Seu resumo">
              <Link to="/cursos"><strong>{indicadores.cursos}</strong><span>cursos</span></Link>
              <Link to="/cursos"><strong>{indicadores.emAndamento}</strong><span>em andamento</span></Link>
              <Link to="/presenca"><strong>{indicadores.presenca !== null ? `${indicadores.presenca}%` : '—'}</strong><span>presença</span></Link>
              <Link to="/documentos"><strong>{indicadores.certificados}</strong><span>certificados</span></Link>
            </section>
          )}

          <div className="aluno-colunas">
            <section className="aluno-card" aria-labelledby="aluno-aulas-titulo">
              <header className="aluno-card-cabecalho">
                <h2 id="aluno-aulas-titulo"><Icon name="calendar" size={18} /> Próximas aulas</h2>
                <Link to="/cronogramas" className="aluno-link">Ver cronograma</Link>
              </header>
              {!home && <p className="aluno-vazio">Carregando…</p>}
              {home && aulas.length === 0 && <p className="aluno-vazio">Nenhuma aula agendada nas suas turmas.</p>}
              <ul className="aluno-lista">
                {aulasVisiveis.map((aula) => (
                  <li key={aula.sessionId}>
                    <div className="aluno-data">
                      <strong>{dataCurta(aula.date)}</strong>
                      <span>{aula.horario || 'dia todo'}</span>
                    </div>
                    <div className="aluno-item-texto">
                      <strong>{aula.titulo || 'Aula'}</strong>
                      <span>{aula.curso} · {aula.turma}</span>
                    </div>
                    {aula.linkAoVivo && (
                      <a className="home-link-pequeno" href={aula.linkAoVivo} target="_blank" rel="noopener noreferrer">Ao vivo</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="aluno-card" aria-labelledby="aluno-lembretes-titulo">
              <header className="aluno-card-cabecalho">
                <h2 id="aluno-lembretes-titulo"><Icon name="bell" size={18} /> Lembretes</h2>
                <span className="home-contador">{lembretesAbertos.length} aberto(s)</span>
              </header>
              <form className="home-form-lembrete" onSubmit={criarLembrete}>
                <input
                  value={novoLembrete}
                  onChange={(e) => setNovoLembrete(e.target.value)}
                  placeholder="Ex.: enviar projeto do módulo 3"
                  maxLength={200}
                  aria-label="Novo lembrete"
                />
                <button type="submit" className="home-botao-pequeno" disabled={novoLembrete.trim().length < 2}>
                  <Icon name="plus" size={16} /> Adicionar
                </button>
              </form>
              {erro && <p className="home-erro" role="alert">{erro}</p>}
              {!lembretes && <p className="aluno-vazio">Carregando…</p>}
              {lembretes && lembretes.length === 0 && <p className="aluno-vazio">Nenhum lembrete. Anote o que não pode esquecer.</p>}
              <ul className="home-lembretes">
                {(lembretes || []).slice(0, 8).map((lembrete) => (
                  <li key={lembrete.id} className={lembrete.done ? 'is-feito' : ''}>
                    <label>
                      <input type="checkbox" checked={Boolean(lembrete.done)} onChange={() => alternarLembrete(lembrete)} />
                      <span>{lembrete.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="aluno-card" aria-labelledby="aluno-acessos-titulo">
            <header className="aluno-card-cabecalho">
              <h2 id="aluno-acessos-titulo"><Icon name="star" size={18} /> Acesso rápido</h2>
            </header>
            <div className="aluno-atalhos">
              {acessos.map((item) => (
                <Link key={item.to + item.titulo} to={item.to} className="aluno-atalho">
                  <span className="aluno-atalho-icone"><Icon name={item.icon} size={18} /></span>
                  <strong>{item.titulo}</strong>
                  <span>{item.texto}</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="aluno-colunas">
            <section className="aluno-card" aria-labelledby="aluno-dicas-titulo">
              <header className="aluno-card-cabecalho">
                <h2 id="aluno-dicas-titulo"><Icon name="bulb" size={18} /> Dicas de estudo</h2>
              </header>
              <ul className="aluno-texto-lista">
                {dicas.map((dica) => (
                  <li key={dica.titulo}>
                    <strong>{dica.titulo}</strong>
                    <span>{dica.texto}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="aluno-card" aria-labelledby="aluno-uso-titulo">
              <header className="aluno-card-cabecalho">
                <h2 id="aluno-uso-titulo"><Icon name="arrow" size={18} /> Como usar o Atlas</h2>
              </header>
              <ol className="aluno-texto-lista">
                {passos.map((passo) => (
                  <li key={passo.titulo}>
                    <strong>{passo.titulo}</strong>
                    <span>{passo.texto}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <TurmaCard />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content home-page">
        <section className="home-hero" aria-label="Boas-vindas">
          <div className="home-hero-texto">
            <span className="home-etiqueta">{SAUDACAO(agora)}</span>
            <h1>{primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}</h1>
            <p>
              {papel === 'admin' && 'Acompanhe a turma, o cronograma e a equipe. Os atalhos estão logo abaixo.'}
              {papel === 'professor' && 'Suas turmas, sua chamada e seu ponto, tudo num lugar só.'}
              {papel === 'aluno' && 'Bora estudar? Veja a próxima aula, seus lembretes e os atalhos.'}
            </p>
          </div>
          {proxima && papel !== 'admin' && (
            <div className="home-hero-aula">
              <span className="home-etiqueta is-destaque">Próxima aula</span>
              <strong>{proxima.titulo || 'Aula'}</strong>
              <span>{proxima.turma} · {dataCurta(proxima.date)}{proxima.horario ? ` · ${proxima.horario}` : ''}</span>
              {proxima.linkAoVivo ? (
                <a className="home-botao-ao-vivo" href={proxima.linkAoVivo} target="_blank" rel="noopener noreferrer">
                  <Icon name="video" size={18} /> Entrar na aula ao vivo
                </a>
              ) : (
                <span className="home-sem-link">Link da aula ao vivo ainda não cadastrado.</span>
              )}
            </div>
          )}
        </section>

        {papel === 'aluno' && <TurmaCard />}

        {papel === 'aluno' && indicadores && (
          <section className="home-indicadores" aria-label="Seu resumo">
            <Link to="/cursos"><strong>{indicadores.cursos}</strong><span>cursos</span></Link>
            <Link to="/cursos"><strong>{indicadores.emAndamento}</strong><span>em andamento</span></Link>
            <Link to="/presenca"><strong>{indicadores.presenca !== null ? `${indicadores.presenca}%` : '—'}</strong><span>presença</span></Link>
            <Link to="/documentos"><strong>{indicadores.certificados}</strong><span>certificados</span></Link>
          </section>
        )}

        <div className="home-grid">
          {papel !== 'admin' && (
            <section className="home-card home-card-aulas" aria-labelledby="home-aulas-titulo">
              <header className="home-card-cabecalho">
                <h2 id="home-aulas-titulo"><Icon name="calendar" size={18} /> Próximas aulas</h2>
                <Link to={papel === 'professor' ? '/gestao/presenca' : '/cronogramas'} className="home-link">Ver cronograma</Link>
              </header>
              {!home && <p className="home-vazio">Carregando…</p>}
              {home && aulas.length === 0 && <p className="home-vazio">Nenhuma aula agendada nas suas turmas.</p>}
              <ul className="home-aulas">
                {aulas.map((aula) => (
                  <li key={aula.sessionId}>
                    <div className="home-aula-data">
                      <strong>{dataCurta(aula.date)}</strong>
                      <span>{aula.horario || 'dia todo'}</span>
                    </div>
                    <div className="home-aula-texto">
                      <strong>{aula.titulo || 'Aula'}</strong>
                      <span>{aula.curso} · {aula.turma}</span>
                    </div>
                    {aula.linkAoVivo && (
                      <a className="home-link-pequeno" href={aula.linkAoVivo} target="_blank" rel="noopener noreferrer">Ao vivo</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {papel !== 'admin' && (
            <section className="home-card home-card-lembretes" aria-labelledby="home-lembretes-titulo">
              <header className="home-card-cabecalho">
                <h2 id="home-lembretes-titulo"><Icon name="bell" size={18} /> Lembretes</h2>
                <span className="home-contador">{lembretesAbertos.length} aberto(s)</span>
              </header>
              <form className="home-form-lembrete" onSubmit={criarLembrete}>
                <input
                  value={novoLembrete}
                  onChange={(e) => setNovoLembrete(e.target.value)}
                  placeholder="Ex.: enviar projeto do módulo 3"
                  maxLength={200}
                  aria-label="Novo lembrete"
                />
                <button type="submit" className="home-botao-pequeno" disabled={novoLembrete.trim().length < 2}>
                  <Icon name="plus" size={16} /> Adicionar
                </button>
              </form>
              {erro && <p className="home-erro" role="alert">{erro}</p>}
              {!lembretes && <p className="home-vazio">Carregando…</p>}
              {lembretes && lembretes.length === 0 && <p className="home-vazio">Nenhum lembrete. Anote o que não pode esquecer.</p>}
              <ul className="home-lembretes">
                {(lembretes || []).slice(0, 8).map((lembrete) => (
                  <li key={lembrete.id} className={lembrete.done ? 'is-feito' : ''}>
                    <label>
                      <input type="checkbox" checked={Boolean(lembrete.done)} onChange={() => alternarLembrete(lembrete)} />
                      <span>{lembrete.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="home-card home-card-acessos" aria-labelledby="home-acessos-titulo">
            <header className="home-card-cabecalho">
              <h2 id="home-acessos-titulo"><Icon name="star" size={18} /> Acesso rápido</h2>
            </header>
            <div className="home-atalhos">
              {acessos.map((item) => (
                <Link key={item.to + item.titulo} to={item.to} className="home-atalho">
                  <span className="home-atalho-icone"><Icon name={item.icon} size={20} /></span>
                  <strong>{item.titulo}</strong>
                  <span>{item.texto}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {papel !== 'admin' && (
          <div className="home-grid home-grid-info">
            <section className="home-card" aria-labelledby="home-dicas-titulo">
              <header className="home-card-cabecalho">
                <h2 id="home-dicas-titulo"><Icon name="bulb" size={18} /> {papel === 'professor' ? 'Dicas para ministrar' : 'Dicas de estudo'}</h2>
              </header>
              <ul className="home-dicas">
                {dicas.map((dica) => (
                  <li key={dica.titulo}>
                    <strong>{dica.titulo}</strong>
                    <span>{dica.texto}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="home-card" aria-labelledby="home-uso-titulo">
              <header className="home-card-cabecalho">
                <h2 id="home-uso-titulo"><Icon name="arrow" size={18} /> Como usar o Atlas</h2>
              </header>
              <ol className="home-passos">
                {passos.map((passo) => (
                  <li key={passo.titulo}>
                    <strong>{passo.titulo}</strong>
                    <span>{passo.texto}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {papel !== 'aluno' && (
          <section className="home-numeros" aria-label="Números do Geração Tech">
            <h2 className="home-numeros-titulo">Números do Geração Tech</h2>
            <GestaoDashboard />
          </section>
        )}
      </div>
    </div>
  );
}
