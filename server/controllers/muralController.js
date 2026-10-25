const mural = require('../db/muralRepo');
const httpError = require('../utils/httpError');
const { encontrarPalavras } = require('../services/moderacao');

// Mural: avisos da equipe e fórum dos alunos, em turmas e grupos de curso.
// Regras do fórum (exibidas no topo do mural): sem preconceito, palavrões ou ofensas; quem descumprir pode ser removido do curso.

const TIPOS = ['aviso', 'forum'];
const ESPACOS = ['turma', 'grupo', 'curso'];

// Espaço de um registro (publicação ou resposta): grupo, turma ou o fórum geral do curso.
function espacoDoRegistro(row) {
  if (row.grupo_id) return ['grupo', row.grupo_id];
  if (row.turma_id) return ['turma', row.turma_id];
  return ['curso', row.curso_id];
}
const EQUIPE = ['admin', 'atendente', 'gestao'];
const MOTIVO_DENUNCIA_MAX = 300;

function autorDto(row) {
  return {
    id: row.autor_id,
    nome: row.autor_nome,
    papel: row.autor_role === 'student' ? 'aluno' : 'equipe'
  };
}

function postDto(row) {
  return {
    id: row.id,
    espacoTipo: espacoDoRegistro(row)[0],
    espacoId: espacoDoRegistro(row)[1],
    tipo: row.tipo,
    titulo: row.titulo,
    corpo: row.corpo,
    fixado: row.fixado,
    resolvido: row.resolvido,
    ocultado: row.ocultado,
    respostas: row.respostas ?? 0,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
    autor: autorDto(row)
  };
}

function respostaDto(row) {
  return {
    id: row.id,
    corpo: row.corpo,
    ocultada: row.ocultada,
    criadaEm: row.created_at,
    autor: autorDto({ autor_id: row.autor_id, autor_nome: row.autor_nome, autor_role: row.autor_role })
  };
}

// Acesso ao espaço (turma ou grupo). Sem leitura, responde como se não existisse para a pessoa.
async function exigirEspaco(user, tipo, id) {
  const acesso = await mural.acessoAoEspaco(user.id, user.role, tipo, id);
  if (!acesso || !acesso.leitura) throw httpError(404, 'Espaço não encontrado.');
  return acesso;
}

async function exigirPost(user, postId) {
  const post = await mural.buscarPost(postId);
  if (!post) throw httpError(404, 'Publicação não encontrada.');
  const [tipo, espacoId] = espacoDoRegistro(post);
  const acesso = await exigirEspaco(user, tipo, espacoId);
  // Publicação oculta só aparece para a moderação e para quem escreveu.
  if (post.ocultado && !acesso.moderacao && post.autor_id !== user.id) throw httpError(404, 'Publicação não encontrada.');
  return { post, acesso, tipo };
}

async function exigirFiltro(user, texto) {
  const lista = await mural.listarPalavras();
  const achadas = encontrarPalavras(texto, lista);
  if (achadas.length) {
    throw httpError(422, 'Sua mensagem tem palavras que não são permitidas no fórum. Revise o texto e tente de novo.');
  }
}

// Espaços que a pessoa vê, com o que ela pode fazer em cada um.
exports.listarEspacos = async (req, res) => {
  const espacos = await mural.espacosDoUsuario(req.user.id, req.user.role);
  return res.json({
    espacos: espacos.map((espaco) => {
      const permissoes = mural.permissoesNoEspaco(req.user.role, espaco);
      return {
        tipo: espaco.tipo,
        id: espaco.id,
        nome: espaco.nome,
        modalidade: espaco.modalidade,
        curso: espaco.curso,
        papel: permissoes.equipe ? 'equipe' : 'aluno',
        moderacao: permissoes.moderacao,
        expulsar: permissoes.expulsar
      };
    })
  });
};

exports.listarPosts = async (req, res) => {
  const { tipo, id } = req.params;
  if (!ESPACOS.includes(tipo)) throw httpError(404, 'Espaço não encontrado.');
  const acesso = await exigirEspaco(req.user, tipo, id);
  const filtroTipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
  const posts = await mural.listarPosts(tipo, id, {
    filtroTipo,
    moderador: acesso.moderacao,
    userId: req.user.id
  });
  return res.json({
    posts: posts.map(postDto),
    podeAvisar: acesso.avisar,
    podeModerar: acesso.moderacao,
    podeExpulsar: acesso.expulsar
  });
};

exports.criarPost = async (req, res) => {
  const { tipo: espacoTipo, id } = req.params;
  if (!ESPACOS.includes(espacoTipo)) throw httpError(404, 'Espaço não encontrado.');
  const acesso = await exigirEspaco(req.user, espacoTipo, id);

  // Aluno abre fórum; só a equipe publica aviso.
  const tipo = acesso.moderacao ? (req.body?.tipo === 'aviso' ? 'aviso' : 'forum') : 'forum';
  const titulo = String(req.body?.titulo || '').trim();
  const corpo = String(req.body?.corpo || '').trim();
  if (titulo.length < 3 || titulo.length > 160) throw httpError(400, 'O título deve ter entre 3 e 160 caracteres.');
  if (corpo.length > 4000) throw httpError(400, 'O texto pode ter até 4000 caracteres.');
  await exigirFiltro(req.user, `${titulo} ${corpo}`);

  const postId = await mural.criarPost({
    espacoTipo,
    espacoId: id,
    autorId: req.user.id,
    tipo,
    titulo,
    corpo
  });
  const post = await mural.buscarPost(postId);
  return res.status(201).json({ post: postDto(post) });
};

exports.detalharPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  const respostas = await mural.listarRespostas(post.id, { moderador: acesso.moderacao, userId: req.user.id });
  return res.json({
    post: postDto(post),
    respostas: respostas.map(respostaDto),
    podeModerar: acesso.moderacao,
    podeExpulsar: acesso.expulsar,
    podeResponder: true
  });
};

exports.responder = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  const corpo = String((req.body || {}).corpo || '').trim();
  if (corpo.length < 1 || corpo.length > 2000) throw httpError(400, 'A resposta deve ter entre 1 e 2000 caracteres.');
  await exigirFiltro(req.user, corpo);
  await mural.criarResposta({ postId: post.id, autorId: req.user.id, corpo });
  const respostas = await mural.listarRespostas(post.id, { moderador: acesso.moderacao, userId: req.user.id });
  return res.status(201).json({ respostas: respostas.map(respostaDto) });
};

// Ocultar/mostrar, fixar e resolver: a equipe modera; quem perguntou marca como resolvido.
exports.atualizarPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  const body = req.body || {};
  const campos = {};
  if (typeof body.fixado === 'boolean') {
    if (!acesso.moderacao) throw httpError(403, 'Só a equipe pode fixar uma publicação.');
    campos.fixado = body.fixado;
  }
  if (typeof body.ocultado === 'boolean') {
    if (!acesso.moderacao) throw httpError(403, 'Só a equipe pode ocultar uma publicação.');
    campos.ocultado = body.ocultado;
  }
  if (typeof body.resolvido === 'boolean') {
    if (!acesso.moderacao && post.autor_id !== req.user.id) {
      throw httpError(403, 'Só quem perguntou ou a equipe pode marcar como resolvida.');
    }
    campos.resolvido = body.resolvido;
  }
  if (!Object.keys(campos).length) throw httpError(400, 'Nada para atualizar.');
  await mural.atualizarPost(post.id, campos);
  const atualizado = await mural.buscarPost(post.id);
  return res.json({ post: postDto(atualizado) });
};

exports.excluirPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  if (post.autor_id !== req.user.id && !acesso.moderacao) {
    throw httpError(403, 'Você só pode excluir as suas publicações.');
  }
  await mural.excluirPost(post.id);
  return res.json({ ok: true });
};

exports.ocultarResposta = async (req, res) => {
  const resposta = await mural.buscarResposta(req.params.id);
  if (!resposta) throw httpError(404, 'Resposta não encontrada.');
  const acesso = await exigirEspaco(req.user, ...espacoDoRegistro(resposta));
  if (!acesso.moderacao) throw httpError(403, 'Só a equipe pode ocultar uma resposta.');
  await mural.atualizarResposta(resposta.id, { ocultada: Boolean(req.body?.ocultada) });
  return res.json({ ok: true });
};

exports.excluirResposta = async (req, res) => {
  const resposta = await mural.buscarResposta(req.params.id);
  if (!resposta) throw httpError(404, 'Resposta não encontrada.');
  const acesso = await exigirEspaco(req.user, ...espacoDoRegistro(resposta));
  if (resposta.autor_id !== req.user.id && !acesso.moderacao) {
    throw httpError(403, 'Você só pode excluir as suas respostas.');
  }
  await mural.excluirResposta(resposta.id);
  return res.json({ ok: true });
};

// Denúncia: qualquer participante do espaço pode denunciar uma publicação ou resposta de outra pessoa.
exports.denunciar = async (req, res) => {
  const postId = req.body?.postId ? String(req.body.postId) : null;
  const respostaId = req.body?.respostaId ? String(req.body.respostaId) : null;
  if (Boolean(postId) === Boolean(respostaId)) throw httpError(400, 'Informe a publicação ou a resposta denunciada.');
  const motivo = String(req.body?.motivo || '').trim().slice(0, MOTIVO_DENUNCIA_MAX);

  let autorAlvo;
  if (postId) {
    const { post } = await exigirPost(req.user, postId);
    autorAlvo = post.autor_id;
  } else {
    const resposta = await mural.buscarResposta(respostaId);
    if (!resposta) throw httpError(404, 'Resposta não encontrada.');
    await exigirEspaco(req.user, ...espacoDoRegistro(resposta));
    autorAlvo = resposta.autor_id;
  }
  if (autorAlvo === req.user.id) throw httpError(400, 'Você não pode denunciar o próprio conteúdo.');
  if (await mural.denunciaPendenteDeMim(req.user.id, postId, respostaId)) {
    throw httpError(409, 'Você já denunciou este conteúdo. A equipe vai analisar.');
  }

  await mural.criarDenuncia({ userId: req.user.id, postId, respostaId, motivo });
  return res.status(201).json({ ok: true });
};

// Moderação: denúncias pendentes ou decididas.
exports.listarDenuncias = async (req, res) => {
  const status = req.query.status === 'resolvida' ? 'resolvida' : 'pendente';
  const global = EQUIPE.includes(req.user.role);
  const denuncias = await mural.listarDenuncias({ userId: req.user.id, global, status });
  return res.json({ denuncias });
};

// Decisão: manter (sem ação), ocultar o conteúdo, ou ocultar e expulsar o autor do curso.
exports.decidirDenuncia = async (req, res) => {
  const decisao = String(req.body?.decisao || '');
  if (!['manter', 'ocultar', 'expulsar'].includes(decisao)) throw httpError(400, 'Decisão inválida.');
  const denuncia = await mural.buscarDenuncia(req.params.id);
  if (!denuncia) throw httpError(404, 'Denúncia não encontrada.');
  if (denuncia.status !== 'pendente') throw httpError(409, 'Esta denúncia já foi decidida.');

  const acesso = await exigirEspaco(req.user, ...espacoDoRegistro(denuncia));
  if (!acesso.moderacao) throw httpError(403, 'Você não modera este espaço.');
  if (decisao === 'expulsar' && !acesso.expulsar) throw httpError(403, 'Só a administração ou o docente do curso expulsa alunos.');

  if (decisao !== 'manter') {
    await mural.ocultarAlvo({ postId: denuncia.post_id, respostaId: denuncia.resposta_id });
  }
  if (decisao === 'expulsar') {
    const resultado = await expulsar(denuncia.curso_id, denuncia.alvo_autor_id, 'Expulso após denúncia no fórum.', req.user.id);
    if (resultado !== 'ok') throw httpError(409, mensagemExpulsao(resultado));
  }
  await mural.decidirDenuncia(denuncia.id, decisao, req.user.id);
  return res.json({ ok: true });
};

// Expulsão direta a partir de uma publicação ou resposta (administração ou docente do curso).
exports.expulsarAutor = async (req, res) => {
  const postId = req.body?.postId ? String(req.body.postId) : null;
  const respostaId = req.body?.respostaId ? String(req.body.respostaId) : null;
  const motivo = String(req.body?.motivo || '').trim().slice(0, MOTIVO_DENUNCIA_MAX);
  let alvo;
  if (postId) {
    const { post, acesso } = await exigirPost(req.user, postId);
    if (!acesso.expulsar) throw httpError(403, 'Só a administração ou o docente do curso expulsa alunos.');
    alvo = { cursoId: await mural.cursoDoPost(post.id), autorId: post.autor_id };
  } else if (respostaId) {
    const resposta = await mural.buscarResposta(respostaId);
    if (!resposta) throw httpError(404, 'Resposta não encontrada.');
    const acesso = await exigirEspaco(req.user, ...espacoDoRegistro(resposta));
    if (!acesso.expulsar) throw httpError(403, 'Só a administração ou o docente do curso expulsa alunos.');
    alvo = { cursoId: resposta.curso_id, autorId: resposta.autor_id };
  } else {
    throw httpError(400, 'Informe a publicação ou a resposta.');
  }
  if (alvo.autorId === req.user.id) throw httpError(400, 'Você não pode expulsar a si mesmo.');
  const resultado = await expulsar(alvo.cursoId, alvo.autorId, motivo || 'Expulso por desrespeito às regras do fórum.', req.user.id);
  if (resultado !== 'ok') throw httpError(409, mensagemExpulsao(resultado));
  return res.json({ ok: true });
};

async function expulsar(cursoId, userId, motivo, porId) {
  return mural.expulsarDoCurso({ cursoId, userId, motivo, porId });
}

function mensagemExpulsao(resultado) {
  if (resultado === 'docente') return 'Não é possível expulsar um docente do curso.';
  if (resultado === 'nao_aluno') return 'Só alunos podem ser removidos do curso.';
  return 'Não foi possível expulsar esta pessoa.';
}

// Filtro de palavras: lista visível para a moderação, alterada só pela administração.
exports.lerFiltro = async (req, res) => {
  return res.json({ palavras: await mural.listarPalavras() });
};

exports.salvarFiltro = async (req, res) => {
  const lista = Array.isArray(req.body?.palavras) ? req.body.palavras : [];
  const limpas = [...new Set(lista.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  if (limpas.some((item) => item.length < 2 || item.length > 40)) {
    throw httpError(400, 'Cada palavra deve ter entre 2 e 40 caracteres.');
  }
  if (limpas.length > 500) throw httpError(400, 'A lista pode ter no máximo 500 palavras.');
  await mural.substituirPalavras(limpas);
  return res.json({ palavras: limpas.sort() });
};
