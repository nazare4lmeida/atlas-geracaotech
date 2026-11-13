// Adaptador do Google Gemini, pela API generateContent.
const { fetchComPrazo, lerCorpo, erroDoProvedor } = require('../http');

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function chamar({ chave, modelo, baseUrl, sistema, mensagens, maxTokens, timeoutMs, fetchImpl }) {
  const corpo = {
    contents: mensagens.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (sistema) corpo.systemInstruction = { parts: [{ text: sistema }] };

  // A chave vai no cabecalho (e nao na URL), para nao aparecer em logs.
  const url = baseUrl || `${URL_BASE}/${encodeURIComponent(modelo)}:generateContent`;
  const resp = await fetchComPrazo(
    fetchImpl,
    url,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify(corpo),
    },
    timeoutMs
  );
  const dados = await lerCorpo(resp);
  if (!resp.ok) throw erroDoProvedor(resp, dados);

  const partes = dados.candidates?.[0]?.content?.parts || [];
  return {
    texto: partes.map((p) => p.text || '').join(''),
    tokensEntrada: dados.usageMetadata?.promptTokenCount ?? null,
    tokensSaida: dados.usageMetadata?.candidatesTokenCount ?? null,
  };
}

module.exports = { chamar };
