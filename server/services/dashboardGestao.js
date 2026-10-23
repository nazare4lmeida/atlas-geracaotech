// Visão geral da gestão: números resumidos e dados para os gráficos. Só leitura.
const { query } = require('../db/pool');

async function resumoGestao() {
  const kpis = await query(
    `select
       (select count(*) from matriculas where situacao = 'ativo')::int as alunos_ativos,
       (select count(*) from matriculas)::int as matriculados,
       (select count(*) from matriculas where situacao = 'desistente')::int as desistentes,
       (select count(*) from matriculas where situacao = 'concluido')::int as concluidos,
       (select count(*) from certificates)::int as certificados,
       (select count(*) from attendance_justifications where status = 'pendente')::int as justificativas_pendentes,
       (select count(*) from turmas where ativa = true)::int as turmas_ativas,
       (select count(*) from atendimento_sessoes where status = 'aberto')::int as chamados_abertos`
  );

  const presenca30 = await query(
    `select
       count(*) filter (where r.status in ('presente','justificado'))::int as presentes,
       count(*)::int as total
     from attendance_records r
     join attendance_sessions s on s.id = r.session_id
     where s.session_date between current_date - 30 and current_date`
  );

  // Matrículas por mês, nos últimos 12 meses (inclusive meses sem matrícula).
  const porMes = await query(
    `select to_char(m.mes, 'MM/YY') as label, count(ma.id)::int as value
       from generate_series(date_trunc('month', current_date) - interval '11 months', date_trunc('month', current_date), interval '1 month') as m(mes)
       left join matriculas ma on date_trunc('month', ma.data_matricula) = m.mes
      group by m.mes
      order by m.mes`
  );

  const situacao = await query(
    `select situacao as label, count(*)::int as value from matriculas group by situacao order by situacao`
  );

  const porCurso = await query(
    `select c.title as label, count(m.id) filter (where m.situacao = 'ativo')::int as value
       from courses c
       left join matriculas m on m.curso_id = c.id
      group by c.id, c.title
     having count(m.id) > 0
      order by value desc, c.title
      limit 8`
  );

  // Presença das últimas 10 aulas de turma (percentual de presença e justificadas sobre os registros).
  const presencaAulas = await query(
    `select to_char(s.session_date, 'DD/MM') as label,
            s.session_date,
            count(r.user_id) filter (where r.status in ('presente','justificado'))::int as presentes,
            count(r.user_id)::int as registros
       from attendance_sessions s
       join attendance_records r on r.session_id = s.id
      where s.turma_id is not null and s.session_date <= current_date
      group by s.id, s.session_date
      order by s.session_date desc
      limit 10`
  );

  const justificativas = await query(
    `select status as label, count(*)::int as value from attendance_justifications group by status order by status`
  );

  const k = kpis.rows[0];
  const p = presenca30.rows[0];
  return {
    kpis: {
      ...k,
      presencaUltimos30Dias: p.total ? Math.round((p.presentes / p.total) * 100) : null
    },
    graficos: {
      matriculasPorMes: porMes.rows,
      situacao: situacao.rows,
      porCurso: porCurso.rows,
      presencaAulas: presencaAulas.rows.reverse().map((row) => ({
        label: row.label,
        value: row.registros ? Math.round((row.presentes / row.registros) * 100) : 0
      })),
      justificativas: justificativas.rows
    }
  };
}

module.exports = { resumoGestao };