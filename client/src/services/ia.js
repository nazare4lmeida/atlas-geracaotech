import api from './api';

// Estado da IA: { ligada, configurada, motivo, provedor, modulos: { tutor } }
export async function buscarEstadoIa() {
  const { data } = await api.get('/ia/estado');
  return data;
}

// Liga ou desliga a IA pelo painel (somente administração).
export async function definirEstadoIa(ligada) {
  const { data } = await api.put('/ia/estado', { ligada });
  return data;
}

// Pergunta ao tutor. O servidor lê o material da aula pelo ID.
export async function perguntarTutor({ pergunta, aulaId }) {
  const { data } = await api.post('/ia/tutor', { pergunta, aulaId });
  return data.resposta;
}
