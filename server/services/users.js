// Representação pública de uma conta: nunca inclui o hash da senha, o CPF nem a versão do token.
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'student',
    active: user.active !== false,
    careerGoal: user.careerGoal || '',
    avatar: user.avatar || 'avatar-01',
    phone: user.phone || '',
    city: user.city || '',
    state: user.state || '',
    cpfMasked: user.cpfLast2 ? `***.***.***-${user.cpfLast2}` : '',
    mustChangePassword: Boolean(user.mustChangePassword),
    welcomeSeen: Boolean(user.welcomeSeen ?? user.welcomeSeenAt),
    createdAt: user.createdAt
  };
}

module.exports = { sanitizeUser };
