import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { errorText } from '../components/manage/shared';
import '../styles/mural.css';

// Mural da turma: o canal único da turma. Avisos fixos da equipe e dúvidas com respostas em linha.
const dataHora = (valor) =>
  valor ? new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

const ABAS = [
  { id: 'aviso', label: 'Avisos' },
  { id: 'duvida', label: 'Dúvidas' }
];

export default function MuralPage() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState(null);
  const [turmaId, setTurmaId] = useState('');
  const [aba, setAba] = useState('aviso');
  const [posts, setPosts] = useState([]);
  const [podeAvisar, setPodeAvisar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(null);
  const [compondo, setCompondo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [resposta, setResposta] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/mural/turmas')
      .then(({ data }) => {
        const lista = data.turmas || [];
        setTurmas(lista);
        if (lista.length) setTurmaId(lista[0].id);
      })
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar suas turmas.')));
  }, []);

  const carregarPosts = useCallback(() => {
    if (!turmaId) return Promise.resolve();
    setCarregando(true);
    return api
      .get(`/mural/turmas/${turmaId}/posts`, { params: { tipo: aba } })
      .then(({ data }) => {
        setPosts(data.posts || []);
        setPodeAvisar(Boolean(data.podeAvisar));
      })
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar o mural.')))
      .finally(() => setCarregando(false));
  }, [turmaId, aba]);

  useEffect(() => {
    setAberto(null);
    setCompondo(false);
    setErro('');
    carregarPosts();
  }, [carregarPosts]);

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
      const tipo = aba === 'aviso' ? 'aviso' : 'duvida';
      const { data } = await api.post(`/mural/turmas/${turmaId}/posts`, { tipo, titulo, corpo });
      setTitulo('');
      setCorpo('');
      setCompondo(false);
      await carregarPosts();
      if (tipo === 'duvida') abrirPost(data.post.id);
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

  const podeCriar = aba === 'duvida' || podeAvisar;
  const turmaAtual = (turmas || []).find((t) => t.id === turmaId);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content mural-page">
        <section className="section-heading">
          <h1>Mural da turma</h1>
          <p>Avisos da equipe e dúvidas da turma, num só lugar.</p>
        </section>

        {erro && <div className="alert error">{erro}</div>}

        {turmas === null && !erro && <p className="muted">Carregando...</p>}

        {turmas && turmas.length === 0 && (
          <section className="surface-card">
            <p className="muted">Você ainda não está em nenhuma turma ativa.</p>
          </section>
        )}

        {turmas && turmas.length > 0 && !aberto && (
          <>
            <div className="mural-topo">
              {turmas.length > 1 ? (
                <label className="mural-turma">
                  <span>Turma</span>
                  <select value={turmaId} onChange={(event) => setTurmaId(event.target.value)}>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mural-turma-unica">{turmaAtual?.nome}</p>
              )}

              <div className="mural-abas" role="tablist" aria-label="Tipo de publicação">
                {ABAS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={aba === item.id}
                    className={aba === item.id ? 'is-active' : ''}
                    onClick={() => setAba(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {podeCriar && !compondo && (
                <button type="button" className="primary-button small" onClick={() => setCompondo(true)}>
                  {aba === 'aviso' ? 'Novo aviso' : 'Fazer uma pergunta'}
                </button>
              )}
            </div>

            {compondo && (
              <form className="surface-card mural-compor" onSubmit={publicar}>
                <h2>{aba === 'aviso' ? 'Novo aviso' : 'Sua pergunta'}</h2>
                <label>
                  <span>Título</span>
                  <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={160} required minLength={3} />
                </label>
                <label>
                  <span>Detalhes (opcional)</span>
                  <textarea value={corpo} onChange={(event) => setCorpo(event.target.value)} rows={4} maxLength={4000} />
                </label>
                <div className="mural-acoes">
                  <button type="submit" className="primary-button" disabled={busy}>
                    {busy ? 'Publicando...' : aba === 'aviso' ? 'Publicar aviso' : 'Enviar pergunta'}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setCompondo(false)}>Cancelar</button>
                </div>
              </form>
            )}

            <section className="mural-lista" aria-busy={carregando}>
              {!carregando && posts.length === 0 && (
                <p className="surface-card muted">
                  {aba === 'aviso' ? 'Nenhum aviso por enquanto.' : 'Nenhuma dúvida ainda. Seja o primeiro a perguntar.'}
                </p>
              )}
              {posts.map((post) => (
                <button key={post.id} type="button" className={`surface-card mural-card${post.fixado ? ' is-fixado' : ''}`} onClick={() => abrirPost(post.id)}>
                  <div className="mural-card-tags">
                    {post.fixado && <span className="mural-tag is-destaque">Fixado</span>}
                    {post.tipo === 'duvida' && post.resolvido && <span className="mural-tag">Resolvida</span>}
                    {post.tipo === 'duvida' && !post.resolvido && <span className="mural-tag is-aberta">Em aberto</span>}
                  </div>
                  <strong>{post.titulo}</strong>
                  <span className="muted">
                    {post.autor.nome} · {post.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(post.criadoEm)}
                    {post.tipo === 'duvida' && ` · ${post.respostas} ${post.respostas === 1 ? 'resposta' : 'respostas'}`}
                  </span>
                </button>
              ))}
            </section>
          </>
        )}

        {aberto && (
          <section className="surface-card mural-detalhe">
            <button type="button" className="ghost-button small" onClick={() => setAberto(null)}>← Voltar ao mural</button>

            <header className="mural-detalhe-topo">
              <div className="mural-card-tags">
                {aberto.post.fixado && <span className="mural-tag is-destaque">Fixado</span>}
                {aberto.post.tipo === 'aviso' ? <span className="mural-tag">Aviso</span> : aberto.post.resolvido ? <span className="mural-tag">Resolvida</span> : <span className="mural-tag is-aberta">Em aberto</span>}
              </div>
              <h2>{aberto.post.titulo}</h2>
              <span className="muted">
                {aberto.post.autor.nome} · {aberto.post.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(aberto.post.criadoEm)}
              </span>
            </header>

            {aberto.post.corpo && <p className="mural-corpo">{aberto.post.corpo}</p>}

            <div className="mural-acoes">
              {aberto.podeModerar && aberto.post.tipo === 'duvida' && (
                <button type="button" className="ghost-button small" onClick={() => alterarPost({ fixado: !aberto.post.fixado })}>
                  {aberto.post.fixado ? 'Desafixar' : 'Fixar no topo'}
                </button>
              )}
              {aberto.post.tipo === 'duvida' && (aberto.podeModerar || aberto.post.autor.id === user?.id) && (
                <button type="button" className="ghost-button small" onClick={() => alterarPost({ resolvido: !aberto.post.resolvido })}>
                  {aberto.post.resolvido ? 'Reabrir' : 'Marcar como resolvida'}
                </button>
              )}
              {(aberto.podeModerar || aberto.post.autor.id === user?.id) && (
                <button type="button" className="ghost-button small danger" onClick={excluirPost}>Excluir</button>
              )}
            </div>

            {aberto.post.tipo === 'duvida' && (
              <>
                <h3 className="mural-respostas-titulo">Respostas ({aberto.respostas.length})</h3>
                {aberto.respostas.length === 0 && <p className="muted">Ainda sem respostas.</p>}
                <ul className="mural-respostas">
                  {aberto.respostas.map((r) => (
                    <li key={r.id} className={r.autor.papel === 'equipe' ? 'is-equipe' : ''}>
                      <div className="muted">
                        <strong>{r.autor.nome}</strong> · {r.autor.papel === 'equipe' ? 'Equipe' : 'Aluno'} · {dataHora(r.criadaEm)}
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
