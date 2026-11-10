const { query } = require('../db/pool');
const { hojeEmBrasilia } = require('./blockProgress');

// Lembretes de prazo de bloco no mural das turmas do curso.
// Cria um aviso para cada turma ativa, quando o prazo do bloco cair nos próximos `dias` dias.
// Não repete: se o aviso daquele bloco e prazo já existe na turma, pula.
// É chamado por um agendador externo (ver POST /api/integracoes/lembretes-prazo).
async function enviarLembretesPrazo({ dias = 3 } = {}) {
  const hoje = hojeEmBrasilia();
  const { rows: blocos } = await query(
    `select b.title as bloco, to_char(b.ends_at, 'DD/MM/YYYY') as prazo,
            c.id as curso_id, c.title as curso, c.created_by
       from course_blocks b join courses c on c.id = b.course_id
      where b.ends_at is not null
        and b.ends_at >= $1::date
        and b.ends_at <= $1::date + $2::int`,
    [hoje, dias]
  );

  let criados = 0;
  for (const bloco of blocos) {
    if (!bloco.created_by) continue;
    const { rows: turmas } = await query('select id from turmas where curso_id = $1 and ativa', [bloco.curso_id]);
    for (const turma of turmas) {
      const titulo = `Prazo do bloco "${bloco.bloco}": ${bloco.prazo}`;
      const { rowCount } = await query('select 1 from turma_posts where turma_id = $1 and titulo = $2', [turma.id, titulo]);
      if (rowCount) continue;
      await query(
        `insert into turma_posts (turma_id, curso_id, autor_id, tipo, titulo, corpo)
         values ($1, $2, $3, 'aviso', $4, $5)`,
        [
          turma.id,
          bloco.curso_id,
          bloco.created_by,
          titulo,
          `Aviso automático: o bloco "${bloco.bloco}" do curso "${bloco.curso}" termina em ${bloco.prazo}. Confira as aulas e atividades que ainda faltam.`
        ]
      );
      criados += 1;
    }
  }
  return { hoje, blocosNaJanela: blocos.length, avisosCriados: criados };
}

module.exports = { enviarLembretesPrazo };
