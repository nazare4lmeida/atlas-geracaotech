// Limite simples por IP (em memória): protege a verificação pública contra varredura de códigos.
// Com várias instâncias do servidor, cada uma conta separadamente.
module.exports = function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'anon';
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Muitas consultas. Tente novamente em instantes.' });
    }
    return next();
  };
};
