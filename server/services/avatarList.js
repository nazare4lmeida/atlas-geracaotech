// Avatares aceitos no perfil.
// 'avatar-01' a 'avatar-12': avatares clássicos do Atlas (estilo Lorelei com cor de fundo).
// 'estilo:<nome>': qualquer estilo do DiceBear, para o aluno e a equipe escolherem.
const CLASSICOS = Array.from({ length: 12 }, (_, index) => `avatar-${String(index + 1).padStart(2, '0')}`);
const ESTILOS = ['estilo:adventurer', 'estilo:avataaars', 'estilo:big-ears', 'estilo:big-smile', 'estilo:blobs', 'estilo:bottts', 'estilo:cameo', 'estilo:clay', 'estilo:constellation', 'estilo:critters', 'estilo:croodles', 'estilo:cutouts', 'estilo:disco', 'estilo:dylan', 'estilo:fun-emoji', 'estilo:gaze', 'estilo:glass', 'estilo:glyphs', 'estilo:icons', 'estilo:identicon', 'estilo:initial-face', 'estilo:initials', 'estilo:landscape', 'estilo:line-face', 'estilo:loops', 'estilo:lorelei', 'estilo:marbles', 'estilo:micah', 'estilo:miniavs', 'estilo:moods', 'estilo:notionists', 'estilo:open-peeps', 'estilo:patchwork', 'estilo:personas', 'estilo:pixel-art', 'estilo:pixelbot', 'estilo:planets', 'estilo:rings', 'estilo:shadows', 'estilo:shape-grid', 'estilo:shapes', 'estilo:slice', 'estilo:sprouts', 'estilo:squircles', 'estilo:stack', 'estilo:stripes', 'estilo:thumbs', 'estilo:toon-head', 'estilo:triangles', 'estilo:voxel-art', 'estilo:voxel-bot', 'estilo:waves', 'estilo:weave'];
const AVATARS = [...CLASSICOS, ...ESTILOS];

module.exports = { AVATARS, CLASSICOS, ESTILOS };
