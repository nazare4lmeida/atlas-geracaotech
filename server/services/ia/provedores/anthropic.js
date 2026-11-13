// Adaptador da Anthropic (Claude), pela API Messages.
const { fetchComPrazo, lerCorpo, erroDoProvedor } = require('../http');

const URL_PADRAO = 'https://api.anthropic.com/v1/messages';

async function chamar({ chave, modelo, baseUrl, sistema, mensagens, maxTokens, timeoutMs, fetchImpl }) {
  const corpo = {
    model: modelo,
    max_tokens: maxTokens,
    messages: mensagens.map((m) => ({ role: m.role, content: m.content })),
  };
  if (sistema) corpo.system = sistema;

  const resp = await fetchComPrazo(
    fetchImpl,
    baseUrl || URL_PADRAO,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(corpo),
    },
    timeoutMs
  );
  const dados = await lerCorpo(resp);
  if (!resp.ok) throw erroDoProvedor(resp, dados);

  return {
    texto: (dados.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''),
    tokensEntrada: dados.usage?.input_tokens ?? null,
    tokensSaida: dados.usage?.output_tokens ?? null,
  };
}

module.exports = { chamar };
