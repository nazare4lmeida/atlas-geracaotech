import { useEffect, useState } from 'react';
import api from '../../services/api';

const dataTexto = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '');

// "Sua turma" e as datas importantes, como no portal do aluno do site do GT.
// Não aparece para quem não tem matrícula ativa em turma.
export default function TurmaCard() {
  const [turmas, setTurmas] = useState(null);

  useEffect(() => {
    api
      .get('/portal/turma')
      .then(({ data }) => setTurmas(data.turmas || []))
      .catch(() => setTurmas([]));
  }, []);

  if (!turmas || turmas.length === 0) return null;

  return (
    <>
      {turmas.map((turma) => (
        <section key={turma.id} className="surface-card portal-turma" aria-label={`Turma ${turma.nome}`}>
          <div className="portal-turma-grid">
            <div>
              <h2>Sua turma</h2>
              <dl className="portal-dados">
                <div><dt>Curso</dt><dd>{turma.curso}</dd></div>
                <div><dt>Turma</dt><dd>{turma.nome}</dd></div>
                <div><dt>Modalidade</dt><dd>{turma.modalidade}</dd></div>
                {turma.sede && <div><dt>Local</dt><dd>{turma.sede}</dd></div>}
                {turma.turno && <div><dt>Turno</dt><dd>{turma.turno}</dd></div>}
                {turma.diasSemana && <div><dt>Dias</dt><dd>{turma.diasSemana}</dd></div>}
                {turma.horario && <div><dt>Horário</dt><dd>{turma.horario}</dd></div>}
              </dl>
            </div>
            <div>
              <h2>Datas importantes</h2>
              <ul className="portal-datas">
                {turma.dataInicio && <li><span>Início das aulas</span><strong>{dataTexto(turma.dataInicio)}</strong></li>}
                {turma.dataFim && <li><span>Término do curso</span><strong>{dataTexto(turma.dataFim)}</strong></li>}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
