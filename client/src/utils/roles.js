// Rótulos e regras de papel usados na interface. A autorização real é feita no servidor.
export const ROLE_LABELS = {
  admin: 'Administrador',
  teacher: 'Professor',
  student: 'Aluno',
  atendente: 'Atendente'
};

export const COURSE_ROLE_LABELS = {
  teacher: 'Docente',
  student: 'Estudante'
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || ROLE_LABELS.student;
}

export function isTeacherOrAdmin(role) {
  return role === 'admin' || role === 'teacher';
}

// Atendente: conta que atende os alunos no chat. Não acessa a gestão acadêmica.
export function isAtendente(role) {
  return role === 'atendente';
}
