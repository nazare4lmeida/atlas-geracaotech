// Restringe uma rota aos papéis de conta informados (ex.: requireRole('admin', 'teacher')).
module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role || 'student';
    if (!roles.includes(role)) {
      return res.status(403).json({ message: 'Você não tem permissão para acessar este recurso.' });
    }
    return next();
  };
};
