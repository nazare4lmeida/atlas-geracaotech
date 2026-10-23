// Express 4 não captura rejeições de funções async. Este wrapper encaminha
// qualquer erro para o errorMiddleware, evitando requisições penduradas.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
