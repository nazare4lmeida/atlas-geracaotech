// Datas e horas do ponto. Tudo no fuso de Brasília, independentemente do fuso do computador.

const FUSO = 'America/Sao_Paulo';

export function hojeISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Período padrão: do dia 1 até hoje, do mês corrente.
export function mesAtual(now = new Date()) {
  const hoje = hojeISO(now);
  return { de: `${hoje.slice(0, 8)}01`, ate: hoje };
}

export function dataBr(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';
}

export function hora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
}

export function formatarMinutos(minutos) {
  if (!minutos) return '0 min';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${horas} h`;
}

// Valor para <input type="datetime-local"> a partir de um instante, no horário de Brasília.
export function paraDatetimeLocal(iso) {
  if (!iso) return '';
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value])
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

// Converte o valor do campo (horário de Brasília, UTC-3 sem horário de verão desde 2019) em instante ISO.
export function deDatetimeLocal(valor) {
  return valor ? `${valor}:00-03:00` : '';
}
