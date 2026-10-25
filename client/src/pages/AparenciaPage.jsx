import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { APARENCIA_PADRAO, FONTES, LARGURAS, aplicarAparencia } from '../utils/aparencia';

const CAMPOS = ['corPrimaria', 'corDestaque', 'fonte', 'imagemFundoCaminho', 'opacidadeFundo', 'larguraConteudo'];

// Aparência do site: o editor vê a mudança na hora e só publica ao clicar em Salvar.
export default function AparenciaPage() {
  const [salvo, setSalvo] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const ultimoSalvo = useRef(null);

  useEffect(() => {
    api
      .get('/site-settings/aparencia')
      .then(({ data }) => {
        ultimoSalvo.current = data.valor;
        setSalvo(data.valor);
        setRascunho(data.valor);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
    // Ao sair da tela, desfaz a prévia e volta ao que está salvo.
    return () => aplicarAparencia(ultimoSalvo.current);
  }, []);

  useEffect(() => {
    if (rascunho) aplicarAparencia(rascunho);
  }, [rascunho]);

  const alterou = salvo && rascunho && CAMPOS.some((campo) => salvo[campo] !== rascunho[campo]);

  function mudar(campo, valor) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviarImagem(arquivo) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Escolha um arquivo de imagem (JPG, PNG ou WebP).' });
      return;
    }
    try {
      const { data } = await api.post('/media', arquivo, { headers: { 'Content-Type': arquivo.type } });
      setRascunho((atual) => ({ ...atual, imagemFundoCaminho: data.path, imagemFundo: data.url }));
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      const corpo = Object.fromEntries(CAMPOS.map((campo) => [campo, rascunho[campo]]));
      const { data } = await api.put('/site-settings/aparencia', corpo);
      ultimoSalvo.current = data.valor;
      setSalvo(data.valor);
      setRascunho(data.valor);
      setFeedback({ type: 'success', text: 'Aparência publicada para todos.' });
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content aparencia-page">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Editor</span>
            <h1>Aparência do site</h1>
            <p>Ajuste cores, letra, imagem de fundo e largura. A mudança aparece na hora; clique em Salvar para publicar.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        {rascunho && (
          <>
            <div className="aparencia-grid">
              <section className="surface-card aparencia-campo">
                <h2>Cores</h2>
                <label>
                  <span>Cor principal</span>
                  <input
                    type="color"
                    value={rascunho.corPrimaria || '#134771'}
                    onChange={(e) => mudar('corPrimaria', e.target.value)}
                  />
                </label>
                <label>
                  <span>Cor de destaque</span>
                  <input
                    type="color"
                    value={rascunho.corDestaque || '#4e8bb8'}
                    onChange={(e) => mudar('corDestaque', e.target.value)}
                  />
                </label>
                <div className="aparencia-acoes">
                  <button type="button" className="ghost-button small" onClick={() => setRascunho({ ...rascunho, corPrimaria: null, corDestaque: null })}>
                    Usar cores padrão
                  </button>
                </div>
                <p className="muted">As cores valem para o modo claro e para o escuro.</p>
              </section>

              <section className="surface-card aparencia-campo">
                <h2>Letra</h2>
                <label>
                  <span>Fonte do site</span>
                  <select value={rascunho.fonte} onChange={(e) => mudar('fonte', e.target.value)}>
                    {Object.entries(FONTES).map(([id, fonte]) => (
                      <option key={id} value={id}>{fonte.nome}</option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="surface-card aparencia-campo">
                <h2>Imagem de fundo</h2>
                {rascunho.imagemFundo && <img className="aparencia-previa" src={rascunho.imagemFundo} alt="Prévia da imagem de fundo" />}
                <input type="file" accept="image/*" onChange={(e) => enviarImagem(e.target.files?.[0])} />
                <label>
                  <span>Intensidade da cobertura: {rascunho.opacidadeFundo}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rascunho.opacidadeFundo}
                    onChange={(e) => mudar('opacidadeFundo', Number(e.target.value))}
                    disabled={!rascunho.imagemFundo}
                  />
                </label>
                <p className="muted">Quanto maior, mais a cor do fundo cobre a imagem e mais fácil fica ler o conteúdo.</p>
                {rascunho.imagemFundo && (
                  <div className="aparencia-acoes">
                    <button type="button" className="ghost-button small" onClick={() => setRascunho({ ...rascunho, imagemFundoCaminho: null, imagemFundo: null })}>
                      Remover imagem
                    </button>
                  </div>
                )}
              </section>

              <section className="surface-card aparencia-campo">
                <h2>Largura do conteúdo</h2>
                <div className="aparencia-opcoes" role="radiogroup" aria-label="Largura do conteúdo">
                  {Object.entries(LARGURAS).map(([id, largura]) => (
                    <label key={id}>
                      <input
                        type="radio"
                        name="largura"
                        checked={rascunho.larguraConteudo === id}
                        onChange={() => mudar('larguraConteudo', id)}
                      />
                      {largura.nome}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="aparencia-acoes">
              <button type="button" className="ghost-button" disabled={!alterou || salvando} onClick={() => setRascunho(salvo)}>
                Descartar mudanças
              </button>
              <button type="button" className="primary-button" disabled={!alterou || salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </>
        )}
        {!rascunho && !feedback && <div className="page-state">Carregando aparência…</div>}
      </div>
    </div>
  );
}
