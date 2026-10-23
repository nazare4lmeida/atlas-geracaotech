const jwt = require('jsonwebtoken');
const { findAuthUserById } = require('../db/authRepo');
const { sanitizeUser } = require('../services/users');

// Confere o token, a conta ativa e a versão do token: trocar a senha invalida as sessões antigas.
module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Acesso não autorizado.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await findAuthUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    if (user.active === false) {
      return res.status(401).json({ message: 'Conta desativada. Procure a administração.' });
    }

    if ((decoded.tv ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ message: 'Sua sessão expirou. Entre novamente.' });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};
