const { query, withTransaction } = require('./pool');

// Presença das turmas: a aula (attendance_sessions com turma_id) é do dia, e o aluno marca a própria presença
// só no dia da aula. Depois que o dia termina, quem não marcou fica ausente (ver fecharAulasVencidas).

const ALUNO_NA_TURMA = `
  join presenca_participantes pp on pp.session_id = s.id and pp.user_id = $1
  left join turmas t on t.id = s.turma_id
  left join course_groups g on g.id = s.group_id`;

const JUSTIFICATIVA_ATUAL = `
  left join lateral (
    select j.id, j.motivo, j.status, j.resposta, j.created_at
      from attendance_justifications j
     where j.session_id = s.id and j.user_id = $1
     order by j.created_at desc
     limit 1
  ) j on true`;

function dateOf(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

// Fecha as aulas de turmas cujo dia já passou e lança "ausente" para os alunos ativos sem marcação.
// Idempotente: pode ser chamada a cada leitura relevante sem efeito colateral extra.
async function fecharAulasVencidas(hoje) {
  const { rowCount } = await query(
    `with vencidas as (
       select id from attendance_sessions
        where (turma_id is not null or group_id is not null) and fechada = false and status_aula = 'ativa' and session_date < $1::date
     ),
     faltas as (
       insert into attendance_records (session_id, user_id, status, note, origem, marcado_em)
       select s.id, pp.user_id, 'ausente', '', 'automatico', now()
         from attendance_sessions s
         join vencidas v on v.id = s.id
         join presenca_participantes pp on pp.session_id = s.id
       on conflict (session_id, user_id) do nothing
       returning 1
     )
     update attendance_sessions set fechada = true where id in (select id from vencidas)`,
    [hoje]
  );
  return rowCount;
}

// Aulas de hoje do aluno (todas as turmas em que está ativo), com a marcação atual.
async function aulasDoDia(userId, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.title, coalesce(t.nome, g.name) as turma, r.status, r.tipo_justificativa, r.origem,
            j.id as justificativa_id, j.status as justificativa_status
       from attendance_sessions s
       ${ALUNO_NA_TURMA}
       left join attendance_records r on r.session_id = s.id and r.user_id = $1
       ${JUSTIFICATIVA_ATUAL}
      where s.session_date = $2::date and s.status_aula = 'ativa'
      order by coalesce(t.nome, g.name), s.title, s.id`,
    [userId, hoje]
  );
  return rows.map(mapAula);
}

// Histórico do aluno: aulas já realizadas (até hoje), mais recentes primeiro.
async function historicoDoAluno(userId, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.title, coalesce(t.nome, g.name) as turma, r.status, r.tipo_justificativa, r.origem,
            j.id as justificativa_id, j.status as justificativa_status, j.motivo, j.resposta
       from attendance_sessions s
       ${ALUNO_NA_TURMA}
       left join attendance_records r on r.session_id = s.id and r.user_id = $1
       ${JUSTIFICATIVA_ATUAL}
      where s.session_date <= $2::date and s.status_aula = 'ativa'
      order by s.session_date desc, coalesce(t.nome, g.name), s.id
      limit 500`,
    [userId, hoje]
  );
  return rows.map((row) => ({
    ...mapAula(row),
    motivo: row.motivo || '',
    resposta: row.resposta || ''
  }));
}

function mapAula(row) {
  return {
    sessionId: row.id,
    date: dateOf(row.session_date),
    title: row.title || '',
    turma: row.turma,
    status: row.status || null,
    tipoJustificativa: row.tipo_justificativa || null,
    origem: row.origem || null,
    justificativa: row.justificativa_id
      ? { id: row.justificativa_id, status: row.justificativa_status }
      : null
  };
}

// Marcação do próprio aluno. Só no dia da aula, só se ainda não houver registro.
// Devolve 'ok', 'fora_da_turma', 'fora_do_dia' ou 'ja_registrada'.
async function marcarPresenca(userId, sessionId, hoje) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `select s.session_date
         from attendance_sessions s
         ${ALUNO_NA_TURMA.replace(/\$1/g, '$2')}
        where s.id = $1 and s.status_aula = 'ativa'`,
      [sessionId, userId]
    );
    if (!rows[0]) return 'fora_da_turma';
    if (dateOf(rows[0].session_date) !== hoje) return 'fora_do_dia';

    const inserted = await client.query(
      `insert into attendance_records (session_id, user_id, status, note, origem, marcado_em, recorded_by)
       values ($1, $2, 'presente', '', 'aluno', now(), $2)
       on conflict (session_id, user_id) do nothing
       returning user_id`,
      [sessionId, userId]
    );
    return inserted.rowCount ? 'ok' : 'ja_registrada';
  });
}

// Justificativa de falta: só para aula em que o registro está como ausente, e só uma por aula.
// Devolve 'ok', 'fora_da_turma', 'sem_falta' ou 'ja_enviada'.
async function criarJustificativa(userId, sessionId, motivo) {
  return withTransaction(async (client) => {
    const { rows: aula } = await client.query(
      `select s.id from attendance_sessions s ${ALUNO_NA_TURMA.replace(/\$1/g, '$2')} where s.id = $1`,
      [sessionId, userId]
    );
    if (!aula[0]) return { resultado: 'fora_da_turma' };

    const { rows: registro } = await client.query(
      'select status from attendance_records where session_id = $1 and user_id = $2',
      [sessionId, userId]
    );
    if (!registro[0] || registro[0].status !== 'ausente') return { resultado: 'sem_falta' };

    const { rows: existentes } = await client.query(
      'select id from attendance_justifications where session_id = $1 and user_id = $2 limit 1',
      [sessionId, userId]
    );
    if (existentes[0]) return { resultado: 'ja_enviada' };

    const { rows } = await client.query(
      `insert into attendance_justifications (session_id, user_id, motivo)
       values ($1, $2, $3) returning id, status, created_at`,
      [sessionId, userId, motivo]
    );
    return { resultado: 'ok', justificativa: rows[0] };
  });
}

// Lista de justificativas para a gestão, filtrada por situação (pendente por padrão).
async function listarJustificativas(status) {
  const filtro = status && status !== 'todas' ? 'where j.status = $1' : '';
  const params = status && status !== 'todas' ? [status] : [];
  const { rows } = await query(
    `select j.id, j.motivo, j.status, j.resposta, j.created_at, j.decided_at,
            s.session_date, s.title, t.nome as turma, c.title as curso,
            u.name as aluno, u.email, u.cpf_last2
       from attendance_justifications j
       join attendance_sessions s on s.id = j.session_id
       join users u on u.id = j.user_id
       left join turmas t on t.id = s.turma_id
       join courses c on c.id = s.course_id
       ${filtro}
      order by j.created_at desc
      limit 500`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    motivo: row.motivo,
    status: row.status,
    resposta: row.resposta,
    criadaEm: row.created_at,
    decididaEm: row.decided_at,
    aula: { date: dateOf(row.session_date), title: row.title || '' },
    turma: row.turma || '',
    curso: row.curso,
    aluno: row.aluno,
    email: row.email,
    cpfMasked: row.cpf_last2 ? `***.***.***-${row.cpf_last2}` : ''
  }));
}

// Decisão da gestão sobre uma justificativa pendente.
// aceitar: falta justificada (conta como presença, com sinal de justificada).
// abonar: falta abonada (conta como presença, com sinal de abonada).
// recusar: a falta continua.
async function decidirJustificativa(justificativaId, { decisao, resposta }, adminId) {
  const mapa = {
    aceitar: { status: 'aceita', registro: 'justificado', tipo: 'aceita' },
    abonar: { status: 'abonada', registro: 'justificado', tipo: 'abonada' },
    recusar: { status: 'recusada', registro: null, tipo: null }
  };
  const alvo = mapa[decisao];
  if (!alvo) return { resultado: 'decisao_invalida' };

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `update attendance_justifications
          set status = $2, resposta = $3, decided_by = $4, decided_at = now()
        where id = $1 and status = 'pendente'
        returning session_id, user_id`,
      [justificativaId, alvo.status, String(resposta || '').slice(0, 1000), adminId]
    );
    if (!rows[0]) return { resultado: 'nao_pendente' };

    const { session_id: sessionId, user_id: userId } = rows[0];
    if (alvo.registro) {
      await client.query(
        `insert into attendance_records (session_id, user_id, status, note, origem, tipo_justificativa, recorded_by, marcado_em)
         values ($1, $2, 'justificado', '', 'gestao', $3, $4, now())
         on conflict (session_id, user_id)
         do update set status = 'justificado', tipo_justificativa = excluded.tipo_justificativa,
                       origem = 'gestao', recorded_by = excluded.recorded_by, marcado_em = now()`,
        [sessionId, userId, alvo.tipo, adminId]
      );
    }
    return { resultado: 'ok', status: alvo.status };
  });
}

// Turmas para a gestão escolher no calendário, com o total de alunos ativos.
async function listarTurmasGestao() {
  const { rows } = await query(
    `select t.id, t.nome, t.modalidade, t.turno, t.horario, t.ativa, c.title as curso,
            (select count(*) from turma_alunos ta join matriculas m on m.id = ta.matricula_id
              where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo')::int as alunos
       from turmas t
       join courses c on c.id = t.curso_id
      order by t.ativa desc, c.title, t.nome`
  );
  return rows;
}

// Aulas da turma com a contagem de presença. Situação: realizada quando o dia já passou ou a aula foi fechada.
async function aulasDaTurma(turmaId, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.horario, s.modulo, s.title, s.professor, s.fechada, s.origem, s.status_aula, s.tipo, s.professor_id,
            (select count(*) from attendance_records r where r.session_id = s.id and r.status = 'presente')::int as presentes,
            (select count(*) from attendance_records r where r.session_id = s.id and r.status = 'justificado')::int as justificadas,
            (select count(*) from attendance_records r where r.session_id = s.id and r.status = 'ausente')::int as ausentes,
            (select count(*) from attendance_records r where r.session_id = s.id)::int as marcadas,
            (select count(*) from turma_alunos ta join matriculas m on m.id = ta.matricula_id
              where ta.turma_id = s.turma_id and ta.situacao = 'ativo' and m.situacao = 'ativo')::int as matriculados
       from attendance_sessions s
      where s.turma_id = $1
      order by s.session_date, s.horario, s.id`,
    [turmaId]
  );
  return rows.map((row) => ({
    sessionId: row.id,
    date: dateOf(row.session_date),
    horario: row.horario || '',
    modulo: row.modulo || '',
    titulo: row.title || '',
    professor: row.professor || '',
    origem: row.origem,
    situacao: row.status_aula === 'cancelada' ? 'cancelada' : row.fechada || dateOf(row.session_date) < hoje ? 'realizada' : 'prevista',
    tipo: row.tipo,
    professorId: row.professor_id,
    presentes: row.presentes,
    justificadas: row.justificadas,
    ausentes: row.ausentes,
    marcadas: row.marcadas,
    matriculados: row.matriculados
  }));
}

// Cronograma do aluno: todas as aulas das turmas em que ele está ativo, com a presença dele.
async function cronogramaDoAluno(userId, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.horario, s.modulo, s.title, s.professor, s.fechada, s.status_aula,
            coalesce(t.nome, g.name) as turma, c.title as curso, r.status, r.tipo_justificativa
       from attendance_sessions s
       ${ALUNO_NA_TURMA}
       join courses c on c.id = s.course_id
       left join attendance_records r on r.session_id = s.id and r.user_id = $1
      order by s.session_date, s.horario, c.title, coalesce(t.nome, g.name), s.id
      limit 1000`,
    [userId]
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
      turma: row.turma,
      curso: row.curso,
      situacao,
      status: row.status || null,
      tipoJustificativa: row.tipo_justificativa || null
    };
  });
}

module.exports = {
  listarTurmasGestao,
  aulasDaTurma,
  cronogramaDoAluno,
  fecharAulasVencidas,
  aulasDoDia,
  historicoDoAluno,
  marcarPresenca,
  criarJustificativa,
  listarJustificativas,
  decidirJustificativa
};
