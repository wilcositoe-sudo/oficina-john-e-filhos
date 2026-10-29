// Envolve handlers async para o Express 5 — erros vão sempre ao middleware de erro.
export const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};