// Avatares do Atlas, gerados pelo DiceBear no próprio navegador.
// 'avatar-01' a 'avatar-12': clássicos (estilo Lorelei com cor de fundo).
// 'estilo:<nome>' e 'estilo:<nome>:<n>': as 61 coleções do DiceBear, com VARIANTES rostos cada. Carregadas só quando usadas.
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
const NOMES_ESTILOS = ['adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral', 'big-ears', 'big-ears-neutral', 'big-smile', 'blobs', 'bottts', 'bottts-neutral', 'cameo', 'clay', 'constellation', 'critters', 'croodles', 'croodles-neutral', 'cutouts', 'disco', 'dylan', 'fun-emoji', 'gaze', 'glass', 'glyphs', 'icons', 'identicon', 'initial-face', 'initials', 'landscape', 'line-face', 'loops', 'lorelei', 'lorelei-neutral', 'marbles', 'micah', 'miniavs', 'moods', 'notionists', 'notionists-neutral', 'open-peeps', 'patchwork', 'personas', 'pixel-art', 'pixel-art-neutral', 'pixelbot', 'planets', 'rings', 'shadows', 'shape-grid', 'shapes', 'slice', 'sprouts', 'squircles', 'stack', 'stripes', 'thumbs', 'toon-head', 'triangles', 'voxel-art', 'voxel-bot', 'waves', 'weave'];

// Cada coleção tem VARIANTES rostos. A variação 1 usa a semente padrão (id 'estilo:<nome>');
// as demais usam sementes numeradas (id 'estilo:<nome>:<n>'). O servidor aceita exatamente os mesmos ids.
export const VARIANTES = 12;

const idEstilo = (nome, n) => (n <= 1 ? `estilo:${nome}` : `estilo:${nome}:${n}`);
const sementeEstilo = (n) => (n <= 1 ? SEMENTE : `${SEMENTE}-${n}`);

// Lista de escolha: cada coleção com todas as suas variações, depois os clássicos.
export const AVATARS = [
  ...NOMES_ESTILOS.flatMap((nome) =>
    Array.from({ length: VARIANTES }, (_, i) => ({
      id: idEstilo(nome, i + 1),
      colecao: nome,
      label: `Variação ${i + 1}`
    }))
  ),
  ...CLASSICOS.map(({ id, label }) => ({ id, label, colecao: 'classicos' }))
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
    const [, nome, numero] = /^estilo:([^:]+)(?::(\d+))?$/.exec(chave);
    const caminho = Object.keys(carregadores).find((k) => k.endsWith(`/${nome}.min.json`));
    const definicao = caminho ? await carregadores[caminho]() : null;
    uri = gerar(definicao || loreleiDef, { seed: sementeEstilo(Number(numero) || 1) });
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
