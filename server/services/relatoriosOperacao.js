// Relatórios da operação do Geração Tech (aba Relatórios do site, levada para o Atlas).
// Os dados vêm das matrículas, turmas e presença sincronizadas do site e do próprio Atlas.
const { query } = require('../db/pool');
const { hashCpf, digitsOf } = require('./cpf');

const SITUACOES = ['ativo', 'concluido', 'desistente', 'removido'];

// Marcos do período: matriculados (data da matrícula no período), desistentes (situação atual),
// aulas e presenças (presença e justificada/abonada contam como presença) das aulas do período.
async function marcos({ de, ate }) {
  const { rows } = await query(
    `select
       (select count(*) from matriculas where data_matricula between $1::date and $2::date)::int as matriculados,
       (select count(*) from matriculas where situacao = 'desistente')::int as desistentes,
       (select count(*) from attendance_sessions where session_date between $1::date and $2::date)::int as aulas,
       (select count(*) from attendance_records r
          join attendance_sessions s on s.id = r.session_id
         where s.session_date between $1::date and $2::date
           and r.status in ('presente', 'justificado'))::int as presencas`,
    [de, ate]
  );
  const row = rows[0];
  return {
    periodo: { de, ate },
    matriculados: row.matriculados,
    desistentes: row.desistentes,
    aulas: row.aulas,
    presencas: row.presencas
  };
}

// Lista de alunos com filtros: busca (nome, e-mail ou CPF), curso, modalidade, turno e situação.
async function listaAlunos({ q = '', cursoId = null, modalidade = '', turno = '', situacao = 'todos' }) {
  const cpfDigits = digitsOf(q);
  const cpfHash = cpfDigits.length === 11 ? hashCpf(cpfDigits) : null;
  const { rows } = await query(
    `select m.id, m.nome, m.email, m.cpf_last2, m.modalidade, m.turno, m.situacao, m.data_matricula,
            c.title as curso,
            (select t.nome from turma_alunos ta join turmas t on t.id = ta.turma_id
              where ta.matricula_id = m.id and ta.situacao = 'ativo'
              order by t.nome limit 1) as turma
       from matriculas m
       join courses c on c.id = m.curso_id
      where ($1 = '' or m.nome ilike '%' || $1 || '%' or m.email ilike '%' || $1 || '%' or ($2::text is not null and m.cpf_hash = $2))
        and ($3::uuid is null or m.curso_id = $3::uuid)
        and ($4 = '' or m.modalidade = $4)
        and ($5 = '' or m.turno = $5)
        and ($6 = 'todos' or m.situacao = $6)
      order by m.nome
      limit 5000`,
    [q.trim(), cpfHash, cursoId, modalidade, turno, situacao]
  );

  const resumo = await query(
    `select situacao, count(*)::int as total from matriculas group by situacao`
  );
  const contagem = Object.fromEntries(SITUACOES.map((item) => [item, 0]));
  for (const row of resumo.rows) contagem[row.situacao] = row.total;

  return {
    resumo: { total: Object.values(contagem).reduce((a, b) => a + b, 0), ...contagem },
    alunos: rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      cpfMasked: row.cpf_last2 ? `***.***.***-${row.cpf_last2}` : '',
      curso: row.curso,
      modalidade: row.modalidade,
      turno: row.turno,
      turma: row.turma || '',
      situacao: row.situacao,
      dataMatricula: row.data_matricula instanceof Date ? row.data_matricula.toISOString().slice(0, 10) : row.data_matricula
    }))
  };
}

module.exports = { marcos, listaAlunos, SITUACOES };
