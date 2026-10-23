// Avatares aceitos no perfil. Deve bater com client/src/utils/avatars.js (mesmas coleções e mesmo número de variações).
// 'avatar-01' a 'avatar-12': avatares clássicos do Atlas.
// 'estilo:<nome>' (variação 1) e 'estilo:<nome>:<n>' (variações 2 a VARIANTES): coleções do DiceBear.
const CLASSICOS = Array.from({ length: 12 }, (_, index) => `avatar-${String(index + 1).padStart(2, '0')}`);
const VARIANTES = 12;
const COLECOES = ['adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral', 'big-ears', 'big-ears-neutral', 'big-smile', 'blobs', 'bottts', 'bottts-neutral', 'cameo', 'clay', 'constellation', 'critters', 'croodles', 'croodles-neutral', 'cutouts', 'disco', 'dylan', 'fun-emoji', 'gaze', 'glass', 'glyphs', 'icons', 'identicon', 'initial-face', 'initials', 'landscape', 'line-face', 'loops', 'lorelei', 'lorelei-neutral', 'marbles', 'micah', 'miniavs', 'moods', 'notionists', 'notionists-neutral', 'open-peeps', 'patchwork', 'personas', 'pixel-art', 'pixel-art-neutral', 'pixelbot', 'planets', 'rings', 'shadows', 'shape-grid', 'shapes', 'slice', 'sprouts', 'squircles', 'stack', 'stripes', 'thumbs', 'toon-head', 'triangles', 'voxel-art', 'voxel-bot', 'waves', 'weave'];
const ESTILOS = COLECOES.flatMap((nome) =>
  Array.from({ length: VARIANTES }, (_, i) => (i === 0 ? `estilo:${nome}` : `estilo:${nome}:${i + 1}`))
);
const AVATARS = [...CLASSICOS, ...ESTILOS];

module.exports = { AVATARS, CLASSICOS, ESTILOS, COLECOES, VARIANTES };