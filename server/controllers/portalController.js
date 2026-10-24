const { query } = require("../db/pool");

// Portal do aluno: turma atual e datas. Só matrículas ativas e turmas ativas.
exports.turmaAtual = async (req, res) => {
  const { rows } = await query(
    `select t.id, t.nome, t.modalidade, t.turno, t.dias_semana, t.horario,
            t.data_inicio, t.data_fim, s.nome as sede, c.title as curso
       from turma_alunos ta
       join matriculas m on m.id = ta.matricula_id and m.situacao = 'ativo' and m.user_id = $1
       join turmas t on t.id = ta.turma_id and t.ativa and ta.situacao = 'ativo'
       join courses c on c.id = t.curso_id
       left join sedes s on s.id = t.sede_id
      order by t.data_inicio desc nulls last`,
    [req.user.id]
  );
  return res.json({
    turmas: rows.map((t) => ({
      id: t.id,
      nome: t.nome,
      curso: t.curso,
      modalidade: t.modalidade,
      turno: t.turno,
      diasSemana: t.dias_semana,
      horario: t.horario,
      sede: t.sede || "",
      dataInicio: t.data_inicio,
      dataFim: t.data_fim,
    })),
  });
};

// Documentos: termo de matrícula e aditivos de cada matrícula do aluno.
// Os links vêm de matricula_termos, que é o que a sincronização com o site do GT vai preencher.
exports.documentos = async (req, res) => {
  const { rows } = await query(
    `select m.id as matricula_id, c.title as curso, m.data_matricula, m.situacao,
            t.tipo, t.numero, t.link, t.data_assinatura
       from matriculas m
       join courses c on c.id = m.curso_id
       left join matricula_termos t on t.matricula_id = m.id
      where m.user_id = $1
      order by m.data_matricula desc, t.tipo, t.numero`,
    [req.user.id]
  );

  const porMatricula = new Map();
  for (const row of rows) {
    if (!porMatricula.has(row.matricula_id)) {
      porMatricula.set(row.matricula_id, {
        id: row.matricula_id,
        curso: row.curso,
        dataMatricula: row.data_matricula,
        situacao: row.situacao,
        termos: [],
      });
    }
    if (row.tipo) {
      porMatricula.get(row.matricula_id).termos.push({
        tipo: row.tipo,
        numero: row.numero,
        link: row.link || "",
        dataAssinatura: row.data_assinatura,
      });
    }
  }
  return res.json({ matriculas: [...porMatricula.values()] });
};
