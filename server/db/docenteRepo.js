const { query, withTransaction } = require('./pool');
const { aulasDaTurma } = require('./presencaRepo');
const { diasDaTurma, datasDeAula, feriadosNoPeriodo, janelaDaAula, situacaoJanela } = require('../utils/periodo');

// Área do professor: vínculo com turmas, cronograma (portado do GT), presença por aula, ponto e arquivos.

const MAX_DIAS_GERACAO = 400;

function dateOf(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function mapTurma(row) {
  return {
    id: row.id,
    nome: row.nome,
    cursoId: row.curso_id,
    curso: row.curso,
    modalidade: row.modalidade,
    turno: row.turno || '',
    diasSemana: row.dias_semana || '',
    horario: row.horario || '',
    dataInicio: dateOf(row.data_inicio),
    dataFim: dateOf(row.data_fim),
    ativa: row.ativa,
    linkAoVivo: row.link_ao_vivo || ''
  };
}

// ---------- Vínculo professor–turma ----------

// Link da aula ao vivo da turma (vazio remove).
async function definirLinkTurma(turmaId, link) {
  const { rowCount } = await query('update turmas set link_ao_vivo = $2 where id = $1', [turmaId, link]);
  return rowCount ? 'ok' : 'turma_inexistente';
}

async function professorDaTurma(userId, turmaId) {
  const { rowCount } = await query(
    'select 1 from turma_professores where turma_id = $1 and user_id = $2',
    [turmaId, userId]
  );
  return rowCount > 0;
}

async function turmaDaAula(sessionId) {
  const { rows } = await query('select turma_id from attendance_sessions where id = $1', [sessionId]);
  return rows[0]?.turma_id || null;
}

async function turmasDoProfessor(userId) {
  const { rows } = await query(
    `select t.id, t.nome, t.curso_id, t.modalidade, t.turno, t.dias_semana, t.horario, t.data_inicio, t.data_fim, t.ativa, t.link_ao_vivo,
            c.title as curso
       from turma_professores tp
       join turmas t on t.id = tp.turma_id
       join courses c on c.id = t.curso_id
      where tp.user_id = $1
      order by t.ativa desc, c.title, t.nome`,
    [userId]
  );
  return rows.map(mapTurma);
}

// Todas as turmas (administração), com os dados que o formulário de cronograma precisa.
async function todasAsTurmas() {
  const { rows } = await query(
    `select t.id, t.nome, t.curso_id, t.modalidade, t.turno, t.dias_semana, t.horario, t.data_inicio, t.data_fim, t.ativa, t.link_ao_vivo,
            c.title as curso,
            (select count(*) from turma_alunos ta join matriculas m on m.id = ta.matricula_id
              where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo')::int as alunos
       from turmas t
       join courses c on c.id = t.curso_id
      order by t.ativa desc, c.title, t.nome`
  );
  return rows.map((row) => ({ ...mapTurma(row), alunos: row.alunos }));
}

async function professoresDaTurma(turmaId) {
  const { rows } = await query(
    `select u.id, u.name
       from turma_professores tp
       join users u on u.id = tp.user_id
      where tp.turma_id = $1
      order by u.name`,
    [turmaId]
  );
  return rows;
}

async function listarProfessores() {
  const { rows } = await query(
    `select id, name from users where role = 'teacher' and active = true order by name`
  );
  return rows;
}

// Substitui a lista de professores da turma. Só contas com papel de professor entram.
async function definirProfessoresTurma(turmaId, userIds) {
  return withTransaction(async (client) => {
    const turma = await client.query('select curso_id from turmas where id = $1', [turmaId]);
    if (!turma.rows[0]) return 'turma_inexistente';
    const cursoId = turma.rows[0].curso_id;
    const anteriores = (await client.query('select user_id from turma_professores where turma_id = $1', [turmaId])).rows.map((r) => r.user_id);
    await client.query('delete from turma_professores where turma_id = $1', [turmaId]);
    if (userIds.length) {
      await client.query(
        `insert into turma_professores (turma_id, user_id)
         select $1, u.id from users u where u.id = any($2::uuid[]) and u.role = 'teacher'
         on conflict do nothing`,
        [turmaId, userIds]
      );
    }
    // Quem leciona uma turma do curso ganha a docência do curso (pode editá-lo).
    await client.query(
      `insert into enrollments (course_id, user_id, role, status)
       select t.curso_id, tp.user_id, 'teacher', 'active'
         from turma_professores tp join turmas t on t.id = tp.turma_id
        where tp.turma_id = $1
       on conflict (course_id, user_id) do nothing`,
      [turmaId]
    );
    // Quem saiu da turma perde a docência, se não leciona mais nenhuma turma desse curso.
    const removidos = anteriores.filter((id) => !userIds.includes(id));
    if (removidos.length) {
      await client.query(
        `delete from enrollments e
          where e.course_id = $1 and e.role = 'teacher' and e.user_id = any($2::uuid[])
            and not exists (
              select 1 from turma_professores tp join turmas t2 on t2.id = tp.turma_id
               where t2.curso_id = e.course_id and tp.user_id = e.user_id
            )`,
        [cursoId, removidos]
      );
    }
    return 'ok';
  });
}

// Turma como o aluno vê no cronograma (sem presença), para o professor conferir a própria turma.
async function cronogramaDaTurmaComoAluno(turmaId, hoje) {
  const { rows } = await query(
    `select s.id, s.session_date, s.horario, s.modulo, s.title, s.professor, s.fechada, s.status_aula
       from attendance_sessions s
      where s.turma_id = $1
      order by s.session_date, s.horario, s.id
      limit 1000`,
    [turmaId]
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
      situacao
    };
  });
}

// Aulas que o professor ministra: das turmas que ele dá aula ou em que é o professor da aula.
async function aulasQueMinistra(userId) {
  const { rows } = await query(
    `select s.id, s.session_date, s.horario, s.modulo, s.title, s.status_aula, s.tipo, t.id as turma_id, t.nome as turma, c.title as curso
       from attendance_sessions s
       join turmas t on t.id = s.turma_id
       join courses c on c.id = t.curso_id
      where s.turma_id is not null
        and (s.professor_id = $1 or s.turma_id in (select turma_id from turma_professores where user_id = $1))
      order by s.session_date desc, s.horario, s.id
      limit 300`,
    [userId]
  );
  return rows.map((row) => ({
    sessionId: row.id,
    date: dateOf(row.session_date),
    horario: row.horario || '',
    modulo: row.modulo || '',
    titulo: row.title || '',
    situacao: row.status_aula,
    tipo: row.tipo,
    turmaId: row.turma_id,
    turma: row.turma,
    curso: row.curso
  }));
}

// ---------- Cronograma (gerar, avulsa, editar, cancelar, remover) ----------

async function listarAulasDaTurma(turmaId, hoje) {
  return aulasDaTurma(turmaId, hoje);
}

// Gera as aulas do período. A grade tem uma ou mais regras: cada uma com seus dias da semana e horário
// (ex.: Seg/Qua 08:00-10:00 e Ter/Qui 19:00-21:00). Sem grade, usa os dias e o horário da turma.
async function gerarAulas(turmaId, opcoes) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'select id, curso_id, nome, dias_semana, horario, data_inicio, data_fim from turmas where id = $1',
      [turmaId]
    );
    const turma = rows[0];
    if (!turma) return { erro: 'turma_inexistente' };

    const inicio = opcoes.inicio || dateOf(turma.data_inicio);
    const fim = opcoes.fim || dateOf(turma.data_fim);
    if (!inicio || !fim) return { erro: 'periodo_obrigatorio' };
    if (fim < inicio) return { erro: 'periodo_invalido' };

    const totalDias = (new Date(`${fim}T00:00:00Z`) - new Date(`${inicio}T00:00:00Z`)) / 86400000 + 1;
    if (totalDias > MAX_DIAS_GERACAO) return { erro: 'periodo_longo' };

    const regrasBrutas = opcoes.grade?.length
      ? opcoes.grade
      : [{ dias: opcoes.dias, horario: opcoes.horario }];
    const regras = regrasBrutas
      .map((r) => ({
        dias: new Set(r.dias?.length ? r.dias : [...diasDaTurma(turma.dias_semana)]),
        horario: r.horario || turma.horario || ''
      }))
      .filter((r) => r.dias.size);
    if (!regras.length) return { erro: 'dias_obrigatorios' };

    // Plano: data -> horário. Se duas regras caem no mesmo dia, vale a primeira.
    const plano = new Map();
    const feriados = new Set();
    for (const regra of regras) {
      for (const iso of datasDeAula(regra.dias, inicio, fim)) {
        if (!plano.has(iso)) plano.set(iso, regra.horario);
      }
      feriadosNoPeriodo(regra.dias, inicio, fim).forEach((iso) => feriados.add(iso));
    }
    const candidatas = [...plano.keys()].sort();

    const existentes = await client.query(
      'select session_date from attendance_sessions where turma_id = $1 and session_date between $2::date and $3::date',
      [turmaId, inicio, fim]
    );
    const ocupadas = new Set(existentes.rows.map((r) => dateOf(r.session_date)));
    const novas = candidatas.filter((iso) => !ocupadas.has(iso));

    if (novas.length) {
      await client.query(
        `insert into attendance_sessions (course_id, turma_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo)
         select $1, $2, d.data, $3, d.horario, $4,
                coalesce((select string_agg(u.name, ', ' order by u.name) from turma_professores tp join users u on u.id = tp.user_id where tp.turma_id = $2), ''),
                'atlas', 'ativa', 'regular'
           from unnest($5::date[], $6::text[]) as d(data, horario)`,
        [turma.curso_id, turmaId, opcoes.titulo || '', opcoes.modulo || '', novas, novas.map((iso) => plano.get(iso))]
      );
    }

    return {
      criadas: novas.length,
      ignoradas: candidatas.length - novas.length,
      feriados: [...feriados].sort()
    };
  });
}

// Edição em lote, pela administração. Ações: deslocar (dias), horario, modulo, titulo, cancelar, reativar, remover.
const ACOES_LOTE = ['deslocar', 'horario', 'modulo', 'titulo', 'cancelar', 'reativar', 'remover'];

async function editarLote(turmaId, { sessionIds, acao, dias, horario, modulo, titulo }) {
  if (!ACOES_LOTE.includes(acao)) return { erro: 'acao_invalida' };
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'select id, session_date, horario from attendance_sessions where turma_id = $1 and id = any($2::uuid[]) order by session_date',
      [turmaId, sessionIds]
    );
    if (rows.length !== new Set(sessionIds).size) return { erro: 'aula_inexistente' };

    if (acao === 'deslocar') {
      const novas = rows.map((r) => {
        const d = new Date(`${dateOf(r.session_date)}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + Number(dias));
        return { id: r.id, data: d.toISOString().slice(0, 10) };
      });
      const idsSelecionados = new Set(sessionIds);
      const ocupadasFora = await client.query(
        'select session_date from attendance_sessions where turma_id = $1 and id <> all($2::uuid[])',
        [turmaId, sessionIds]
      );
      const ocupadas = new Set(ocupadasFora.rows.map((r) => dateOf(r.session_date)));
      const conflitos = novas.filter((n) => ocupadas.has(n.data));
      const unicas = new Set(novas.map((n) => n.data));
      if (conflitos.length || unicas.size !== novas.length) {
        return { erro: 'data_ocupada', conflitos: conflitos.map((c) => c.data) };
      }
      for (const n of novas) {
        await client.query('update attendance_sessions set session_date = $2::date where id = $1', [n.id, n.data]);
      }
      return { afetadas: novas.length, ignoradas: [] };
    }

    if (acao === 'remover') {
      const comRegistro = await client.query(
        'select distinct session_id from attendance_records where session_id = any($1::uuid[])',
        [rows.map((r) => r.id)]
      );
      const bloqueadas = new Set(comRegistro.rows.map((r) => r.session_id));
      const removiveis = rows.filter((r) => !bloqueadas.has(r.id)).map((r) => r.id);
      if (removiveis.length) {
        await client.query('delete from attendance_sessions where id = any($1::uuid[])', [removiveis]);
      }
      return { afetadas: removiveis.length, ignoradas: [...bloqueadas] };
    }

    const ids = rows.map((r) => r.id);
    if (acao === 'horario') await client.query('update attendance_sessions set horario = $2 where id = any($1::uuid[])', [ids, horario]);
    if (acao === 'modulo') await client.query('update attendance_sessions set modulo = $2 where id = any($1::uuid[])', [ids, modulo]);
    if (acao === 'titulo') await client.query('update attendance_sessions set title = $2 where id = any($1::uuid[])', [ids, titulo]);
    if (acao === 'cancelar') await client.query("update attendance_sessions set status_aula = 'cancelada' where id = any($1::uuid[])", [ids]);
    if (acao === 'reativar') await client.query("update attendance_sessions set status_aula = 'ativa' where id = any($1::uuid[])", [ids]);
    return { afetadas: ids.length, ignoradas: [] };
  });
}

async function criarAulaAvulsa(turmaId, { data, horario, modulo, titulo }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select curso_id, horario from turmas where id = $1', [turmaId]);
    if (!rows[0]) return { erro: 'turma_inexistente' };
    const ocupada = await client.query(
      'select 1 from attendance_sessions where turma_id = $1 and session_date = $2::date',
      [turmaId, data]
    );
    if (ocupada.rowCount) return { erro: 'data_ocupada' };
    const inserida = await client.query(
      `insert into attendance_sessions (course_id, turma_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo)
       values ($1, $2, $3::date, $4, $5, $6,
               coalesce((select string_agg(u.name, ', ' order by u.name) from turma_professores tp join users u on u.id = tp.user_id where tp.turma_id = $2), ''),
               'atlas', 'ativa', 'regular')
       returning id`,
      [rows[0].curso_id, turmaId, data, titulo || '', horario || rows[0].horario || '', modulo || '']
    );
    return { id: inserida.rows[0].id };
  });
}

// Importação de CSV: uma aula por linha. Datas já ocupadas na turma são puladas e informadas.
async function importarAulas(turmaId, linhas) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select curso_id, horario from turmas where id = $1', [turmaId]);
    if (!rows[0]) return { erro: 'turma_inexistente' };
    const ocupadas = new Set(
      (await client.query('select session_date::text as data from attendance_sessions where turma_id = $1', [turmaId])).rows.map((r) => r.data)
    );
    const criadas = [];
    const ignoradas = [];
    for (const linha of linhas) {
      if (ocupadas.has(linha.data)) {
        ignoradas.push({ data: linha.data, motivo: 'Já existe aula nessa data' });
        continue;
      }
      await client.query(
        `insert into attendance_sessions (course_id, turma_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo)
         values ($1, $2, $3::date, $4, $5, $6,
                 coalesce((select string_agg(u.name, ', ' order by u.name) from turma_professores tp join users u on u.id = tp.user_id where tp.turma_id = $2), ''),
                 'atlas', 'ativa', 'regular')`,
        [rows[0].curso_id, turmaId, linha.data, linha.titulo || '', linha.horario || rows[0].horario || '', linha.modulo || '']
      );
      ocupadas.add(linha.data);
      criadas.push(linha.data);
    }
    return { criadas: criadas.length, ignoradas };
  });
}

// Preenche módulo e título, em ordem, com as seções e aulas da ementa do curso.
// Só mexe nos campos em branco; aulas já preenchidas não consomem a ementa.
async function preencherModulos(turmaId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select curso_id from turmas where id = $1', [turmaId]);
    if (!rows[0]) return { erro: 'turma_inexistente' };
    const ementa = (
      await client.query(
        `select s.title as modulo, l.title as titulo
           from lessons l join sections s on s.id = l.section_id
          where s.course_id = $1
          order by s.position, l.position`,
        [rows[0].curso_id]
      )
    ).rows;
    const aulas = (
      await client.query(
        `select id, title, modulo from attendance_sessions
          where turma_id = $1 order by session_date, id`,
        [turmaId]
      )
    ).rows;
    let proximo = 0;
    let preenchidas = 0;
    for (const aula of aulas) {
      const faltaTitulo = !String(aula.title || '').trim();
      const faltaModulo = !String(aula.modulo || '').trim();
      if (!(faltaTitulo || faltaModulo) || proximo >= ementa.length) continue;
      const item = ementa[proximo++];
      await client.query(
        `update attendance_sessions
            set title = case when coalesce(trim(title), '') = '' then $2 else title end,
                modulo = case when coalesce(trim(modulo), '') = '' then $3 else modulo end
          where id = $1`,
        [aula.id, item.titulo, item.modulo]
      );
      preenchidas++;
    }
    return { preenchidas, sobrando: ementa.length - proximo };
  });
}

// Edita data, horário, módulo ou título. Não permite duas aulas no mesmo dia da turma.
async function atualizarAula(sessionId, campos) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select turma_id from attendance_sessions where id = $1', [sessionId]);
    if (!rows[0]) return { erro: 'aula_inexistente' };
    if (campos.data) {
      const ocupada = await client.query(
        'select 1 from attendance_sessions where turma_id = $1 and session_date = $2::date and id <> $3',
        [rows[0].turma_id, campos.data, sessionId]
      );
      if (ocupada.rowCount) return { erro: 'data_ocupada' };
    }
    const colunas = { data: 'session_date', horario: 'horario', modulo: 'modulo', titulo: 'title' };
    const sets = [];
    const valores = [];
    for (const [chave, coluna] of Object.entries(colunas)) {
      if (campos[chave] === undefined) continue;
      valores.push(campos[chave]);
      sets.push(`${coluna} = $${valores.length}${chave === 'data' ? '::date' : ''}`);
    }
    if (!sets.length) return { erro: 'nada_para_alterar' };
    valores.push(sessionId);
    await client.query(`update attendance_sessions set ${sets.join(', ')} where id = $${valores.length}`, valores);
    return { ok: true };
  });
}

// Cancelar mantém a aula e os registros, mas tira a aula do cálculo. Reativar desfaz.
async function definirCancelamento(sessionId, cancelada) {
  const { rowCount } = await query(
    `update attendance_sessions set status_aula = $2 where id = $1`,
    [sessionId, cancelada ? 'cancelada' : 'ativa']
  );
  return rowCount ? 'ok' : 'aula_inexistente';
}

// Remover só se a aula não tem registros de presença. Caso contrário, use cancelar.
async function removerAula(sessionId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `select (select count(*) from attendance_records where session_id = $1)::int as registros`,
      [sessionId]
    );
    const { rows: existe } = await client.query('select 1 from attendance_sessions where id = $1', [sessionId]);
    if (!existe.length) return 'aula_inexistente';
    if (rows[0].registros > 0) return 'com_registros';
    await client.query('delete from attendance_sessions where id = $1', [sessionId]);
    return 'ok';
  });
}

// ---------- Presença por aula (professor da turma e administração) ----------

async function presencaDaAula(sessionId) {
  const { rows } = await query(
    `select m.user_id, u.name, coalesce(r.status, '') as status, coalesce(r.origem, '') as origem,
            coalesce(r.tipo_justificativa, '') as tipo_justificativa
       from attendance_sessions s
       join turma_alunos ta on ta.turma_id = s.turma_id and ta.situacao = 'ativo'
       join matriculas m on m.id = ta.matricula_id and m.situacao = 'ativo' and m.user_id is not null
       join users u on u.id = m.user_id
       left join attendance_records r on r.session_id = s.id and r.user_id = m.user_id
      where s.id = $1
      order by u.name`,
    [sessionId]
  );
  return rows.map((row) => ({
    userId: row.user_id,
    nome: row.name,
    status: row.status || null,
    origem: row.origem || null,
    tipoJustificativa: row.tipo_justificativa || null
  }));
}

// Grava a presença de um aluno numa aula. status null limpa a marcação.
async function marcarPresencaGestao(sessionId, userId, status, gestorId) {
  return withTransaction(async (client) => {
    const matriculado = await client.query(
      `select 1
         from attendance_sessions s
         join turma_alunos ta on ta.turma_id = s.turma_id and ta.situacao = 'ativo'
         join matriculas m on m.id = ta.matricula_id and m.situacao = 'ativo' and m.user_id = $2
        where s.id = $1`,
      [sessionId, userId]
    );
    if (!matriculado.rowCount) return 'aluno_fora_da_turma';
    if (status === null) {
      await client.query('delete from attendance_records where session_id = $1 and user_id = $2', [sessionId, userId]);
      return 'ok';
    }
    await client.query(
      `insert into attendance_records (session_id, user_id, status, note, origem, marcado_em, recorded_by)
       values ($1, $2, $3, '', 'gestao', now(), $4)
       on conflict (session_id, user_id) do update
         set status = excluded.status, origem = 'gestao', marcado_em = now(),
             recorded_by = excluded.recorded_by, updated_at = now()`,
      [sessionId, userId, status, gestorId]
    );
    return 'ok';
  });
}

// ---------- Ponto do professor (sem GPS) ----------

// Hoje: aulas de hoje das turmas que o professor ministra, o ponto aberto e os registros do dia.
async function pontoDoDia(userId, hoje, agora = new Date()) {
  const aulas = await query(
    `select s.id, s.session_date, s.horario, s.title, s.status_aula, t.id as turma_id, t.nome as turma, c.title as curso
       from attendance_sessions s
       join turmas t on t.id = s.turma_id
       join courses c on c.id = t.curso_id
       join turma_professores tp on tp.turma_id = s.turma_id and tp.user_id = $1
      where s.session_date = $2::date and s.status_aula = 'ativa'
      order by s.horario, t.nome, s.id`,
    [userId, hoje]
  );
  const registros = await query(
    `select p.id, p.tipo, p.titulo, p.entrada, p.saida, p.observacao, p.session_id, p.turma_id, p.corrigido, p.origem, t.nome as turma
       from ponto_professor p
       left join turmas t on t.id = p.turma_id
      where p.user_id = $1 and p.data = $2::date
      order by p.entrada nulls last, p.criado_em`,
    [userId, hoje]
  );
  return {
    aulas: aulas.rows.map((row) => {
      const data = dateOf(row.session_date);
      const janela = janelaDaAula(data, row.horario);
      return {
        sessionId: row.id,
        date: data,
        horario: row.horario || '',
        titulo: row.title || '',
        turmaId: row.turma_id,
        turma: row.turma,
        curso: row.curso,
        marcada: registros.rows.some((r) => r.session_id === row.id),
        janela: {
          abre: janela.abre.toISOString(),
          fecha: janela.fecha.toISOString(),
          situacao: situacaoJanela(janela, agora),
          semHorario: janela.semHorario
        }
      };
    }),
    registros: registros.rows.map(mapPonto)
  };
}

function mapPonto(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo || '',
    turma: row.turma || null,
    turmaId: row.turma_id || null,
    sessionId: row.session_id || null,
    entrada: row.entrada,
    saida: row.saida,
    minutos: row.entrada && row.saida ? Math.round((new Date(row.saida) - new Date(row.entrada)) / 60000) : null,
    observacao: row.observacao || '',
    corrigido: row.corrigido,
    origem: row.origem,
    data: dateOf(row.data)
  };
}

// Entrada numa aula regular. Só uma entrada aberta por vez; a aula precisa ser de hoje e de uma turma do professor.
async function registrarEntrada(userId, sessionId, hoje, agora = new Date()) {
  return withTransaction(async (client) => {
    const aula = await client.query(
      `select s.id, s.turma_id, s.session_date, s.horario
         from attendance_sessions s
         join turma_professores tp on tp.turma_id = s.turma_id and tp.user_id = $1
        where s.id = $2 and s.status_aula = 'ativa'`,
      [userId, sessionId]
    );
    if (!aula.rows[0]) return { erro: 'aula_invalida' };
    const data = dateOf(aula.rows[0].session_date);
    if (data !== hoje) return { erro: 'aula_de_outro_dia' };

    const janela = janelaDaAula(data, aula.rows[0].horario);
    const situacao = situacaoJanela(janela, agora);
    if (situacao === 'antes') return { erro: 'entrada_antes_da_janela', abre: janela.abre.toISOString() };
    if (situacao === 'depois') return { erro: 'entrada_depois_da_janela', fecha: janela.fecha.toISOString() };

    const aberto = await client.query(
      'select 1 from ponto_professor where user_id = $1 and entrada is not null and saida is null',
      [userId]
    );
    if (aberto.rowCount) return { erro: 'ponto_aberto' };

    const jaMarcada = await client.query(
      'select 1 from ponto_professor where user_id = $1 and session_id = $2',
      [userId, sessionId]
    );
    if (jaMarcada.rowCount) return { erro: 'ja_registrada' };

    const inserido = await client.query(
      `insert into ponto_professor (user_id, turma_id, session_id, data, tipo, entrada, origem)
       values ($1, $2, $3, $4::date, 'aula', now(), 'professor')
       returning id`,
      [userId, aula.rows[0].turma_id, sessionId, hoje]
    );
    return { id: inserido.rows[0].id };
  });
}

// Saída do ponto aberto do próprio professor.
async function registrarSaida(userId, pontoId) {
  const { rows } = await query(
    `update ponto_professor set saida = now()
      where id = $1 and user_id = $2 and entrada is not null and saida is null
      returning id`,
    [pontoId, userId]
  );
  if (rows[0]) return 'ok';
  return 'nao_encontrado';
}

// Aula extra: horário em Brasília. Se houver turma, a aula também aparece na turma para os alunos.
async function registrarAulaExtra(userId, { turmaId, data, inicio, fim, titulo, observacao }) {
  return withTransaction(async (client) => {
    let sessionId = null;
    let turmaIdFinal = null;
    if (turmaId) {
      const { rows } = await client.query('select curso_id from turmas where id = $1', [turmaId]);
      if (!rows[0]) return { erro: 'turma_inexistente' };
      const inserida = await client.query(
        `insert into attendance_sessions (course_id, turma_id, session_date, title, horario, modulo, professor, origem, status_aula, tipo, professor_id)
         values ($1, $2, $3::date, $4, $5, '',
                 coalesce((select string_agg(u.name, ', ' order by u.name) from users u where u.id = $6), ''),
                 'atlas', 'ativa', 'extra', $6)
         returning id`,
        [rows[0].curso_id, turmaId, data, titulo, `${inicio}-${fim}`, userId]
      );
      sessionId = inserida.rows[0].id;
      turmaIdFinal = turmaId;
    }
    const inserido = await client.query(
      `insert into ponto_professor (user_id, turma_id, session_id, data, tipo, entrada, saida, observacao, titulo, origem)
       values ($1, $2, $3, $4::date, 'extra',
               ($4::date + $5::time) at time zone 'America/Sao_Paulo',
               ($4::date + $6::time) at time zone 'America/Sao_Paulo',
               $7, $8, 'professor')
       returning id`,
      [userId, turmaIdFinal, sessionId, data, inicio, fim, observacao, titulo]
    );
    return { id: inserido.rows[0].id };
  });
}

// Histórico do próprio professor, com o total de minutos no período.
async function historicoPonto(userId, de, ate) {
  const { rows } = await query(
    `select p.id, p.tipo, p.titulo, p.entrada, p.saida, p.observacao, p.session_id, p.turma_id, p.corrigido, p.origem, p.data,
            t.nome as turma
       from ponto_professor p
       left join turmas t on t.id = p.turma_id
      where p.user_id = $1 and p.data between $2::date and $3::date
      order by p.data desc, p.entrada desc nulls last
      limit 1000`,
    [userId, de, ate]
  );
  const registros = rows.map(mapPonto);
  const totalMinutos = registros.reduce((soma, r) => soma + (r.minutos || 0), 0);
  return { registros, totalMinutos };
}

// Visão da administração: pontos de qualquer professor, com filtro.
async function listarPontoGestao({ professorId, de, ate }) {
  const { rows } = await query(
    `select p.id, p.tipo, p.titulo, p.entrada, p.saida, p.observacao, p.session_id, p.turma_id, p.corrigido, p.origem, p.data,
            t.nome as turma, u.name as professor, u.id as professor_id
       from ponto_professor p
       join users u on u.id = p.user_id
       left join turmas t on t.id = p.turma_id
      where ($1::uuid is null or p.user_id = $1::uuid)
        and p.data between $2::date and $3::date
      order by p.data desc, u.name, p.entrada desc nulls last
      limit 2000`,
    [professorId || null, de, ate]
  );
  return rows.map((row) => ({ ...mapPonto(row), professor: row.professor, professorId: row.professor_id }));
}

// Correção feita pela administração: marca como corrigido e guarda a origem.
async function corrigirPonto(pontoId, { entrada, saida, observacao }) {
  const { rows } = await query(
    `update ponto_professor
        set entrada = $2::timestamptz, saida = $3::timestamptz, observacao = $4,
            corrigido = true, origem = 'gestao'
      where id = $1
      returning id`,
    [pontoId, entrada, saida, observacao]
  );
  return rows[0] ? 'ok' : 'nao_encontrado';
}

// ---------- Arquivos do perfil do professor ----------

async function listarArquivos(userId) {
  const { rows } = await query(
    `select id, nome, tipo, tamanho, criado_em from professor_arquivos where user_id = $1 order by criado_em desc`,
    [userId]
  );
  return rows.map((row) => ({ id: row.id, nome: row.nome, tipo: row.tipo, tamanho: row.tamanho, criadoEm: row.criado_em }));
}

async function arquivoDoProfessor(userId, arquivoId) {
  const { rows } = await query(
    'select id, nome, tipo, dados from professor_arquivos where id = $1 and user_id = $2',
    [arquivoId, userId]
  );
  return rows[0] || null;
}

async function criarArquivo(userId, { nome, tipo, tamanho, dados }) {
  const { rows } = await query(
    `insert into professor_arquivos (user_id, nome, tipo, tamanho, dados)
     values ($1, $2, $3, $4, $5) returning id, nome, tipo, tamanho, criado_em`,
    [userId, nome, tipo, tamanho, dados]
  );
  const row = rows[0];
  return { id: row.id, nome: row.nome, tipo: row.tipo, tamanho: row.tamanho, criadoEm: row.criado_em };
}

async function removerArquivo(userId, arquivoId) {
  const { rowCount } = await query('delete from professor_arquivos where id = $1 and user_id = $2', [arquivoId, userId]);
  return rowCount ? 'ok' : 'nao_encontrado';
}

module.exports = {
  professorDaTurma,
  definirLinkTurma,
  turmaDaAula,
  turmasDoProfessor,
  todasAsTurmas,
  professoresDaTurma,
  listarProfessores,
  definirProfessoresTurma,
  cronogramaDaTurmaComoAluno,
  aulasQueMinistra,
  listarAulasDaTurma,
  gerarAulas,
  editarLote,
  criarAulaAvulsa,
  importarAulas,
  preencherModulos,
  atualizarAula,
  definirCancelamento,
  removerAula,
  presencaDaAula,
  marcarPresencaGestao,
  pontoDoDia,
  registrarEntrada,
  registrarSaida,
  registrarAulaExtra,
  historicoPonto,
  listarPontoGestao,
  corrigirPonto,
  listarArquivos,
  arquivoDoProfessor,
  criarArquivo,
  removerArquivo
};
