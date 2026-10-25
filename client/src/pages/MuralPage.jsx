import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { errorText } from '../components/manage/shared';
import '../styles/mural.css';

// Mural: avisos da equipe e fórum dos alunos, em turmas e grupos de curso (turma e grupo são o mesmo espaço).
const dataHora = (valor) =>
  valor ? new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

const REGRAS = 'Respeito é obrigatório no fórum. Não são permitidos preconceito de qualquer tipo, homofobia, palavrões, palavras de baixo calão ou ofensas. Quem descumprir estas regras pode ser removido do curso.';

export default function MuralPage() {
  const { user, isAdmin } = useAuth();
  const [espacos, setEspacos] = useState(null);
  const [chave, setChave] = useState('');
  const [aba, setAba] = useState('forum');
  const [posts, setPosts] = useState([]);
  const [permissoes, setPermissoes] = useState({ podeAvisar: false, podeModerar: false, podeExpulsar: false });
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(null);
  const [compondo, setCompondo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [tipoNovo, setTipoNovo] = useState('forum');
  const [resposta, setResposta] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [denuncias, setDenuncias] = useState([]);
  const [statusDenuncia, setStatusDenuncia] = useState('pendente');
  const [palavras, setPalavras] = useState('');

  const espacoAtual = useMemo(() => (espacos || []).find((item) => `${item.tipo}:${item.id}` === chave), [espacos, chave]);
  const moderaEspaco = permissoes.podeModerar;

  useEffect(() => {
    api
      .get('/mural/espacos')
      .then(({ data }) => {
        const lista = data.espacos || [];
        setEspacos(lista);
        if (lista.length) setChave(`${lista[0].tipo}:${lista[0].id}`);
      })
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar os espaços do mural.')));
  }, []);

  const carregarPosts = useCallback(() => {
    if (!espacoAtual || aba === 'denuncias') return Promise.resolve();
    setCarregando(true);
    return api
      .get(`/mural/espacos/${espacoAtual.tipo}/${espacoAtual.id}/posts`, { params: { tipo: aba } })
      .then(({ data }) => {
        setPosts(data.posts || []);
        setPermissoes({ podeAvisar: Boolean(data.podeAvisar), podeModerar: Boolean(data.podeModerar), podeExpulsar: Boolean(data.podeExpulsar) });
      })
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar o mural.')))
      .finally(() => setCarregando(false));
  }, [espacoAtual, aba]);

  const carregarDenuncias = useCallback(() => {
    setCarregando(true);
    return api
      .get('/mural/denuncias', { params: { status: statusDenuncia } })
      .then(({ data }) => setDenuncias(data.denuncias || []))
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar as denúncias.')))
      .finally(() => setCarregando(false));
  }, [statusDenuncia]);

  useEffect(() => {
    setAberto(null);
    setCompondo(false);
    setAviso('');
    setErro('');
    if (aba === 'denuncias') {
      carregarDenuncias();
      if (isAdmin) api.get('/mural/filtro').then(({ data }) => setPalavras((data.palavras || []).join('\n'))).catch(() => {});
    } else {
      carregarPosts();
    }
  }, [aba, carregarPosts, carregarDenuncias, isAdmin]);

  const abrirPost = async (id) => {
    setErro('');
    setResposta('');
    try {
      const { data } = await api.get(`/mural/posts/${id}`);
      setAberto(data);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível abrir esta publicação.'));
    }
  };

  const publicar = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErro('');
    try {
      const tipo = permissoes.podeAvisar ? tipoNovo : 'forum';
      const { data } = await api.post(`/mural/espacos/${espacoAtual.tipo}/${espacoAtual.id}/posts`, { tipo, titulo, corpo });
      setTitulo('');
      setCorpo('');
      setCompondo(false);
      if (tipo === aba) await carregarPosts();
      else setAba(tipo);
      if (tipo === 'forum') abrirPost(data.post.id);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível publicar.'));
    } finally {
      setBusy(false);
    }
  };

  const responder = async (event) => {
    event.preventDefault();
    if (!aberto) return;
    setBusy(true);
    setErro('');
    try {
      const { data } = await api.post(`/mural/posts/${aberto.post.id}/respostas`, { corpo: resposta });
      setResposta('');
      setAberto((atual) => ({ ...atual, respostas: data.respostas, post: { ...atual.post, respostas: data.respostas.length } }));
      carregarPosts();
    } catch (err) {
      setErro(errorText(err, 'Não foi possível enviar a resposta.'));
    } finally {
      setBusy(false);
    }
  };

  const alterarPost = async (campos) => {
    setErro('');
    try {
      await api.patch(`/mural/posts/${aberto.post.id}`, campos);
      await abrirPost(aberto.post.id);
      carregarPosts();
    } catch (err) {
      setErro(errorText(err, 'Não foi possível atualizar.'));
    }
  };

  const excluirPost = async () => {
    if (!window.confirm('Excluir esta publicação? As respostas também serão apagadas.')) return;
    try {
      await api.delete(`/mural/posts/${aberto.post.id}`);
      setAberto(null);
      carregarPosts();
    } catch (err) {
      setErro(errorText(err, 'Não foi possível excluir.'));
    }
  };

  const excluirResposta = async (id) => {
    if (!window.confirm('Excluir esta resposta?')) return;
    try {
      await api.delete(`/mural/respostas/${id}`);
      await abrirPost(aberto.post.id);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível excluir a resposta.'));
    }
  };

  const ocultarResposta = async (r) => {
    try {
      await api.patch(`/mural/respostas/${r.id}`, { ocultada: !r.ocultada });
      await abrirPost(aberto.post.id);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível atualizar a resposta.'));
    }
  };

  const denunciar = async ({ postId, respostaId }) => {
    const motivo = window.prompt('Por que você está denunciando? (opcional)') ?? null;
    if (motivo === null) return;
    try {
      await api.post('/mural/denuncias', { postId, respostaId, motivo });
      setAviso('Denúncia enviada. A equipe vai analisar.');
    } catch (err) {
      setErro(errorText(err, 'Não foi possível enviar a denúncia.'));
    }
  };

  const expulsar = async ({ postId, respostaId, nome }) => {
    if (!window.confirm(`Remover ${nome} do curso? Esta pessoa perde o acesso ao curso e aos seus espaços.`)) return;
    try {
      await api.post('/mural/expulsar', { postId, respostaId });
      setAviso(`${nome} foi removido(a) do curso.`);
      if (aberto) await abrirPost(aberto.post.id);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível remover.'));
    }
  };

  const decidir = async (denuncia, decisao) => {
    const texto = { manter: 'Manter o conteúdo e fechar a denúncia?', ocultar: 'Ocultar o conteúdo denunciado?', expulsar: 'Ocultar o conteúdo e remover o autor do curso?' }[decisao];
    if (!window.confirm(texto)) return;
    try {
      await api.post(`/mural/denuncias/${denuncia.id}/decisao`, { decisao });
      carregarDenuncias();
    } catch (err) {
      setErro(errorText(err, 'Não foi possível registrar a decisão.'));
    }
  };

  const salvarPalavras = async () => {
    const lista = palavras.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    try {
      const { data } = await api.put('/mural/filtro', { palavras: lista });
      setPalavras((data.palavras || []).join('\n'));
      setAviso('Lista de palavras bloqueadas atualizada.');
    } catch (err) {
      setErro(errorText(err, 'Não foi possível salvar a lista.'));
    }
  };

  const podeCriar = aba === 'forum' || (aba === 'aviso' && permissoes.podeAvisar);
  const cursosAgrupados = useMemo(() => {
    const grupos = {};
    (espacos || []).forEach((item) => {
      grupos[item.curso] = [...(grupos[item.curso] || []), item];
    });
    return Object.entries(grupos);
  }, [espacos]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content mural-page">
        <section className="section-heading">
          <h1>Mural</h1>
          <p>Avisos da equipe e fórum das turmas e grupos, num só lugar.</p>
        </section>

        <section className="mural-regras" role="note" aria-label="Regras do fórum">
          <strong>Regras do fórum</strong>
          <p>{REGRAS}</p>
        </section>

        {erro && <div className="alert error">{erro}</div>}
        {aviso && <div className="alert success" role="status">{aviso}</div>}

        {espacos === null && !erro && <p className="muted">Carregando...</p>}

        {espacos && espacos.length === 0 && (
          <section className="surface-card">
            <p className="muted">Você ainda não está em nenhuma turma ou grupo ativo.</p>
          </section>
        )}

        {espacos && espacos.length > 0 && !aberto && (
          <>
            <div className="mural-topo">
              <label className="mural-turma">
                <span>Turma ou grupo</span>
                <select value={chave} onChange={(event) => setChave(event.target.value)}>
                  {cursosAgrupados.map(([curso, itens]) => (
                    <optgroup key={curso} label={curso}>
                      {itens.map((item) => (
                        <option key={`${item.tipo}:${item.id}`} value={`${item.tipo}:${item.id}`}>
                          {item.tipo === 'curso' ? item.nome : `${item.tipo === 'grupo' ? 'Grupo' : 'Turma'}: ${item.nome}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="mural-abas" role="tablist" aria-label="Seções do mural">
                <button type="button" role="tab" aria-selected={aba === 'forum'} className={aba === 'forum' ? 'is-active' : ''} onClick={() => setAba('forum')}>
                  Fórum
                </button>
                <button type="button" role="tab" aria-selected={aba === 'aviso'} className={aba === 'aviso' ? 'is-active' : ''} onClick={() => setAba('aviso')}>
                  Avisos
                </button>
                {(moderaEspaco || isAdmin) && (
                  <button type="button" role="tab" aria-selected={aba === 'denuncias'} className={aba === 'denuncias' ? 'is-active' : ''} onClick={() => setAba('denuncias')}>
                    Moderação
                  </button>
                )}
              </div>

              {aba !== 'denuncias' && podeCriar && !compondo && (
                <button type="button" className="primary-button small" onClick={() => setCompondo(true)}>
                  {aba === 'aviso' ? 'Novo aviso' : 'Abrir tópico'}
                </button>
              )}
            </div>

            {aba !== 'denuncias' && compondo && (
              <form className="surface-card mural-compor" onSubmit={publicar}>
                <h2>{permissoes.podeAvisar && tipoNovo === 'aviso' ? 'Novo aviso' : 'Novo tópico no fórum'}</h2>
                {permissoes.podeAvisar && (
                  <label>
                    <span>Tipo</span>
                    <select value={tipoNovo} onChange={(event) => setTipoNovo(event.target.value)}>
                      <option value="forum">Tópico do fórum</option>
                      <option value="aviso">Aviso fixo</option>
                    </select>
                  </label>
                )}
                <label>
                  <span>Título</span>
                  <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={160} required minLength={3} />
                </label>
                <label>
                  <span>Mensagem (opcional)</span>
                  <textarea value={corpo} onChange={(event) => setCorpo(event.target.value)} rows={4} maxLength={4000} />
                </label>
                <div className="mural-acoes">
                  <button type="submit" className="primary-button" disabled={busy}>
                    {busy ? 'Publicando...' : 'Publicar'}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setCompondo(false)}>Cancelar</button>
                </div>
              </form>
            )}

            {aba !== 'denuncias' && (
              <section className="mural-lista" aria-busy={carregando}>
                {!carregando && posts.length === 0 && (
                  <p className="surface-card muted">
                    {aba === 'aviso' ? 'Nenhum aviso por enquanto.' : 'Nenhum tópico ainda. Seja o primeiro a conversar.'}
                  </p>
                )}
                {posts.map((post) => (
                  <button key={post.id} type="button" className={`surface-card mural-card${post.fixado ? ' is-fixado' : ''}${post.ocultado ? ' is-oculto' : ''}`} onClick={() => abrirPost(post.id)}>
                    <div className="mural-card-tags">
                      {post.fixado && <span className="mural-tag is-destaque">Fixado</span>}
                      {post.ocultado && <span className="mural-tag">Oculto pela equipe</span>}
                      {post.tipo === 'aviso' && <span className="mural-tag">Aviso</span>}
                    </div>
                    <strong>{post.titulo}</strong>
                    <span className="muted">
                      {post.autor.nome} · {post.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(post.criadoEm)}
                      {post.tipo === 'forum' && ` · ${post.respostas} ${post.respostas === 1 ? 'resposta' : 'respostas'}`}
                    </span>
                  </button>
                ))}
              </section>
            )}

            {aba === 'denuncias' && (
              <section className="mural-moderacao">
                <div className="mural-acoes">
                  <button type="button" className={`ghost-button small${statusDenuncia === 'pendente' ? ' is-active' : ''}`} onClick={() => setStatusDenuncia('pendente')}>Pendentes</button>
                  <button type="button" className={`ghost-button small${statusDenuncia === 'resolvida' ? ' is-active' : ''}`} onClick={() => setStatusDenuncia('resolvida')}>Decididas</button>
                </div>
                {!carregando && denuncias.length === 0 && <p className="surface-card muted">Nenhuma denúncia {statusDenuncia === 'pendente' ? 'pendente' : 'decidida'}.</p>}
                {denuncias.map((d) => (
                  <article key={d.id} className="surface-card mural-denuncia">
                    <div className="mural-card-tags">
                      <span className="mural-tag">{d.resposta_corpo !== null && d.resposta_corpo !== undefined ? 'Resposta' : 'Tópico'}</span>
                      <span className="mural-tag">{d.curso}</span>
                    </div>
                    <p>
                      <strong>{d.alvo_autor_nome}</strong> · {d.espaco_nome}
                    </p>
                    <p className="mural-corpo">{d.resposta_corpo ?? d.post_titulo}</p>
                    {d.motivo && <p className="muted">Motivo informado: {d.motivo}</p>}
                    <span className="muted">Denunciado por {d.denunciante_nome} · {dataHora(d.created_at)}</span>
                    {d.status === 'pendente' ? (
                      <div className="mural-acoes">
                        <button type="button" className="ghost-button small" onClick={() => decidir(d, 'manter')}>Manter</button>
                        <button type="button" className="ghost-button small" onClick={() => decidir(d, 'ocultar')}>Ocultar</button>
                        <button type="button" className="ghost-button small danger" onClick={() => decidir(d, 'expulsar')}>Ocultar e remover do curso</button>
                      </div>
                    ) : (
                      <span className="muted">Decisão: {d.decisao}</span>
                    )}
                  </article>
                ))}

                {isAdmin && (
                  <div className="surface-card mural-filtro">
                    <h2>Palavras bloqueadas</h2>
                    <p className="muted">Uma palavra por linha. Mensagens com estas palavras não são publicadas.</p>
                    <textarea value={palavras} onChange={(event) => setPalavras(event.target.value)} rows={8} />
                    <div className="mural-acoes">
                      <button type="button" className="primary-button small" onClick={salvarPalavras}>Salvar lista</button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {aberto && (
          <section className="surface-card mural-detalhe">
            <button type="button" className="ghost-button small" onClick={() => setAberto(null)}>← Voltar ao mural</button>

            <header className="mural-detalhe-topo">
              <div className="mural-card-tags">
                {aberto.post.fixado && <span className="mural-tag is-destaque">Fixado</span>}
                {aberto.post.ocultado && <span className="mural-tag">Oculto pela equipe</span>}
                {aberto.post.tipo === 'aviso' ? <span className="mural-tag">Aviso</span> : aberto.post.resolvido ? <span className="mural-tag">Resolvido</span> : <span className="mural-tag is-aberta">Em aberto</span>}
              </div>
              <h2>{aberto.post.titulo}</h2>
              <span className="muted">
                {aberto.post.autor.nome} · {aberto.post.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(aberto.post.criadoEm)}
              </span>
            </header>

            {aberto.post.corpo && <p className="mural-corpo">{aberto.post.corpo}</p>}

            <div className="mural-acoes">
              {aberto.podeModerar && aberto.post.tipo === 'forum' && (
                <button type="button" className="ghost-button small" onClick={() => alterarPost({ fixado: !aberto.post.fixado })}>
                  {aberto.post.fixado ? 'Desafixar' : 'Fixar no topo'}
                </button>
              )}
              {aberto.podeModerar && (
                <button type="button" className="ghost-button small" onClick={() => alterarPost({ ocultado: !aberto.post.ocultado })}>
                  {aberto.post.ocultado ? 'Mostrar de novo' : 'Ocultar'}
                </button>
              )}
              {aberto.post.tipo === 'forum' && (aberto.podeModerar || aberto.post.autor.id === user?.id) && (
                <button type="button" className="ghost-button small" onClick={() => alterarPost({ resolvido: !aberto.post.resolvido })}>
                  {aberto.post.resolvido ? 'Reabrir' : 'Marcar como resolvido'}
                </button>
              )}
              {aberto.post.autor.id !== user?.id && (
                <button type="button" className="ghost-button small" onClick={() => denunciar({ postId: aberto.post.id })}>Denunciar</button>
              )}
              {aberto.podeExpulsar && aberto.post.autor.id !== user?.id && aberto.post.autor.papel === 'aluno' && (
                <button type="button" className="ghost-button small danger" onClick={() => expulsar({ postId: aberto.post.id, nome: aberto.post.autor.nome })}>
                  Remover do curso
                </button>
              )}
              {(aberto.podeModerar || aberto.post.autor.id === user?.id) && (
                <button type="button" className="ghost-button small danger" onClick={excluirPost}>Excluir</button>
              )}
            </div>

            {aberto.post.tipo === 'forum' && (
              <>
                <h3 className="mural-respostas-titulo">Respostas ({aberto.respostas.length})</h3>
                {aberto.respostas.length === 0 && <p className="muted">Ainda sem respostas.</p>}
                <ul className="mural-respostas">
                  {aberto.respostas.map((r) => (
                    <li key={r.id} className={r.autor.papel === 'equipe' ? 'is-equipe' : ''}>
                      <div className="muted">
                        <strong>{r.autor.nome}</strong> · {r.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(r.criadaEm)}
                        {r.ocultada && <span className="mural-tag"> Oculta pela equipe</span>}
                        {r.autor.id !== user?.id && (
                          <button type="button" className="mural-link" onClick={() => denunciar({ respostaId: r.id })}>denunciar</button>
                        )}
                        {aberto.podeModerar && <button type="button" className="mural-link" onClick={() => ocultarResposta(r)}>{r.ocultada ? 'mostrar' : 'ocultar'}</button>}
                        {aberto.podeExpulsar && r.autor.id !== user?.id && r.autor.papel === 'aluno' && (
                          <button type="button" className="mural-link" onClick={() => expulsar({ respostaId: r.id, nome: r.autor.nome })}>remover do curso</button>
                        )}
                        {(aberto.podeModerar || r.autor.id === user?.id) && (
                          <button type="button" className="mural-link" onClick={() => excluirResposta(r.id)}>excluir</button>
                        )}
                      </div>
                      <p>{r.corpo}</p>
                    </li>
                  ))}
                </ul>

                <form className="mural-responder" onSubmit={responder}>
                  <label>
                    <span>Sua resposta</span>
                    <textarea value={resposta} onChange={(event) => setResposta(event.target.value)} rows={3} maxLength={2000} required />
                  </label>
                  <button type="submit" className="primary-button small" disabled={busy || !resposta.trim()}>
                    {busy ? 'Enviando...' : 'Responder'}
                  </button>
                </form>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
