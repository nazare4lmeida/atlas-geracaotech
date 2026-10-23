// Códigos de erro do PostgreSQL (SQLSTATE) traduzidos para respostas HTTP legíveis.
const PG_ERRORS = {
  '23505': { status: 409, message: 'Já existe um registro com estes dados.' },
  '23503': { status: 400, message: 'Referência inválida.' },
  '23502': { status: 400, message: 'Preencha todos os campos obrigatórios.' },
  '23514': { status: 400, message: 'Dados inválidos. Revise os campos informados.' },
  '22001': { status: 400, message: 'Um dos textos excede o tamanho permitido.' },
  '22P02': { status: 400, message: 'Identificador inválido.' }
};

module.exports = function errorMiddleware(error, req, res, next) {
  const pgError = error && PG_ERRORS[error.code];
  if (pgError) {
    return res.status(pgError.status).json({ message: pgError.message });
  }

  const status = error.statusCode || error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    message: status >= 500 && !error.statusCode ? 'Erro interno do servidor.' : error.message
  });
};
