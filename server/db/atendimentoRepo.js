const { query } = require('./pool');

// Atendimento: sessão do aluno, mensagens, robô de perguntas frequentes e atendimento pela gestão.

const MSG_REDIRECT =
  'Sua mensagem foi encaminhada para a nossa equipe. Em breve um atendente entrará em contato com você aqui mesmo. 😊';
const MSG_SEM_RESPOSTA =
  'Não encontrei uma resposta para essa pergunta. Escolha um assunto abaixo ou clique em *Falar com a equipe*.';
const BOAS_VINDAS =
  'Olá! 👋 Sou o assistente virtual do *Geração Tech*.\n\nEscolha um assunto abaixo ou escreva sua dúvida. Se eu não conseguir te ajudar, clique em *Falar com a equipe* e um atendente responde por aqui. 😊';

// Frases que transferem a conversa para a equipe (comparadas sem acento e sem maiúsculas).
const PALAVRAS_HUMANO = [
  'falar com humano',
  'falar com pessoa',
  'falar com a equipe',
  'falar com equipe',
  'atendimento humano',
  'atendente',
  'humano',
  'pessoa real',
  'quero falar com alguem'
];

function normTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function pediuHumano(texto) {
  const n = normTexto(texto);
  return PALAVRAS_HUMANO.some((p) => n.includes(normTexto(p)));
}

// Entre as perguntas ativas, escolhe a que tem a palavra-chave mais longa presente na mensagem.
function encontrarFaq(texto, faqs) {
  const n = normTexto(texto);
  let melhor = null;
  let melhorScore = 0;
  for (const item of faqs) {
    for (const palavra of item.palavras.split(',')) {
      const p = normTexto(palavra);
      if (p && n.includes(p) && p.length > melhorScore) {
        melhorScore = p.length;
        melhor = item;
      }
    }
  }
  return melhor;
}

async function faqAtivas() {
  const { rows } = await query(
    'select id, titulo, palavras, resposta from atendimento_faq where ativo = true order by ordem, titulo'
  );
  return rows;
}

function mapMensagem(row) {
  const base = {
    id: Number(row.id),
    remetente: row.remetente,
    conteudo: row.conteudo,
    autorNome: row.autor_nome || null,
    createdAt: row.created_at,
    tipo: row.tipo || 'texto'
  };
  if (base.tipo === 'arquivo') {
    base.anexo = { nome: row.anexo_nome, tipo: row.anexo_tipo, tamanho: row.anexo_tamanho };
  }
  return base;
}

function mapSessao(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    naoLidasGestao: row.nao_lidas_gestao,
    naoLidasAluno: row.nao_lidas_aluno,
    ultimaMensagemEm: row.ultima_mensagem_em,
    createdAt: row.created_at,
    finalizadoEm: row.finalizado_em,
    aluno: row.aluno_nome ? { nome: row.aluno_nome, email: row.aluno_email } : undefined,
    ultimaTexto: row.ultima_texto,
    atendenteNome: row.atendente_nome || null
  };
}

async function inserirMensagem(sessaoId, remetente, conteudo, autorId = null) {
  const { rows } = await query(
    `insert into atendimento_mensagens (sessao_id, remetente, conteudo, autor_id)
     values ($1, $2, $3, $4) returning id, remetente, conteudo, created_at`,
    [sessaoId, remetente, conteudo, autorId]
  );
  await query('update atendimento_sessoes set ultima_mensagem_em = now() where id = $1', [sessaoId]);
  return mapMensagem(rows[0]);
}

// Sessão ativa do aluno. Se não houver, abre uma nova com a mensagem de boas-vindas.
async function sessaoDoAluno(userId) {
  let { rows } = await query(
    `select * from atendimento_sessoes where user_id = $1 and status <> 'finalizado' limit 1`,
    [userId]
  );
  if (!rows[0]) {
    const criada = await query(
      `insert into atendimento_sessoes (user_id) values ($1)
       on conflict (user_id) where status <> 'finalizado' do nothing
       returning id`,
      [userId]
    );
    if (criada.rows[0]) {
      await inserirMensagem(criada.rows[0].id, 'sistema', BOAS_VINDAS);
    }
    ({ rows } = await query(
      `select * from atendimento_sessoes where user_id = $1 and status <> 'finalizado' limit 1`,
      [userId]
    ));
  }
  return rows[0];
}

// Anexo com os bytes, para mostrar ou baixar. Quem pode ver é checado na rota.
async function anexoDaMensagem(mensagemId) {
  const { rows } = await query(
    `select m.id, m.sessao_id, m.anexo_nome, m.anexo_tipo, m.anexo_dados, s.user_id
       from atendimento_mensagens m join atendimento_sessoes s on s.id = m.sessao_id
      where m.id = $1 and m.tipo = 'arquivo'`,
    [mensagemId]
  );
  return rows[0] || null;
}

async function inserirAnexo(sessaoId, remetente, { nome, tipo, tamanho, dados }, autorId = null) {
  const { rows } = await query(
    `insert into atendimento_mensagens (sessao_id, remetente, conteudo, autor_id, tipo, anexo_nome, anexo_tipo, anexo_tamanho, anexo_dados)
     values ($1, $2, $3, $4, 'arquivo', $5, $6, $7, $8) returning id, remetente, conteudo, created_at`,
    [sessaoId, remetente, nome, autorId, nome, tipo, tamanho, dados]
  );
  await query('update atendimento_sessoes set ultima_mensagem_em = now() where id = $1', [sessaoId]);
  return mapMensagem({ ...rows[0], tipo: 'arquivo', anexo_nome: nome, anexo_tipo: tipo, anexo_tamanho: tamanho });
}

async function mensagensDepois(sessaoId, desde = 0, limite = 200) {
  const { rows } = await query(
    `select m.id, m.remetente, m.conteudo, m.created_at, m.tipo, m.anexo_nome, m.anexo_tipo, m.anexo_tamanho, u.name as autor_nome
       from atendimento_mensagens m
       left join users u on u.id = m.autor_id
      where m.sessao_id = $1 and m.id > $2
      order by m.id desc limit $3`,
    [sessaoId, desde, limite]
  );
  return rows.reverse().map(mapMensagem);
}

async function marcarLidaPelaGestao(sessaoId) {
  await query('update atendimento_sessoes set nao_lidas_gestao = 0 where id = $1', [sessaoId]);
}

// Mensagem do aluno. O robô responde (status bot), ou a conversa é transferida para a equipe.
// Documento enviado pelo aluno. Se o robô ainda estiver respondendo, a conversa vai para a equipe.
async function anexoDoAluno(sessao, anexo) {
  const msg = await inserirAnexo(sessao.id, 'aluno', anexo, sessao.user_id);
  await query('update atendimento_sessoes set nao_lidas_gestao = nao_lidas_gestao + 1 where id = $1', [sessao.id]);
  if (sessao.status === 'bot') {
    await transferirParaEquipe(sessao.id);
  }
  return msg;
}

// Documento enviado pela equipe ao aluno.
async function anexoDaEquipe(sessaoId, adminId, anexo) {
  await query(
    `update atendimento_sessoes set status = 'aberto', atendente_id = $2, nao_lidas_aluno = nao_lidas_aluno + 1 where id = $1`,
    [sessaoId, adminId]
  );
  return inserirAnexo(sessaoId, 'admin', anexo, adminId);
}

async function enviarMensagemAluno(sessao, texto) {
  await inserirMensagem(sessao.id, 'aluno', texto, sessao.user_id);
  await query('update atendimento_sessoes set nao_lidas_gestao = nao_lidas_gestao + 1 where id = $1', [sessao.id]);

  if (sessao.status !== 'bot') return;
  if (pediuHumano(texto)) {
    await transferirParaEquipe(sessao.id);
    return;
  }
  const faq = encontrarFaq(texto, await faqAtivas());
  await inserirMensagem(sessao.id, 'sistema', faq ? faq.resposta : MSG_SEM_RESPOSTA);
}

// Aluno escolhe um assunto pronto do menu. Só funciona enquanto o robô está respondendo.
async function escolherAssunto(sessao, faqId) {
  const { rows } = await query('select titulo, resposta from atendimento_faq where id = $1 and ativo = true', [faqId]);
  if (!rows[0]) return 'nao_encontrado';
  if (sessao.status !== 'bot') return 'com_equipe';
  await inserirMensagem(sessao.id, 'aluno', rows[0].titulo, sessao.user_id);
  await query('update atendimento_sessoes set nao_lidas_gestao = nao_lidas_gestao + 1 where id = $1', [sessao.id]);
  await inserirMensagem(sessao.id, 'sistema', rows[0].resposta);
  return 'ok';
}

async function transferirParaEquipe(sessaoId) {
  await query(`update atendimento_sessoes set status = 'aberto' where id = $1 and status = 'bot'`, [sessaoId]);
  await inserirMensagem(sessaoId, 'sistema', MSG_REDIRECT);
}

// Botão "Falar com a equipe": registra o pedido e transfere a conversa.
async function pedirEquipe(sessao) {
  if (sessao.status !== 'bot') return 'ja_transferida';
  await inserirMensagem(sessao.id, 'aluno', 'Falar com a equipe', sessao.user_id);
  await query('update atendimento_sessoes set nao_lidas_gestao = nao_lidas_gestao + 1 where id = $1', [sessao.id]);
  await transferirParaEquipe(sessao.id);
  return 'ok';
}

// ── Gestão ─────────────────────────────────────────────────────────────

// Arquivados saem da lista de finalizados e de "todos" (ficam só no filtro próprio).
const FILTROS_STATUS = {
  abertos: `s.status = 'aberto'`,
  robo: `s.status = 'bot'`,
  finalizados: `s.status = 'finalizado' and s.arquivado_em is null`,
  arquivados: `s.status = 'finalizado' and s.arquivado_em is not null`,
  todos: 's.arquivado_em is null'
};

async function listarSessoes(filtro) {
  const where = FILTROS_STATUS[filtro] || FILTROS_STATUS.abertos;
  const { rows } = await query(
    `select s.*, u.name as aluno_nome, u.email as aluno_email, a.name as atendente_nome,
            (select m.conteudo from atendimento_mensagens m where m.sessao_id = s.id order by m.id desc limit 1) as ultima_texto
       from atendimento_sessoes s
       join users u on u.id = s.user_id
       left join users a on a.id = s.atendente_id
      where ${where}
      order by (s.status = 'aberto') desc, s.nao_lidas_gestao desc, s.ultima_mensagem_em desc
      limit 200`
  );
  return rows.map(mapSessao);
}

async function detalheSessao(sessaoId) {
  const { rows } = await query(
    `select s.*, u.name as aluno_nome, u.email as aluno_email, a.name as atendente_nome, null as ultima_texto
       from atendimento_sessoes s
       join users u on u.id = s.user_id
       left join users a on a.id = s.atendente_id
      where s.id = $1`,
    [sessaoId]
  );
  return rows[0] ? mapSessao(rows[0]) : null;
}

async function responderComoEquipe(sessaoId, adminId, texto) {
  const { rows } = await query('select status from atendimento_sessoes where id = $1', [sessaoId]);
  if (!rows[0]) return 'nao_encontrada';
  if (rows[0].status === 'finalizado') return 'finalizada';
  await query(
    `update atendimento_sessoes set status = 'aberto', atendente_id = $2, nao_lidas_aluno = nao_lidas_aluno + 1 where id = $1`,
    [sessaoId, adminId]
  );
  return inserirMensagem(sessaoId, 'admin', texto, adminId);
}

// Só conversa já finalizada pode ser arquivada. Devolve false se não estiver nesse estado.
async function arquivarSessao(sessaoId) {
  const { rowCount } = await query(
    `update atendimento_sessoes set arquivado_em = now()
      where id = $1 and status = 'finalizado' and arquivado_em is null`,
    [sessaoId]
  );
  return rowCount > 0;
}

async function finalizarSessao(sessaoId) {
  const { rowCount } = await query(
    `update atendimento_sessoes set status = 'finalizado', finalizado_em = now() where id = $1 and status <> 'finalizado'`,
    [sessaoId]
  );
  if (!rowCount) return false;
  await inserirMensagem(
    sessaoId,
    'sistema',
    'Atendimento encerrado. Se precisar de mais alguma coisa, é só enviar uma nova mensagem.'
  );
  return true;
}

// ── Perguntas frequentes (gestão) ──────────────────────────────────────

function mapFaq(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    palavras: row.palavras,
    resposta: row.resposta,
    ativo: row.ativo,
    revisado: row.revisado,
    ordem: row.ordem
  };
}

async function listarFaq() {
  const { rows } = await query('select * from atendimento_faq order by ordem, titulo');
  return rows.map(mapFaq);
}

async function salvarFaq(id, dados) {
  const campos = [dados.titulo, dados.palavras, dados.resposta, dados.ativo, dados.revisado, dados.ordem];
  if (id) {
    const { rows } = await query(
      `update atendimento_faq
          set titulo = $2, palavras = $3, resposta = $4, ativo = $5, revisado = $6, ordem = $7, updated_at = now()
        where id = $1 returning *`,
      [id, ...campos]
    );
    return rows[0] ? mapFaq(rows[0]) : null;
  }
  const { rows } = await query(
    `insert into atendimento_faq (titulo, palavras, resposta, ativo, revisado, ordem)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    campos
  );
  return mapFaq(rows[0]);
}

async function removerFaq(id) {
  const { rowCount } = await query('delete from atendimento_faq where id = $1', [id]);
  return rowCount > 0;
}

// Números para acompanhamento: fila atual e encerrados no dia e nos últimos 7 dias.
async function resumoGestao() {
  const { rows } = await query(
    `select
       count(*) filter (where status = 'aberto')::int as aguardando,
       count(*) filter (where status = 'aberto' and nao_lidas_gestao > 0)::int as com_novas,
       count(*) filter (where status = 'bot')::int as robo,
       count(*) filter (where status = 'finalizado' and finalizado_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')::int as finalizados_hoje,
       count(*) filter (where status = 'finalizado' and finalizado_em >= now() - interval '7 days')::int as finalizados_7_dias,
       round(avg(extract(epoch from (finalizado_em - created_at)) / 60) filter (where status = 'finalizado' and finalizado_em >= now() - interval '7 days'))::int as minutos_medios_7_dias,
       count(distinct user_id) filter (where created_at >= now() - interval '7 days')::int as alunos_7_dias
       from atendimento_sessoes`
  );
  const r = rows[0];
  return {
    aguardando: r.aguardando,
    comNovas: r.com_novas,
    robo: r.robo,
    finalizadosHoje: r.finalizados_hoje,
    finalizados7Dias: r.finalizados_7_dias,
    minutosMedios7Dias: r.minutos_medios_7_dias,
    alunos7Dias: r.alunos_7_dias
  };
}

module.exports = {
  anexoDaMensagem,
  anexoDoAluno,
  anexoDaEquipe,
  resumoGestao,
  MSG_REDIRECT,
  pediuHumano,
  encontrarFaq,
  faqAtivas,
  sessaoDoAluno,
  mensagensDepois,
  enviarMensagemAluno,
  escolherAssunto,
  pedirEquipe,
  listarSessoes,
  detalheSessao,
  marcarLidaPelaGestao,
  responderComoEquipe,
  finalizarSessao,
  arquivarSessao,
  listarFaq,
  salvarFaq,
  removerFaq
};
