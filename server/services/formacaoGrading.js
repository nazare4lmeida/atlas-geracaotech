// Decisão final de certificado de uma formação, a partir de blocos, projetos e prova de recuperação.
//
// Regras (confirmadas pela gestão):
// - Qualquer aluna pode fazer a prova de recuperação.
// - Conclusão quando a nota do projeto é a maior (ou quando tirou mais de 7 no projeto), mesmo que a prova seja maior.
//   Exige todos os projetos da formação entregues e com nota, e nota do projeto de pelo menos 7 (MINIMO_PROJETO).
// - A prova de recuperação tem uma única tentativa.
// - Participação quando a prova de recuperação tem 7 ou mais, e a conclusão não se aplica.
//   Inclui quem não entregou projeto, e quem entregou mas tirou menos no projeto.
// - Nota final exibida = a maior entre a nota do projeto e a nota da prova.
//
// Pré-requisito: todos os blocos concluídos (conteúdo e quizzes). A prova não substitui o conteúdo.
//

const APROVACAO_PROVA = 7;   // nota mínima na prova de recuperação para participação
const MINIMO_PROJETO = 7;    // nota mínima do projeto para conclusão
const DESTAQUE_PROJETO = 7;  // acima deste valor, o projeto sozinho dá conclusão (desde que atinja o mínimo)

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round2(n) {
  return n == null ? null : Math.round(n * 100) / 100;
}

function result(status, tipo, projectGrade, examGrade) {
  const grades = [projectGrade, examGrade].filter((g) => g != null);
  return {
    status,
    tipo,                                   // 'conclusao' | 'participacao' | null
    finalGrade: grades.length ? round2(Math.max(...grades)) : null,
    projectGrade: round2(projectGrade),
    examGrade: round2(examGrade)
  };
}

/**
 * @param {object} input
 * @param {boolean} input.blocksDone  todos os blocos concluídos (conteúdo e quizzes)
 * @param {Array<{delivered: boolean, grade: number|null}>} input.projects  projetos da formação
 * @param {number|null} input.examGrade  nota da prova de recuperação (0 a 10), ou null se não fez
 */
function resolveFormacao({ blocksDone, projects = [], examGrade = null }) {
  const exam = examGrade == null ? null : Number(examGrade);

  if (!blocksDone) {
    return result('em_andamento', null, null, exam);
  }

  const delivered = projects.filter((p) => p.delivered);
  const allDelivered = delivered.length === projects.length;

  // Sem projetos na formação: conclusão só pelo conteúdo.
  if (projects.length === 0) {
    return result('conclusao', 'conclusao', null, exam);
  }

  const pendingGrade = delivered.some((p) => p.grade == null);
  const projectGrade = delivered.length && !pendingGrade
    ? average(delivered.map((p) => Number(p.grade)))
    : null;

  // Conclusão: todos entregues e com nota, nota do projeto de pelo menos 7,
  // e (o projeto é a maior nota, ou passou de 7 no projeto).
  if (allDelivered) {
    if (pendingGrade) {
      return result('aguardando_nota', null, null, exam);
    }
    const projectIsHighest = exam == null || projectGrade >= exam;
    if (projectGrade >= MINIMO_PROJETO && (projectIsHighest || projectGrade > DESTAQUE_PROJETO)) {
      return result('conclusao', 'conclusao', projectGrade, exam);
    }
  }

  // Participação: a prova de recuperação com nota de aprovação.
  if (exam != null && exam >= APROVACAO_PROVA) {
    return result('participacao', 'participacao', projectGrade, exam);
  }

  // Ainda não fez a prova: pode fazer a qualquer momento.
  if (exam == null) {
    return result('aguardando_prova', null, projectGrade, null);
  }

  return result('sem_certificado', null, projectGrade, exam);
}

module.exports = { resolveFormacao, APROVACAO_PROVA, MINIMO_PROJETO, DESTAQUE_PROJETO };
