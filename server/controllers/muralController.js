const mural = require("../db/muralRepo");
const httpError = require("../utils/httpError");

const TIPOS = ["aviso", "duvida"];

// Quem é a pessoa para exibir: aluno ou equipe. Sem e-mail e sem dados de conta.
function autorDto(row) {
  return {
    id: row.autor_id,
    nome: row.autor_nome,
    papel: row.autor_role === "student" ? "aluno" : "equipe",
  };
}

function postDto(row) {
  return {
    id: row.id,
    turmaId: row.turma_id,
    tipo: row.tipo,
    titulo: row.titulo,
    corpo: row.corpo,
    fixado: row.fixado,
    resolvido: row.resolvido,
    respostas: row.respostas ?? 0,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
    autor: autorDto(row),
  };
}

function respostaDto(row) {
  return {
    id: row.id,
    corpo: row.corpo,
    criadaEm: row.created_at,
    autor: autorDto({ autor_id: row.autor_id, autor_nome: row.autor_nome, autor_role: row.autor_role }),
  };
}

// Verifica acesso a uma turma. Sem leitura, responde como se a turma não existisse para a pessoa.
async function exigirLeitura(user, turmaId) {
  const acesso = await mural.acessoDaTurma(user.id, user.role, turmaId);
  if (!acesso || !acesso.leitura) throw httpError(404, "Turma não encontrada.");
  return acesso;
}

async function exigirPost(user, postId) {
  const post = await mural.buscarPost(postId);
  if (!post) throw httpError(404, "Publicação não encontrada.");
  const acesso = await exigirLeitura(user, post.turma_id);
  return { post, acesso };
}

exports.listarTurmas = async (req, res) => {
  const turmas = await mural.turmasDoUsuario(req.user.id, req.user.role);
  return res.json({
    turmas: turmas.map((t) => ({ id: t.id, nome: t.nome, modalidade: t.modalidade, curso: t.curso })),
  });
};

exports.listarPosts = async (req, res) => {
  const acesso = await exigirLeitura(req.user, req.params.turmaId);
  const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
  const posts = await mural.listarPosts(req.params.turmaId, tipo);
  return res.json({
    posts: posts.map(postDto),
    podeAvisar: acesso.moderacao,
  });
};

exports.criarPost = async (req, res) => {
  const acesso = await exigirLeitura(req.user, req.params.turmaId);
  const { tipo = "duvida", titulo = "", corpo = "" } = req.body || {};
  if (!TIPOS.includes(tipo)) throw httpError(400, "Tipo de publicação inválido.");
  if (tipo === "aviso" && !acesso.moderacao) {
    throw httpError(403, "Só a equipe da turma publica avisos.");
  }
  const tituloLimpo = String(titulo).trim();
  if (tituloLimpo.length < 3 || tituloLimpo.length > 160) {
    throw httpError(400, "O título deve ter entre 3 e 160 caracteres.");
  }
  const corpoLimpo = String(corpo).trim();
  if (corpoLimpo.length > 4000) throw httpError(400, "O texto pode ter até 4000 caracteres.");

  const id = await mural.criarPost({
    turmaId: req.params.turmaId,
    autorId: req.user.id,
    tipo,
    titulo: tituloLimpo,
    corpo: corpoLimpo,
  });
  const post = await mural.buscarPost(id);
  return res.status(201).json({ post: postDto(post) });
};

exports.detalharPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  const respostas = await mural.listarRespostas(post.id);
  return res.json({
    post: postDto(post),
    respostas: respostas.map(respostaDto),
    podeModerar: acesso.moderacao,
    podeResponder: true,
  });
};

exports.responder = async (req, res) => {
  const { post } = await exigirPost(req.user, req.params.id);
  const corpo = String((req.body || {}).corpo || "").trim();
  if (corpo.length < 1 || corpo.length > 2000) {
    throw httpError(400, "A resposta deve ter entre 1 e 2000 caracteres.");
  }
  await mural.criarResposta({ postId: post.id, autorId: req.user.id, corpo });
  const respostas = await mural.listarRespostas(post.id);
  return res.status(201).json({ respostas: respostas.map(respostaDto) });
};

// Fixar é da equipe. Marcar como resolvida: quem perguntou ou a equipe.
exports.atualizarPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  const body = req.body || {};
  const campos = {};
  if (typeof body.fixado === "boolean") {
    if (!acesso.moderacao) throw httpError(403, "Só a equipe pode fixar uma publicação.");
    campos.fixado = body.fixado;
  }
  if (typeof body.resolvido === "boolean") {
    if (!acesso.moderacao && post.autor_id !== req.user.id) {
      throw httpError(403, "Só quem perguntou ou a equipe pode marcar como resolvida.");
    }
    campos.resolvido = body.resolvido;
  }
  if (!Object.keys(campos).length) throw httpError(400, "Nada para atualizar.");
  await mural.atualizarPost(post.id, campos);
  const atualizado = await mural.buscarPost(post.id);
  return res.json({ post: postDto(atualizado) });
};

// Excluir: a própria pessoa ou a equipe da turma.
exports.excluirPost = async (req, res) => {
  const { post, acesso } = await exigirPost(req.user, req.params.id);
  if (post.autor_id !== req.user.id && !acesso.moderacao) {
    throw httpError(403, "Você só pode excluir as suas publicações.");
  }
  await mural.excluirPost(post.id);
  return res.json({ ok: true });
};

exports.excluirResposta = async (req, res) => {
  const resposta = await mural.buscarResposta(req.params.id);
  if (!resposta) throw httpError(404, "Resposta não encontrada.");
  const acesso = await exigirLeitura(req.user, resposta.turma_id);
  if (resposta.autor_id !== req.user.id && !acesso.moderacao) {
    throw httpError(403, "Você só pode excluir as suas respostas.");
  }
  await mural.excluirResposta(resposta.id);
  return res.json({ ok: true });
};
