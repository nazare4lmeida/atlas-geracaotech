// Espaço de código dentro da aula: a sala do Codice (a turma escreve junto) ou o jogo Codey.
// Aparece incorporado, como um vídeo. O botão "Abrir em nova aba" fica sempre disponível,
// caso o site do espaço não permita ser exibido dentro do Atlas.

export const ESPACOS_DE_CODIGO = {
  codice: { nome: 'Codice', dica: 'Sala de código: a turma escreve junta, no mesmo projeto.' },
  codey: { nome: 'Codey', dica: 'Jogo de programação: treine código resolvendo desafios.' }
};

export default function EspacoIncorporado({ lesson }) {
  const espaco = ESPACOS_DE_CODIGO[lesson.type];
  if (!espaco || !lesson.url) return null;

  return (
    <div className="espaco-incorporado">
      <div className="espaco-incorporado-head">
        <span>{espaco.dica}</span>
        <a href={lesson.url} target="_blank" rel="noreferrer" className="text-link">
          Abrir em nova aba
        </a>
      </div>
      <div className="espaco-incorporado-frame">
        <iframe
          src={lesson.url}
          title={`${espaco.nome}: ${lesson.title}`}
          allow="clipboard-read; clipboard-write; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
