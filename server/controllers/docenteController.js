const docente = require('../db/docenteRepo');
const presenca = require('../db/presencaRepo');
const httpError = require('../utils/httpError');
const { hojeSP } = require('../utils/periodo');

// Área do professor. Administração vê tudo; professor vê e altera só as turmas que ministra.

const ERROS = {
  turma_inexistente: [404, 'Turma não encontrada.'],
  periodo_obrigatorio: [400, 'Informe o período das aulas (data inicial e final).'],
  periodo_invalido: [400, 'A data final precisa ser depois da inicial.'],
  dias_obrigatorios: [400, 'Defina os dias da semana da turma ou escolha os dias.'],
  periodo_longo: [400, 'O período pode ter no máximo 400 dias.'],
  data_ocupada: [409, 'Já existe uma aula nessa data nesta turma.'],
  aula_inexistente: [404, 'Aula não encontrada.'],
  nada_para_alterar: [400, 'Nada para alterar.'],
  com_registros: [409, 'Esta aula já tem presença registrada. Cancele a aula em vez de removê-la.'],
  aluno_fora_da_turma: [400, 'Este aluno não está matriculado nesta turma.'],
  aula_invalida: [400, 'Aula não encontrada entre as suas turmas.'],
  aula_de_outro_dia: [400, 'O ponto só pode ser batido em aula de hoje.'],
  ponto_aberto: [409, 'Você já tem um ponto aberto. Registre a saída antes de entrar em outra aula.'],
  ja_registrada: [409, 'Você já bateu o ponto nesta aula.'],
  nao_encontrado: [404, 'Registro não encontrado.'],
  acao_invalida: [400, 'Ação em lote inválida.'],
  nenhuma_aula: [400, 'Selecione pelo menos uma aula.']
};

// Horário de Brasília (HH:MM) para mensagens.
function horaBr(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

// Converte o resultado do repositório (objeto com erro ou código em texto) em exceção HTTP.
function checar(resultado) {
  const codigo = typeof resultado === 'string' ? resultado : resultado?.erro;
  if (codigo && codigo !== 'ok') {
    const [status, mensagem] = ERROS[codigo] || [400, 'Não foi possível concluir a operação.'];
    throw httpError(status, mensagem);
  }
  return resultado;
}

const UUID = /^[0-9a-f-]{36}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function uuidOu404(valor) {
  if (!UUID.test(String(valor || ''))) throw httpError(404, 'Registro não encontrado.');
  return String(valor);
}

function dataValida(valor, campo) {
  const texto = String(valor || '');
  if (!DATA.test(texto) || Number.isNaN(Date.parse(`${texto}T00:00:00Z`))) {
    throw httpError(400, `${campo} inválida. Use o formato AAAA-MM-DD.`);
  }
  return texto;
}

function horaValida(valor, campo) {
  const texto = String(valor || '');
  if (!HORA.test(texto)) throw httpError(400, `${campo} inválido. Use o formato HH:MM.`);
  return texto;
}

function textoOpcional(valor, max, campo) {
  const texto = String(valor ?? '').trim();
  if (texto.length > max) throw httpError(400, `${campo} pode ter no máximo ${max} caracteres.`);
  return texto;
}

function isoValido(valor, campo) {
  if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
    throw httpError(400, `${campo} inválida.`);
  }
  return new Date(valor).toISOString();
}

// Confere se o usuário pode mexer na turma: administração sempre; professor só nas turmas que ministra.
async function exigirTurma(user, turmaId) {
  uuidOu404(turmaId);
  if (user.role === 'admin') return;
  if (!(await docente.professorDaTurma(user.id, turmaId))) {
    throw httpError(403, 'Você não ministra esta turma.');
  }
}

async function exigirAula(user, sessionId) {
  uuidOu404(sessionId);
  const turmaId = await docente.turmaDaAula(sessionId);
  if (!turmaId) throw httpError(404, 'Aula não encontrada.');
  await exigirTurma(user, turmaId);
  return turmaId;
}

// ---------- Turmas e cronograma ----------

exports.turmas = async (req, res) => {
  const turmas = req.user.role === 'admin'
    ? await docente.todasAsTurmas()
    : await docente.turmasDoProfessor(req.user.id);
  return res.json({ turmas });
};

exports.aulasDaTurma = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  const hoje = hojeSP();
  await presenca.fecharAulasVencidas(hoje);
  const [aulas, professores] = await Promise.all([
    docente.listarAulasDaTurma(turmaId, hoje),
    docente.professoresDaTurma(turmaId)
  ]);
  return res.json({ aulas, professores, hoje });
};

exports.gerarAulas = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  const body = req.body || {};
  const diasValidos = (lista) => (Array.isArray(lista) ? lista.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : []);
  const grade = Array.isArray(body.grade)
    ? body.grade.slice(0, 10).map((regra) => ({
        dias: diasValidos(regra?.dias),
        horario: regra?.horario ? horaRange(regra.horario) : ''
      }))
    : undefined;
  const resultado = checar(await docente.gerarAulas(turmaId, {
    inicio: body.inicio ? dataValida(body.inicio, 'Data inicial') : '',
    fim: body.fim ? dataValida(body.fim, 'Data final') : '',
    grade,
    dias: diasValidos(body.dias),
    horario: body.horario ? horaRange(body.horario) : '',
    modulo: textoOpcional(body.modulo, 120, 'Módulo'),
    titulo: textoOpcional(body.titulo, 200, 'Título')
  }));
  return res.status(201).json(resultado);
};

// Horário de aula no formato "HH:MM-HH:MM" (como o GT mostra).
function horaRange(valor) {
  const texto = String(valor).trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(texto)) {
    throw httpError(400, 'Horário inválido. Use o formato HH:MM-HH:MM.');
  }
  return texto;
}

// Edição em lote (administração): deslocar datas, horário, módulo, tópico, cancelar, reativar ou remover.
exports.editarLote = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  const body = req.body || {};
  const sessionIds = Array.isArray(body.sessionIds) ? body.sessionIds.filter((id) => UUID.test(String(id))) : [];
  if (!sessionIds.length) throw httpError(400, 'Selecione pelo menos uma aula.');
  const acao = String(body.acao || '');
  const parametros = {};
  if (acao === 'deslocar') {
    const dias = Number(body.dias);
    if (!Number.isInteger(dias) || dias === 0 || Math.abs(dias) > 365) {
      throw httpError(400, 'Informe quantos dias deslocar (de -365 a 365, diferente de zero).');
    }
    parametros.dias = dias;
  }
  if (acao === 'horario') parametros.horario = horaRange(body.horario);
  if (acao === 'modulo') parametros.modulo = textoOpcional(body.modulo, 120, 'Módulo');
  if (acao === 'titulo') parametros.titulo = textoOpcional(body.titulo, 200, 'Tópico');
  const resultado = await docente.editarLote(turmaId, { sessionIds, acao, ...parametros });
  if (resultado.erro === 'data_ocupada') {
    const datas = resultado.conflitos.map(dataBr).join(', ');
    throw httpError(409, datas
      ? `Este deslocamento cairia em datas que já têm aula: ${datas}. Nada foi alterado.`
      : 'Este deslocamento deixaria duas aulas no mesmo dia. Nada foi alterado.');
  }
  checar(resultado);
  return res.json(resultado);
};

function dataBr(iso) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

exports.criarAulaAvulsa = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  const body = req.body || {};
  const resultado = checar(await docente.criarAulaAvulsa(turmaId, {
    data: dataValida(body.data, 'Data'),
    horario: body.horario ? horaRange(body.horario) : '',
    modulo: textoOpcional(body.modulo, 120, 'Módulo'),
    titulo: textoOpcional(body.titulo, 200, 'Título')
  }));
  return res.status(201).json(resultado);
};

exports.importarAulas = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  const entrada = Array.isArray(req.body?.linhas) ? req.body.linhas.slice(0, 500) : [];
  if (!entrada.length) throw httpError(400, 'Nenhuma linha para importar.');
  const linhas = entrada.map((linha, indice) => ({
    data: dataValida(linha?.data, `Linha ${indice + 1}: data`),
    horario: linha?.horario ? horaRange(linha.horario) : '',
    modulo: textoOpcional(linha?.modulo, 120, `Linha ${indice + 1}: módulo`),
    titulo: textoOpcional(linha?.titulo, 200, `Linha ${indice + 1}: título`)
  }));
  const resultado = checar(await docente.importarAulas(turmaId, linhas));
  return res.status(201).json(resultado);
};

exports.preencherModulos = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  return res.json(checar(await docente.preencherModulos(turmaId)));
};

exports.atualizarAula = async (req, res) => {
  const sessionId = uuidOu404(req.params.sessionId);
  await exigirAula(req.user, sessionId);
  const body = req.body || {};
  const campos = {};
  if (body.data !== undefined) campos.data = dataValida(body.data, 'Data');
  if (body.horario !== undefined) campos.horario = body.horario ? horaRange(body.horario) : '';
  if (body.modulo !== undefined) campos.modulo = textoOpcional(body.modulo, 120, 'Módulo');
  if (body.titulo !== undefined) campos.titulo = textoOpcional(body.titulo, 200, 'Título');
  checar(await docente.atualizarAula(sessionId, campos));
  return res.json({ ok: true });
};

exports.cancelarAula = async (req, res) => {
  const sessionId = uuidOu404(req.params.sessionId);
  await exigirAula(req.user, sessionId);
  if (typeof req.body?.cancelada !== 'boolean') throw httpError(400, 'Informe se a aula está cancelada (true ou false).');
  checar(await docente.definirCancelamento(sessionId, req.body.cancelada));
  return res.json({ ok: true });
};

exports.removerAula = async (req, res) => {
  const sessionId = uuidOu404(req.params.sessionId);
  await exigirAula(req.user, sessionId);
  checar(await docente.removerAula(sessionId));
  return res.json({ ok: true });
};

// ---------- Presença por aula ----------

exports.presencaDaAula = async (req, res) => {
  const sessionId = uuidOu404(req.params.sessionId);
  await exigirAula(req.user, sessionId);
  await presenca.fecharAulasVencidas(hojeSP());
  return res.json({ alunos: await docente.presencaDaAula(sessionId) });
};

const STATUS_PRESENCA = ['presente', 'ausente', 'justificado'];

exports.marcarPresenca = async (req, res) => {
  const sessionId = uuidOu404(req.params.sessionId);
  const userId = uuidOu404(req.params.userId);
  await exigirAula(req.user, sessionId);
  const status = req.body?.status ?? null;
  if (status !== null && !STATUS_PRESENCA.includes(status)) {
    throw httpError(400, 'Status inválido. Use presente, ausente, justificado ou nulo para limpar.');
  }
  checar(await docente.marcarPresencaGestao(sessionId, userId, status, req.user.id));
  return res.json({ ok: true });
};

// ---------- Vínculo professor–turma (administração) ----------

exports.professoresDaTurma = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  return res.json({ professores: await docente.professoresDaTurma(turmaId) });
};

exports.definirProfessores = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.filter((id) => UUID.test(String(id))) : null;
  if (!userIds) throw httpError(400, 'Informe a lista de professores.');
  checar(await docente.definirProfessoresTurma(turmaId, userIds));
  return res.json({ professores: await docente.professoresDaTurma(turmaId) });
};

exports.listarProfessores = async (req, res) => res.json({ professores: await docente.listarProfessores() });

// ---------- Perfil do professor ----------

exports.perfil = async (req, res) => {
  const [turmas, aulas] = await Promise.all([
    docente.turmasDoProfessor(req.user.id),
    docente.aulasQueMinistra(req.user.id)
  ]);
  return res.json({ turmas, aulas });
};

// A turma como o aluno vê (cronograma sem presença).
exports.cronogramaComoAluno = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  await exigirTurma(req.user, turmaId);
  return res.json({ aulas: await docente.cronogramaDaTurmaComoAluno(turmaId, hojeSP()) });
};

// Arquivos do perfil: imagem ou PDF, até 2 MB, conferidos pelos primeiros bytes.
const LIMITE_ARQUIVO = 2 * 1024 * 1024;
const ASSINATURAS = [
  { tipo: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { tipo: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { tipo: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }
];

function tipoDoArquivo(buffer) {
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  const encontrado = ASSINATURAS.find((a) => a.bytes.every((b, i) => buffer[i] === b));
  return encontrado ? encontrado.tipo : null;
}

exports.listarArquivos = async (req, res) => res.json({ arquivos: await docente.listarArquivos(req.user.id) });

exports.enviarArquivo = async (req, res) => {
  const nome = textoOpcional(req.body?.nome, 180, 'Nome do arquivo');
  if (!nome) throw httpError(400, 'Informe o nome do arquivo.');
  const bruto = String(req.body?.dados || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(bruto, 'base64');
  if (!buffer.length) throw httpError(400, 'Arquivo vazio.');
  if (buffer.length > LIMITE_ARQUIVO) throw httpError(400, 'O arquivo pode ter no máximo 2 MB.');
  const tipo = tipoDoArquivo(buffer);
  if (!tipo) throw httpError(400, 'Envie uma imagem (PNG, JPG, GIF ou WEBP) ou um PDF.');
  const arquivo = await docente.criarArquivo(req.user.id, {
    nome,
    tipo,
    tamanho: buffer.length,
    dados: buffer.toString('base64')
  });
  return res.status(201).json({ arquivo });
};

exports.baixarArquivo = async (req, res) => {
  const arquivoId = uuidOu404(req.params.arquivoId);
  const arquivo = await docente.arquivoDoProfessor(req.user.id, arquivoId);
  if (!arquivo) throw httpError(404, 'Arquivo não encontrado.');
  return res.json({ arquivo });
};

exports.removerArquivo = async (req, res) => {
  const arquivoId = uuidOu404(req.params.arquivoId);
  checar(await docente.removerArquivo(req.user.id, arquivoId));
  return res.json({ ok: true });
};

// ---------- Ponto (sem GPS) ----------

function periodoDoRequest(query) {
  const hoje = hojeSP();
  const de = query.de ? dataValida(query.de, 'Data inicial') : `${hoje.slice(0, 8)}01`;
  const ate = query.ate ? dataValida(query.ate, 'Data final') : hoje;
  if (ate < de) throw httpError(400, 'A data final precisa ser depois da inicial.');
  return { de, ate };
}

exports.pontoHoje = async (req, res) => {
  const hoje = hojeSP();
  return res.json({ hoje, ...(await docente.pontoDoDia(req.user.id, hoje)) });
};

exports.entrada = async (req, res) => {
  const sessionId = uuidOu404(req.body?.sessionId);
  const resultado = await docente.registrarEntrada(req.user.id, sessionId, hojeSP());
  if (resultado.erro === 'entrada_antes_da_janela') {
    throw httpError(409, `A entrada desta aula libera às ${horaBr(resultado.abre)}.`);
  }
  if (resultado.erro === 'entrada_depois_da_janela') {
    throw httpError(409, `A janela de entrada desta aula encerrou às ${horaBr(resultado.fecha)}.`);
  }
  checar(resultado);
  return res.status(201).json(resultado);
};

exports.saida = async (req, res) => {
  const pontoId = uuidOu404(req.params.pontoId);
  checar(await docente.registrarSaida(req.user.id, pontoId));
  return res.json({ ok: true });
};

exports.aulaExtra = async (req, res) => {
  const body = req.body || {};
  const turmaId = body.turmaId ? uuidOu404(body.turmaId) : null;
  if (turmaId) await exigirTurma(req.user, turmaId);
  const titulo = textoOpcional(body.titulo, 200, 'Título');
  const observacao = textoOpcional(body.observacao, 1000, 'Observação');
  if (!titulo) throw httpError(400, 'Informe o título da aula extra.');
  if (!observacao) throw httpError(400, 'Informe a observação da aula extra.');
  const inicio = horaValida(body.inicio, 'Horário de início');
  const fim = horaValida(body.fim, 'Horário de término');
  if (fim <= inicio) throw httpError(400, 'O término precisa ser depois do início.');
  const resultado = checar(await docente.registrarAulaExtra(req.user.id, {
    turmaId,
    data: body.data ? dataValida(body.data, 'Data') : hojeSP(),
    inicio,
    fim,
    titulo,
    observacao
  }));
  return res.status(201).json(resultado);
};

exports.historicoPonto = async (req, res) => {
  const { de, ate } = periodoDoRequest(req.query);
  return res.json({ de, ate, ...(await docente.historicoPonto(req.user.id, de, ate)) });
};

exports.gestaoPonto = async (req, res) => {
  const { de, ate } = periodoDoRequest(req.query);
  const professorId = req.query.professorId ? uuidOu404(req.query.professorId) : null;
  const registros = await docente.listarPontoGestao({ professorId, de, ate });
  return res.json({ de, ate, registros, professores: await docente.listarProfessores() });
};

// Campo de CSV: aspas quando há separador, aspas ou quebra de linha.
function celulaCsv(valor) {
  const texto = String(valor ?? '');
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function duracaoHM(minutos) {
  if (minutos === null || minutos === undefined) return '';
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

// Exportação para a coordenação (base da folha): um registro por linha e o total de cada professor.
// Separador ponto e vírgula e BOM, para abrir direto no Excel em português.
exports.exportarPontoGestao = async (req, res) => {
  const { de, ate } = periodoDoRequest(req.query);
  const professorId = req.query.professorId ? uuidOu404(req.query.professorId) : null;
  const registros = await docente.listarPontoGestao({ professorId, de, ate });

  const linhas = [['Professor', 'Data', 'Tipo', 'Turma / título', 'Entrada', 'Saída', 'Duração (h:mm)', 'Minutos', 'Observação', 'Corrigido pela gestão']];
  for (const r of registros) {
    linhas.push([
      r.professor,
      dataBr(r.data),
      r.tipo === 'extra' ? 'Extra' : 'Aula',
      r.tipo === 'extra' ? `${r.titulo || 'Aula extra'}${r.turma ? ` · ${r.turma}` : ''}` : r.turma || '',
      r.entrada ? horaBr(r.entrada) : '',
      r.saida ? horaBr(r.saida) : 'aberto',
      duracaoHM(r.minutos),
      r.minutos ?? '',
      r.observacao,
      r.corrigido ? 'sim' : 'não'
    ]);
  }

  const totais = new Map();
  for (const r of registros) {
    if (r.minutos === null) continue;
    totais.set(r.professor, (totais.get(r.professor) || 0) + r.minutos);
  }
  linhas.push([]);
  linhas.push(['Total por professor', '', '', '', '', '', 'Duração (h:mm)', 'Minutos']);
  for (const [nome, minutos] of [...totais.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))) {
    linhas.push([nome, '', '', '', '', '', duracaoHM(minutos), minutos]);
  }

  const conteudo = '﻿' + linhas.map((linha) => linha.map(celulaCsv).join(';')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ponto-professores-${de}-a-${ate}.csv"`);
  return res.send(conteudo);
};

// Link da aula ao vivo da turma (administração). Aceita só http(s); vazio remove o link.
exports.definirLink = async (req, res) => {
  const turmaId = uuidOu404(req.params.turmaId);
  const link = String(req.body?.linkAoVivo ?? '').trim();
  if (link && (!/^https?:\/\//i.test(link) || link.length > 500)) {
    throw httpError(400, 'Informe um link que comece com https:// (até 500 caracteres).');
  }
  checar(await docente.definirLinkTurma(turmaId, link));
  return res.json({ ok: true, linkAoVivo: link });
};