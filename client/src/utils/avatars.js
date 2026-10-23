// Avatares do Atlas, gerados pelo DiceBear no próprio navegador.
// 'avatar-01' a 'avatar-12': clássicos (estilo Lorelei com cor de fundo).
// 'estilo:<nome>': qualquer um dos 53 estilos do DiceBear. Cada estilo é carregado só quando é usado.
import { Style, Avatar } from '@dicebear/core';
import { useEffect, useState } from 'react';
import loreleiDef from '@dicebear/styles/lorelei.json' with { type: 'json' };

const carregadores = import.meta.glob('/node_modules/@dicebear/styles/dist/*.min.json', { import: 'default' });
const SEMENTE = 'geracao-tech';
const FALLBACK = '/avatars/avatar-01.svg';

const CLASSICOS = [
  { id: 'avatar-01', label: 'Azul', cor: '134771' },
  { id: 'avatar-02', label: 'Coral', cor: 'f0866b' },
  { id: 'avatar-03', label: 'Verde', cor: '3f9f6b' },
  { id: 'avatar-04', label: 'Âmbar', cor: 'e0a526' },
  { id: 'avatar-05', label: 'Violeta', cor: '7c5cc4' },
  { id: 'avatar-06', label: 'Turquesa', cor: '2fb5b0' },
  { id: 'avatar-07', label: 'Rosa', cor: 'e0679e' },
  { id: 'avatar-08', label: 'Grafite', cor: '4a5563' },
  { id: 'avatar-09', label: 'Oliva', cor: '7d8b3a' },
  { id: 'avatar-10', label: 'Vinho', cor: '8e2b44' },
  { id: 'avatar-11', label: 'Céu', cor: '5799c9' },
  { id: 'avatar-12', label: 'Areia', cor: 'c9b28a' }
];

// Nomes dos estilos do DiceBear (mesma lista aceita pelo servidor).
const NOMES_ESTILOS = ['adventurer','avataaars','big-ears','big-smile','blobs','bottts','cameo','clay','constellation','critters','croodles','cutouts','disco','dylan','fun-emoji','gaze','glass','glyphs','icons','identicon','initial-face','initials','landscape','line-face','loops','lorelei','marbles','micah','miniavs','moods','notionists','open-peeps','patchwork','personas','pixel-art','pixelbot','planets','rings','shadows','shape-grid','shapes','slice','sprouts','squircles','stack','stripes','thumbs','toon-head','triangles','voxel-art','voxel-bot','waves','weave'];

// Lista de escolha: os 53 estilos primeiro, depois os clássicos.
export const AVATARS = [
  ...NOMES_ESTILOS.map((nome) => ({ id: `estilo:${nome}`, label: nome.replace(/-/g, ' ') })),
  ...CLASSICOS.map(({ id, label }) => ({ id, label }))
];

const cache = new Map();

function classicoDe(id) {
  return CLASSICOS.find((item) => item.id === id) || CLASSICOS[0];
}

function gerar(definicao, opcoes) {
  return new Avatar(new Style(definicao), { seed: SEMENTE, ...opcoes }).toDataUri();
}

// Gera (ou devolve do cache) o SVG do avatar. Assíncrono só para estilos que ainda não foram carregados.
export async function carregarAvatar(id) {
  const chave = AVATARS.some((item) => item.id === id) ? id : 'avatar-01';
  if (cache.has(chave)) return cache.get(chave);

  let uri;
  if (chave.startsWith('estilo:')) {
    const nome = chave.slice('estilo:'.length);
    const caminho = Object.keys(carregadores).find((k) => k.endsWith(`/${nome}.min.json`));
    const definicao = caminho ? await carregadores[caminho]() : null;
    uri = gerar(definicao || loreleiDef, {});
  } else {
    const classico = classicoDe(chave);
    uri = gerar(loreleiDef, { seed: classico.id, backgroundColor: [classico.cor] });
  }
  cache.set(chave, uri);
  return uri;
}

// Versão síncrona para o que já foi carregado. Antes disso, mostra o avatar padrão.
export function avatarSrc(id) {
  const chave = AVATARS.some((item) => item.id === id) ? id : 'avatar-01';
  if (cache.has(chave)) return cache.get(chave);
  carregarAvatar(chave);
  return FALLBACK;
}

// Hook para componentes: re-renderiza quando o avatar termina de ser gerado.
export function useAvatarSrc(id) {
  const chave = AVATARS.some((item) => item.id === id) ? id : 'avatar-01';
  const [src, setSrc] = useState(() => cache.get(chave) || FALLBACK);
  useEffect(() => {
    let ativo = true;
    carregarAvatar(chave).then((uri) => {
      if (ativo) setSrc(uri);
    });
    return () => {
      ativo = false;
    };
  }, [chave]);
  return src;
}
