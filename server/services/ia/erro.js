// Erro da camada de IA. O codigo diz o motivo; o statusCode vai direto para a resposta HTTP.
class IaErro extends Error {
  constructor(codigo, mensagem, statusCode = 503) {
    super(mensagem);
    this.name = 'IaErro';
    this.codigo = codigo;
    this.statusCode = statusCode;
  }
}

module.exports = { IaErro };
