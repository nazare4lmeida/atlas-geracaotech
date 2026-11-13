// fetch com prazo: se a IA demorar demais, a chamada e cancelada e vira erro de timeout.
const { IaErro } = require('./erro');

async function fetchComPrazo(fetchImpl, url, opcoes, timeoutMs) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...opcoes, signal: controle.signal });
  } catch (erro) {
    if (erro && erro.name === 'AbortError') {
      throw new IaErro('timeout', 'A IA demorou demais para responder. Tente de novo.', 504);
    }
    throw new IaErro('rede', 'Não foi possível falar com o serviço de IA.', 502);
  } finally {
    clearTimeout(relogio);
  }
}

async function lerCorpo(resp) {
  return resp.json().catch(() => ({}));
}

function erroDoProvedor(resp, dados) {
  const detalhe = (dados && (dados.error?.message || dados.error?.status)) || 'erro desconhecido';
  return new IaErro('provedor', `O serviço de IA respondeu ${resp.status}: ${detalhe}`, 502);
}

module.exports = { fetchComPrazo, lerCorpo, erroDoProvedor };
