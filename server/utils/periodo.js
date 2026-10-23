// Datas do calendário do Geração Tech (portado do cronograma oficial do GT).
const FERIADOS = [
  '2026-09-07', // Independência do Brasil
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-15' // Proclamação da República
];

const SEMANA = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, sáb: 6 };

// Lê os dias da turma em texto ("Seg/Qua") ou em números ("1,3,5"). Devolve os números do getUTCDay().
function diasDaTurma(texto) {
  const dias = new Set();
  for (const parte of String(texto || '').toLowerCase().split(/[\s/,;|-]+/)) {
    if (!parte) continue;
    if (/^[0-6]$/.test(parte)) dias.add(Number(parte));
    else if (parte.slice(0, 3) in SEMANA) dias.add(SEMANA[parte.slice(0, 3)]);
  }
  return dias;
}

// Datas ISO entre duas datas (inclusive) cujo dia da semana está em `dias` e que não são feriado.
function datasDeAula(dias, inicioISO, fimISO) {
  const feriados = new Set(FERIADOS);
  const cursor = new Date(`${inicioISO}T00:00:00Z`);
  const fim = new Date(`${fimISO}T00:00:00Z`);
  const datas = [];
  while (cursor <= fim) {
    const iso = cursor.toISOString().slice(0, 10);
    if (dias.has(cursor.getUTCDay()) && !feriados.has(iso)) datas.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return datas;
}

// Feriados que cairiam nos dias da semana escolhidos dentro do período (para informar na geração).
function feriadosNoPeriodo(dias, inicioISO, fimISO) {
  return FERIADOS.filter((iso) => iso >= inicioISO && iso <= fimISO && dias.has(new Date(iso + "T00:00:00Z").getUTCDay()));
}


// Janela de entrada do ponto: abre 30 min antes do início da aula e fecha no fim dela (horário de Brasília, UTC-3).
// Aula sem horário definido vale o dia inteiro.
const TOLERANCIA_ENTRADA_MIN = 30;
function janelaDaAula(dataISO, horario) {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(String(horario || "").trim());
  if (!m) {
    return { abre: new Date(`${dataISO}T00:00:00-03:00`), fecha: new Date(`${dataISO}T23:59:59-03:00`), semHorario: true };
  }
  const abre = new Date(`${dataISO}T${m[1]}:${m[2]}:00-03:00`);
  abre.setMinutes(abre.getMinutes() - TOLERANCIA_ENTRADA_MIN);
  const fecha = new Date(`${dataISO}T${m[3]}:${m[4]}:00-03:00`);
  return { abre, fecha, semHorario: false };
}

function situacaoJanela(janela, agora = new Date()) {
  if (agora < janela.abre) return "antes";
  if (agora > janela.fecha) return "depois";
  return "aberta";
}

// "Hoje" em Brasília, no formato AAAA-MM-DD.
function hojeSP(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

module.exports = { FERIADOS, diasDaTurma, datasDeAula, feriadosNoPeriodo, hojeSP, janelaDaAula, situacaoJanela, TOLERANCIA_ENTRADA_MIN };
