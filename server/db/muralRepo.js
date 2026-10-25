const { query, withTransaction } = require('./pool');
const { PALAVRAS_PADRAO } = require('../services/moderacao');

// Espaços do mural: turma ou grupo de curso. Quem é da equipe (administração, atendente e gestão) vê todos.
// Aluno e professor veem só os seus. Matrícula suspensa (expulsão) tira o acesso ao espaço.
const EQUIPE_GLOBAL = ['admin', 'atendente', 'gestao', 'editor'];

const SEM_SUSPENSAO = (cursoExpr) => `not exists (
  select 1 from enrollments e where e.course_id = ${cursoExpr} and e.user_id = $1 and e.status = 'suspended')`;

async function espacosDoUsuario(userId, role) {
  const global = EQUIPE_GLOBAL.includes(role);
  const turmas = await query(
    `select t.id, t.nome, t.modalidade, c.title as curso, c.id as curso_id,
            exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $1) as professor,
            exists (
              select 1 from turma_alunos ta join matriculas m on m.id = ta.matricula_id
               where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo' and m.user_id = $1
            ) as aluno
       from turmas t join courses c on c.id = t.curso_id
      where t.ativa
        and ($2::boolean
          or exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $1)
          or exists (
              select 1 from turma_alunos ta join matriculas m on m.id = ta.matricula_id
               where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo' and m.user_id = $1))
        and ${SEM_SUSPENSAO('t.curso_id')}
      order by c.title, t.nome`,
    [userId, global]
  );

  const grupos = await query(
    `select g.id, g.name as nome, c.title as curso, c.id as curso_id,
            exists (
              select 1 from enrollments e where e.course_id = g.course_id and e.user_id = $1
                and e.role = 'teacher' and e.status = 'active'
            ) as professor,
            exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = $1) as aluno
       from course_groups g join courses c on c.id = g.course_id
      where ($2::boolean
          or exists (
              select 1 from enrollments e where e.course_id = g.course_id and e.user_id = $1
                and e.role = 'teacher' and e.status = 'active')
          or exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = $1))
        and ${SEM_SUSPENSAO('g.course_id')}
      order by c.title, g.name`,
    [userId, global]
  );

  // Fórum geral do curso: equipe vê todos os cursos; aluno e professor, só os seus (matrícula ativa).
  const cursos = await query(
    `select c.id, c.title as curso, c.id as curso_id,
            exists (select 1 from enrollments e where e.course_id = c.id and e.user_id = $1 and e.role = 'teacher' and e.status = 'active') as professor,
            exists (select 1 from enrollments e where e.course_id = c.id and e.user_id = $1 and e.role = 'student' and e.status = 'active') as aluno
       from courses c
      where ($2::boolean or exists (select 1 from enrollments e where e.course_id = c.id and e.user_id = $1 and e.status = 'active'))
        and ${SEM_SUSPENSAO('c.id')}
      order by c.title`,
    [userId, global]
  );

  return [
    ...cursos.rows.map((r) => ({ tipo: 'curso', id: r.id, nome: 'Geral do curso', modalidade: 'Curso', curso: r.curso, cursoId: r.curso_id, professor: r.professor, aluno: r.aluno })),
    ...turmas.rows.map((r) => ({ tipo: 'turma', id: r.id, nome: r.nome, modalidade: r.modalidade, curso: r.curso, cursoId: r.curso_id, professor: r.professor, aluno: r.aluno })),
    ...grupos.rows.map((r) => ({ tipo: 'grupo', id: r.id, nome: r.nome, modalidade: 'Grupo', curso: r.curso, cursoId: r.curso_id, professor: r.professor, aluno: r.aluno }))
  ];
}

// Permissões de quem está no espaço. Equipe modera; administração e docente do curso expulsam.
function permissoesNoEspaco(role, espaco) {
  const equipe = EQUIPE_GLOBAL.includes(role) || Boolean(espaco.professor);
  return {
    leitura: equipe || Boolean(espaco.aluno),
    equipe,
    moderacao: equipe,
    expulsar: role === 'admin' || Boolean(espaco.professor),
    avisar: equipe
  };
}

async function cursoDoPost(postId) {
  const { rows } = await query(
    `select coalesce(t.curso_id, g.course_id, p.curso_id) as curso_id
       from turma_posts p
       left join turmas t on t.id = p.turma_id
       left join course_groups g on g.id = p.grupo_id
      where p.id = $1`,
    [postId]
  );
  return rows[0]?.curso_id || null;
}

async function acessoAoEspaco(userId, role, tipo, id) {
  const espaco = (await espacosDoUsuario(userId, role)).find((item) => item.tipo === tipo && item.id === id);
  if (!espaco) return null;
  return { espaco, ...permissoesNoEspaco(role, espaco) };
}

// Papel exibido ao lado do nome: aluno ou equipe. Não expõe e-mail nem dados de conta.
const SELECT_POST = `
  select p.id, p.turma_id, p.grupo_id, p.curso_id, p.autor_id, p.tipo, p.titulo, p.corpo, p.fixado, p.resolvido, p.ocultado,
         p.created_at, p.updated_at,
         u.name as autor_nome, u.role as autor_role,
         (select count(*)::int from turma_respostas r where r.post_id = p.id) as respostas
    from turma_posts p
    join users u on u.id = p.autor_id`;

function colunaDoEspaco(tipo) {
  if (tipo === 'grupo') return 'p.grupo_id';
  if (tipo === 'curso') return 'p.curso_id';
  return 'p.turma_id';
}

async function listarPosts(tipo, espacoId, { filtroTipo, moderador, userId }) {
  const { rows } = await query(
    `${SELECT_POST}
      where ${colunaDoEspaco(tipo)} = $1
        and ($2::text is null or p.tipo = $2)
        and ($3::boolean or p.ocultado = false or p.autor_id = $4)
      order by p.fixado desc, p.created_at desc
      limit 200`,
    [espacoId, filtroTipo || null, moderador, userId]
  );
  return rows;
}

async function buscarPost(id) {
  const { rows } = await query(`${SELECT_POST} where p.id = $1`, [id]);
  return rows[0] || null;
}

async function listarRespostas(postId, { moderador, userId }) {
  const { rows } = await query(
    `select r.id, r.post_id, r.autor_id, r.corpo, r.created_at, r.ocultada,
            u.name as autor_nome, u.role as autor_role
       from turma_respostas r
       join users u on u.id = r.autor_id
      where r.post_id = $1 and ($2::boolean or r.ocultada = false or r.autor_id = $3)
      order by r.created_at`,
    [postId, moderador, userId]
  );
  return rows;
}

async function criarPost({ espacoTipo, espacoId, autorId, tipo, titulo, corpo }) {
  const { rows } = await query(
    `insert into turma_posts (turma_id, grupo_id, curso_id, autor_id, tipo, titulo, corpo)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      espacoTipo === 'turma' ? espacoId : null,
      espacoTipo === 'grupo' ? espacoId : null,
      espacoTipo === 'curso' ? espacoId : null,
      autorId,
      tipo,
      titulo,
      corpo
    ]
  );
  return rows[0].id;
}

async function atualizarPost(id, campos) {
  await query(
    `update turma_posts
        set fixado = coalesce($2, fixado),
            resolvido = coalesce($3, resolvido),
            ocultado = coalesce($4, ocultado),
            updated_at = now()
      where id = $1`,
    [id, campos.fixado ?? null, campos.resolvido ?? null, campos.ocultado ?? null]
  );
}

async function excluirPost(id) {
  await query(`delete from turma_posts where id = $1`, [id]);
}

async function criarResposta({ postId, autorId, corpo }) {
  const { rows } = await query(
    `insert into turma_respostas (post_id, autor_id, corpo) values ($1, $2, $3) returning id`,
    [postId, autorId, corpo]
  );
  return rows[0].id;
}

// Resposta com o espaço e o curso dela, para checar permissão.
async function buscarResposta(id) {
  const { rows } = await query(
    `select r.id, r.post_id, r.autor_id, r.ocultada, p.turma_id, p.grupo_id, p.curso_id,
            coalesce(t.curso_id, g.course_id, p.curso_id) as curso_id
       from turma_respostas r
       join turma_posts p on p.id = r.post_id
       left join turmas t on t.id = p.turma_id
       left join course_groups g on g.id = p.grupo_id
      where r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function atualizarResposta(id, campos) {
  await query(`update turma_respostas set ocultada = coalesce($2, ocultada) where id = $1`, [id, campos.ocultada ?? null]);
}

async function excluirResposta(id) {
  await query(`delete from turma_respostas where id = $1`, [id]);
}

// Denúncias ----------------------------------------------------------------

async function denunciaPendenteDeMim(userId, postId, respostaId) {
  const { rows } = await query(
    `select 1 from mural_denuncias
      where autor_id = $1 and status = 'pendente'
        and (($2::uuid is not null and post_id = $2) or ($3::uuid is not null and resposta_id = $3))`,
    [userId, postId || null, respostaId || null]
  );
  return rows.length > 0;
}

async function criarDenuncia({ userId, postId, respostaId, motivo }) {
  const { rows } = await query(
    `insert into mural_denuncias (post_id, resposta_id, autor_id, motivo) values ($1, $2, $3, $4) returning id`,
    [postId || null, respostaId || null, userId, motivo]
  );
  return rows[0].id;
}

// Denúncias pendentes ou decididas. Administração, atendente e gestão veem todas; docente, as dos seus cursos.
async function listarDenuncias({ userId, global, status }) {
  const { rows } = await query(
    `select d.id, d.motivo, d.status, d.decisao, d.created_at,
            d.post_id as denuncia_post_id, d.resposta_id,
            p.id as post_id, p.titulo as post_titulo, p.ocultado as post_oculto,
            r.corpo as resposta_corpo, r.ocultada as resposta_oculta,
            coalesce(r.autor_id, p.autor_id) as alvo_autor_id,
            ua.name as alvo_autor_nome,
            coalesce(t.nome, g.name, 'Geral do curso') as espaco_nome,
            c.title as curso,
            coalesce(t.curso_id, g.course_id, p.curso_id) as curso_id,
            ud.name as denunciante_nome
       from mural_denuncias d
       left join turma_respostas r on r.id = d.resposta_id
       join turma_posts p on p.id = coalesce(d.post_id, r.post_id)
       left join turmas t on t.id = p.turma_id
       left join course_groups g on g.id = p.grupo_id
       join courses c on c.id = coalesce(t.curso_id, g.course_id, p.curso_id)
       join users ua on ua.id = coalesce(r.autor_id, p.autor_id)
       join users ud on ud.id = d.autor_id
      where d.status = $2
        and ($1::boolean
          or exists (select 1 from enrollments e where e.course_id = coalesce(t.curso_id, g.course_id, p.curso_id) and e.user_id = $3 and e.role = 'teacher')
          or exists (select 1 from turma_professores tp where tp.turma_id = p.turma_id and tp.user_id = $3))
      order by d.created_at desc
      limit 200`,
    [global, status, userId]
  );
  return rows;
}

async function buscarDenuncia(id) {
  const { rows } = await query(
    `select d.id, d.status, d.post_id as denuncia_post_id, d.resposta_id,
            coalesce(d.post_id, r.post_id) as post_id,
            coalesce(r.autor_id, p.autor_id) as alvo_autor_id,
            p.turma_id, p.grupo_id, p.curso_id,
            coalesce(t.curso_id, g.course_id, p.curso_id) as curso_id
       from mural_denuncias d
       left join turma_respostas r on r.id = d.resposta_id
       join turma_posts p on p.id = coalesce(d.post_id, r.post_id)
       left join turmas t on t.id = p.turma_id
       left join course_groups g on g.id = p.grupo_id
      where d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function decidirDenuncia(id, decisao, userId) {
  await query(
    `update mural_denuncias set status = 'resolvida', decisao = $2, decidida_por = $3, decidida_em = now() where id = $1`,
    [id, decisao, userId]
  );
}

// Ocultar o conteúdo denunciado (publicação ou resposta), conforme o alvo.
async function ocultarAlvo({ postId, respostaId }) {
  if (respostaId) {
    await query(`update turma_respostas set ocultada = true where id = $1`, [respostaId]);
  } else {
    await query(`update turma_posts set ocultado = true where id = $1`, [postId]);
  }
}

// Expulsão: matrícula do curso suspensa (o aluno perde o acesso ao curso e aos espaços dele) e registro no histórico.
async function expulsarDoCurso({ cursoId, userId, motivo, porId }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`select role from users where id = $1`, [userId]);
    if (!rows[0] || rows[0].role !== 'student') return 'nao_aluno';
    const papel = await client.query(
      `select role from enrollments where course_id = $1 and user_id = $2`,
      [cursoId, userId]
    );
    if (papel.rows[0]?.role === 'teacher') return 'docente';
    await client.query(
      `insert into enrollments (course_id, user_id, role, status) values ($1, $2, 'student', 'suspended')
       on conflict (course_id, user_id) do update set status = 'suspended'`,
      [cursoId, userId]
    );
    await client.query(
      `insert into mural_expulsoes (course_id, user_id, motivo, por_id) values ($1, $2, $3, $4)`,
      [cursoId, userId, motivo || '', porId]
    );
    return 'ok';
  });
}

// Lista de palavras bloqueadas ----------------------------------------------

async function listarPalavras() {
  const { rows } = await query(`select palavra from mural_palavras order by palavra`);
  if (rows.length === 0) {
    // Primeira leitura: grava a lista padrão para a administração poder editar.
    await query(
      `insert into mural_palavras (palavra) select unnest($1::text[]) on conflict do nothing`,
      [PALAVRAS_PADRAO]
    );
    return [...PALAVRAS_PADRAO].sort();
  }
  return rows.map((row) => row.palavra);
}

async function substituirPalavras(palavras) {
  await withTransaction(async (client) => {
    await client.query(`delete from mural_palavras`);
    if (palavras.length) {
      await client.query(`insert into mural_palavras (palavra) select unnest($1::text[])`, [palavras]);
    }
  });
}

module.exports = {
  espacosDoUsuario,
  permissoesNoEspaco,
  acessoAoEspaco,
  cursoDoPost,
  listarPosts,
  buscarPost,
  listarRespostas,
  criarPost,
  atualizarPost,
  excluirPost,
  criarResposta,
  buscarResposta,
  atualizarResposta,
  excluirResposta,
  denunciaPendenteDeMim,
  criarDenuncia,
  listarDenuncias,
  buscarDenuncia,
  decidirDenuncia,
  ocultarAlvo,
  expulsarDoCurso,
  listarPalavras,
  substituirPalavras
};
