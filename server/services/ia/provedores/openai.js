// Adaptador da OpenAI, pela API Chat Completions.
const { fetchComPrazo, lerCorpo, erroDoProvedor } = require('../http');

const URL_PADRAO = 'https://api.openai.com/v1/chat/completions';

async function chamar({ chave, modelo, baseUrl, sistema, mensagens, maxTokens, timeoutMs, fetchImpl }) {
  const msgs = [];
  if (sistema) msgs.push({ role: 'system', content: sistema });
  mensagens.forEach((m) => msgs.push({ role: m.role, content: m.content }));

  const resp = await fetchComPrazo(
    fetchImpl,
    baseUrl || URL_PADRAO,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({ model: modelo, messages: msgs, max_completion_tokens: maxTokens }),
    },
    timeoutMs
  );
  const dados = await lerCorpo(resp);
  if (!resp.ok) throw erroDoProvedor(resp, dados);

  return {
    texto: dados.choices?.[0]?.message?.content || '',
    tokensEntrada: dados.usage?.prompt_tokens ?? null,
    tokensSaida: dados.usage?.completion_tokens ?? null,
  };
}

module.exports = { chamar };
