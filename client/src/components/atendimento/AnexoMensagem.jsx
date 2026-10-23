import { useEffect, useState } from 'react';
import api from '../../services/api';
import { tamanhoLegivel } from '../../utils/anexos';

// Mostra o anexo dentro da conversa: imagem aparece direto; PDF vira um cartão para abrir.
export default function AnexoMensagem({ mensagemId, anexo }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  const imagem = anexo?.tipo?.startsWith('image/');

  useEffect(() => {
    let vivo = true;
    let objeto = null;
    api
      .get(`/atendimento/anexos/${mensagemId}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!vivo) return;
        objeto = URL.createObjectURL(data);
        setUrl(objeto);
      })
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [mensagemId]);

  if (erro) return <p className="atend-anexo-erro">Não foi possível abrir o arquivo.</p>;
  if (!url) return <p className="atend-anexo-carregando muted">Carregando {anexo?.nome}…</p>;

  if (imagem) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="atend-anexo-imagem" title="Abrir imagem em tamanho real">
        <img src={url} alt={anexo.nome} />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" download={anexo.nome} className="atend-anexo-cartao">
      <span className="atend-anexo-icone" aria-hidden="true">PDF</span>
      <span>
        <strong>{anexo.nome}</strong>
        <small>{tamanhoLegivel(anexo.tamanho)} · abrir ou baixar</small>
      </span>
    </a>
  );
}
