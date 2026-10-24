import { lerEncontro } from '../../utils/aulas';

// Cartão de encontro ao vivo, como aparece para o aluno dentro da aula.
export default function AulaAoVivoCard({ lesson }) {
  const { dia, inicio, fim } = lerEncontro(lesson.content);
  const horario = [inicio, fim].filter(Boolean).join(' às ');

  return (
    <div className="encontro-card">
      <div className="encontro-top">
        <span className="encontro-kicker">Encontro ao vivo</span>
        {dia && <span>{dia}</span>}
      </div>
      <strong className="encontro-titulo">{lesson.title}</strong>
      {horario && <p className="encontro-horario">Horário: {horario}</p>}
      {lesson.url ? (
        <p>
          <a href={lesson.url} target="_blank" rel="noreferrer" className="primary-button small">
            Acessar encontro
          </a>
        </p>
      ) : (
        <p className="muted">O link deste encontro será divulgado em breve.</p>
      )}
    </div>
  );
}
