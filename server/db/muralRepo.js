const { query } = require('./pool');

// Acesso à turma, calculado no banco: aluno com matrícula ativa na turma, professor da turma,
// ou administração/atendente (que veem todas as turmas ativas).
// Leitura: quem participa. Moderação (avisos, fixar, excluir de outras pessoas): equipe da turma.
async function acessoDaTurma(userId, role, turmaId) {
  const { rows } = await query(
    `select
       exists (
         select 1 from turma_alunos ta
           join matriculas m on m.id = ta.matricula_id
          where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo' and m.user_id = $1
       ) as aluno,
       exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $1) as professor
       from turmas t
      where t.id = $2 and t.ativa`,
    [userId, turmaId]
  );
  const linha = rows[0];
  if (!linha) return null;
  const staff = role === 'admin' || role === 'atendente';
  return {
    leitura: staff || linha.aluno || linha.professor,
    moderacao: staff || linha.professor
  };
}

async function turmasDoUsuario(userId, role) {
  const staff = role === 'admin' || role === 'atendente';
  const { rows } = await query(
    `select t.id, t.nome, t.modalidade, c.title as curso
       from turmas t
       join courses c on c.id = t.curso_id
      where t.ativa and (
        $2::boolean
        or exists (
          select 1 from turma_alunos ta join matriculas m on m.id = ta.matricula_id
           where ta.turma_id = t.id and ta.situacao = 'ativo' and m.situacao = 'ativo' and m.user_id = $1
        )
        or exists (select 1 from turma_professores tp where tp.turma_id = t.id and tp.user_id = $1)
      )
      order by t.nome`,
    [userId, staff]
  );
  return rows;
}

// Papel exibido ao lado do nome: aluno ou equipe. Não expõe e-mail nem dados de conta.
const SELECT_POST = `
  select p.id, p.turma_id, p.autor_id, p.tipo, p.titulo, p.corpo, p.fixado, p.resolvido,
         p.created_at, p.updated_at,
         u.name as autor_nome, u.role as autor_role,
         (select count(*)::int from turma_respostas r where r.post_id = p.id) as respostas
    from turma_posts p
    join users u on u.id = p.autor_id`;

async function listarPosts(turmaId, tipo) {
  const { rows } = await query(
    `${SELECT_POST}
      where p.turma_id = $1 and ($2::text is null or p.tipo = $2)
      order by p.fixado desc, p.created_at desc
      limit 200`,
    [turmaId, tipo || null]
  );
  return rows;
}

async function buscarPost(id) {
  const { rows } = await query(`${SELECT_POST} where p.id = $1`, [id]);
  return rows[0] || null;
}

async function listarRespostas(postId) {
  const { rows } = await query(
    `select r.id, r.post_id, r.autor_id, r.corpo, r.created_at,
            u.name as autor_nome, u.role as autor_role
       from turma_respostas r
       join users u on u.id = r.autor_id
      where r.post_id = $1
      order by r.created_at`,
    [postId]
  );
  return rows;
}

async function criarPost({ turmaId, autorId, tipo, titulo, corpo }) {
  const { rows } = await query(
    `insert into turma_posts (turma_id, autor_id, tipo, titulo, corpo)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [turmaId, autorId, tipo, titulo, corpo]
  );
  return rows[0].id;
}

async function atualizarPost(id, campos) {
  await query(
    `update turma_posts
        set fixado = coalesce($2, fixado),
            resolvido = coalesce($3, resolvido),
            updated_at = now()
      where id = $1`,
    [id, campos.fixado ?? null, campos.resolvido ?? null]
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

async function buscarResposta(id) {
  const { rows } = await query(
    `select r.id, r.post_id, r.autor_id, p.turma_id
       from turma_respostas r join turma_posts p on p.id = r.post_id
      where r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function excluirResposta(id) {
  await query(`delete from turma_respostas where id = $1`, [id]);
}

module.exports = {
  acessoDaTurma,
  turmasDoUsuario,
  listarPosts,
  buscarPost,
  listarRespostas,
  criarPost,
  atualizarPost,
  excluirPost,
  criarResposta,
  buscarResposta,
  excluirResposta
};
