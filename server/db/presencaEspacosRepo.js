const { query, withTransaction } = require('./pool');

// Presença de qualquer espaço (turma ou grupo de curso), com a mesma regra de participação em todos os lugares.
// A chamada, o cancelamento e a remoção de aula funcionam igual para os dois tipos.

const EQUIPE_GLOBAL = ['admin', 'gestao'];

function dateOf(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function colunaDoEspaco(tipo) {
  return tipo === 'grupo' ? 's.group_id' : 's.turma_id';
}

// Quem pode ver e quem pode gerenciar (chamada, cancelar, criar e remover aulas) cada espaço.
async function acessoEspaco(user, tipo, id) {
  if (user.role === 'admin') {
    const existe = await espacoExiste(tipo, id);
    return existe ? { ver: true, gerenciar: true, cursoId: existe.curso_id, nome: existe.nome } : null;
  }
  if (user.role === 'gestao') {
    const existe = await espacoExiste(tipo, id);
    return existe ? { ver: true, gerenciar: false, cursoId: existe.curso_id, nome: existe.nome } : null;
  }
  if (user.role !== 'teacher') return null;
  const existe = await espacoExiste(tipo, id, user.id);
  if (!existe || !existe.professor) return null;
  return { ver: true, gerenciar: true, cursoId: existe.curso_id, nome: existe.nome };
}

async function espacoExiste(tipo, id, userId = null) {
  if (tipo === 'grupo') {
    const { rows } = await query(
      `select g.id, g.name as nome, g.course_id as curso_id,
              $2::uuid is not null and exists (
                select 1 from enrollments e where e.course_id = g.course_id and e.user_id = $2
                  and e.role = 'teacher' and e.status = 'active') as professor
         from course_groups g where g.id = $1`,
      [id, userId]
    );
    return rows[0] || null;
  }
  const { rows } = await query(
    `select t.id, t.nome, t.curso_id,
            $2::uuid is not null and exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $2) as professor
       from turmas t where t.id = $1`,
    [id, userId]
  );
  return rows[0] || null;
}

// Espaço da aula: devolve o tipo e o id dela, para checar a permissão.
async function espacoDaAula(sessionId) {
  const { rows } = await query(`select turma_id, group_id from attendance_sessions where id = $1`, [sessionId]);
  if (!rows[0]) return null;
  return rows[0].group_id ? { tipo: 'grupo', id: rows[0].group_id } : { tipo: 'turma', id: rows[0].turma_id };
}

// Espaços que a pessoa gerencia ou acompanha.
async function listarEspacos(user) {
  const global = EQUIPE_GLOBAL.includes(user.role);
  const turmas = await query(
    `select t.id, t.nome, t.modalidade, t.ativa, c.title as curso, c.id as curso_id,
            (select count(*)::int from turma_alunos ta join matriculas m on m.id = ta.matricula_id
              where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo') as alunos,
            (select count(*)::int from attendance_sessions s where s.turma_id = t.id) as aulas
       from turmas t join courses c on c.id = t.curso_id
      where ($1::boolean or exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $2))
      order by t.ativa desc, c.title, t.nome`,
    [global, user.id]
  );
  const grupos = await query(
    `select g.id, g.name as nome, c.title as curso, c.id as curso_id,
            (select count(*)::int from group_members gm where gm.group_id = g.id) as alunos,
            (select count(*)::int from attendance_sessions s where s.group_id = g.id) as aulas
       from course_groups g join courses c on c.id = g.course_id
      where ($1::boolean or exists (
              select 1 from enrollments e where e.course_id = g.course_id and e.user_id = $2
                and e.role = 'teacher' and e.status = 'active'))
      order by c.title, g.name`,
    [global, user.id]
  );
  return {
    turmas: turmas.rows.map((r) => ({ id: r.id, nome: r.nome, modalidade: r.modalidade, ativa: r.ativa, curso: r.curso, cursoId: r.curso_id, alunos: r.alunos, aulas: r.aulas, tipo: 'turma' })),
    grupos: grupos.rows.map((r) => ({ id: r.id, nome: r.nome, modalidade: 'Grupo', ativa: true, curso: r.curso, cursoId: r.curso_id, alunos: r.alunos, aulas: r.aulas, tipo: 'grupo' }))
  };
}

// Aulas do espaço com a contagem de presença, no formato usado pela tela de presença.
async function aulasDoEspaco(tipo, id, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.title, s.horario, s.modulo, s.professor, s.status_aula, s.fechada,
            (select count(*)::int from presenca_participantes pp where pp.session_id = s.id) as matriculados,
            count(r.session_id) filter (where r.status is not null)::int as marcadas,
            count(r.session_id) filter (where r.status = 'presente')::int as presentes,
            count(r.session_id) filter (where r.status = 'justificado')::int as justificadas,
            count(r.session_id) filter (where r.status = 'ausente')::int as ausentes
       from attendance_sessions s
       left join attendance_records r on r.session_id = s.id
      where ${colunaDoEspaco(tipo)} = $1
      group by s.id
      order by s.session_date, s.horario, s.id
      limit 1000`,
    [id]
  );
  return rows.map((row) => {
    const date = dateOf(row.session_date);
    const situacao = row.status_aula === 'cancelada' ? 'cancelada' : row.fechada || date < hoje ? 'realizada' : 'prevista';
    return {
      sessionId: row.id,
      date,
      horario: row.horario || '',
      modulo: row.modulo || '',
      titulo: row.title || '',
      professor: row.professor || '',
      situacao,
      fechada: row.fechada,
      matriculados: row.matriculados,
      marcadas: row.marcadas,
      presentes: row.presentes,
      justificadas: row.justificadas,
      ausentes: row.ausentes
    };
  });
}

// Cria aula avulsa. Na turma não repete a data; no grupo, sim (um grupo pode ter mais de uma aula no dia).
async function criarAula(tipo, id, { data, titulo, horario }) {
  return withTransaction(async (client) => {
    if (tipo === 'turma') {
      const ocupada = await client.query(`select 1 from attendance_sessions where turma_id = $1 and session_date = $2::date`, [id, data]);
      if (ocupada.rowCount) return { erro: 'data_ocupada' };
      const { rows } = await client.query(
        `insert into attendance_sessions (course_id, turma_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo)
         select t.curso_id, t.id, $2::date, $3, coalesce(nullif($4, ''), t.horario, ''), '',
                coalesce((select string_agg(u.name, ', ' order by u.name) from turma_professores tp join users u on u.id = tp.user_id where tp.turma_id = t.id), ''),
                'atlas', 'ativa', 'regular'
           from turmas t where t.id = $1
         returning id`,
        [id, data, titulo || '', horario || '']
      );
      return rows[0] ? { id: rows[0].id } : { erro: 'espaco_inexistente' };
    }
    const { rows } = await client.query(
      `insert into attendance_sessions (course_id, group_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo)
       select g.course_id, g.id, $2::date, $3, $4, '', '', 'atlas', 'ativa', 'regular'
         from course_groups g where g.id = $1
       returning id`,
      [id, data, titulo || '', horario || '']
    );
    return rows[0] ? { id: rows[0].id } : { erro: 'espaco_inexistente' };
  });
}

async function definirCancelamento(sessionId, cancelada) {
  const { rowCount } = await query(`update attendance_sessions set status_aula = $2 where id = $1`, [sessionId, cancelada ? 'cancelada' : 'ativa']);
  return rowCount ? 'ok' : 'inexistente';
}

// Remoção só sem registros de presença. Com registros, a aula deve ser cancelada.
async function removerAula(sessionId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `select (select count(*) from attendance_records where session_id = $1)::int as registros,
              exists (select 1 from attendance_sessions where id = $1) as existe`,
      [sessionId]
    );
    if (!rows[0].existe) return 'inexistente';
    if (rows[0].registros > 0) return 'com_registros';
    await client.query('delete from attendance_sessions where id = $1', [sessionId]);
    return 'ok';
  });
}

async function presencaDaAula(sessionId) {
  const { rows } = await query(
    `select pp.user_id, u.name, coalesce(r.status, '') as status, coalesce(r.origem, '') as origem,
            coalesce(r.tipo_justificativa, '') as tipo_justificativa
       from presenca_participantes pp
       join users u on u.id = pp.user_id
       left join attendance_records r on r.session_id = pp.session_id and r.user_id = pp.user_id
      where pp.session_id = $1
      order by u.name`,
    [sessionId]
  );
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    status: row.status || null,
    origem: row.origem || null,
    tipoJustificativa: row.tipo_justificativa || null
  }));
}

// Marca ou limpa (status null) a presença de quem participa da aula.
async function marcarPresenca(sessionId, userId, status, gestorId) {
  return withTransaction(async (client) => {
    const participa = await client.query(
      `select 1 from presenca_participantes where session_id = $1 and user_id = $2`,
      [sessionId, userId]
    );
    if (!participa.rowCount) return 'fora_da_aula';
    if (status === null) {
      await client.query('delete from attendance_records where session_id = $1 and user_id = $2', [sessionId, userId]);
      return 'ok';
    }
    await client.query(
      `insert into attendance_records (session_id, user_id, status, note, origem, marcado_em, recorded_by, tipo_justificativa)
       values ($1, $2, $3, '', 'gestao', now(), $4, case when $3 = 'justificado' then 'aceita' else null end)
       on conflict (session_id, user_id) do update
         set status = excluded.status, origem = 'gestao', marcado_em = now(), recorded_by = excluded.recorded_by,
             tipo_justificativa = excluded.tipo_justificativa`,
      [sessionId, userId, status, gestorId]
    );
    return 'ok';
  });
}

// Relatório de presença por aluno e espaço, com filtros. Professor vê só os espaços em que leciona.
async function relatorio(filtros, hoje, escopoProfessorId) {
  const { rows } = await query(
    `with sessoes as (
       select s.id, s.session_date, s.course_id,
              case when s.turma_id is not null then 'turma' else 'grupo' end as tipo,
              coalesce(s.turma_id, s.group_id) as espaco_id,
              coalesce(t.nome, g.name) as espaco,
              coalesce(t.modalidade, 'Grupo') as modalidade,
              c.title as curso
         from attendance_sessions s
         join courses c on c.id = s.course_id
         left join turmas t on t.id = s.turma_id
         left join course_groups g on g.id = s.group_id
        where s.status_aula = 'ativa' and s.session_date <= $1::date
          and ($2::uuid is null or s.course_id = $2)
          and ($3::text is null or (case when s.turma_id is not null then 'turma' else 'grupo' end) = $3)
          and ($4::text is null or coalesce(t.modalidade, 'Grupo') = $4)
          and ($5::date is null or s.session_date >= $5::date)
          and ($6::date is null or s.session_date <= $6::date)
          and ($7::uuid is null or (
                (s.turma_id is not null and exists (select 1 from turma_professores tp where tp.turma_id = s.turma_id and tp.user_id = $7))
             or (s.group_id is not null and exists (select 1 from enrollments e where e.course_id = s.course_id and e.user_id = $7 and e.role = 'teacher' and e.status = 'active'))))
     )
     select se.tipo, se.espaco_id, se.espaco, se.modalidade, se.curso,
            u.id as user_id, u.name, u.email,
            count(distinct se.id)::int as aulas,
            count(r.session_id) filter (where r.status = 'presente')::int as presentes,
            count(r.session_id) filter (where r.status = 'justificado' and r.tipo_justificativa = 'aceita')::int as justificadas,
            count(r.session_id) filter (where r.status = 'justificado' and r.tipo_justificativa = 'abonada')::int as abonadas,
            count(r.session_id) filter (where r.status = 'ausente')::int as faltas
       from sessoes se
       join presenca_participantes pp on pp.session_id = se.id
       join users u on u.id = pp.user_id
       left join attendance_records r on r.session_id = se.id and r.user_id = pp.user_id
      where ($8::text is null or u.name ilike '%' || $8 || '%' or u.email ilike '%' || $8 || '%' or se.espaco ilike '%' || $8 || '%')
      group by se.tipo, se.espaco_id, se.espaco, se.modalidade, se.curso, u.id, u.name, u.email
      order by se.curso, se.espaco, u.name
      limit 5000`,
    [
      hoje,
      filtros.cursoId || null,
      filtros.tipo || null,
      filtros.modalidade || null,
      filtros.de || null,
      filtros.ate || null,
      escopoProfessorId || null,
      filtros.busca || null
    ]
  );
  return rows.map((row) => {
    const contam = row.presentes + row.justificadas + row.abonadas;
    return {
      tipo: row.tipo,
      espacoId: row.espaco_id,
      espaco: row.espaco,
      modalidade: row.modalidade,
      curso: row.curso,
      userId: row.user_id,
      nome: row.name,
      email: row.email,
      aulas: row.aulas,
      presentes: row.presentes,
      justificadas: row.justificadas,
      abonadas: row.abonadas,
      faltas: row.faltas,
      percentual: row.aulas ? Math.round((contam / row.aulas) * 100) : null
    };
  });
}

module.exports = {
  acessoEspaco,
  espacoDaAula,
  listarEspacos,
  aulasDoEspaco,
  criarAula,
  definirCancelamento,
  removerAula,
  presencaDaAula,
  marcarPresenca,
  relatorio
};
