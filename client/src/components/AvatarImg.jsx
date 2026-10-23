import { useAvatarSrc } from '../utils/avatars';

// Imagem do avatar. Usa o hook para aparecer assim que o desenho for gerado.
export default function AvatarImg({ id, className, alt = '' }) {
  const src = useAvatarSrc(id);
  return <img className={className} src={src} alt={alt} />;
}
