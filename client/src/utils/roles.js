// Rótulos e regras de papel usados na interface. A autorização real é feita no servidor.
export const ROLE_LABELS = {
  admin: 'Administrador',
  teacher: 'Professor',
  student: 'Aluno',
  atendente: 'Atendente',
  gestao: 'Gestão',
  editor: 'Editor'
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

// Gestão: acompanha alunos, relatórios e presença. Não edita cursos nem usuários.
export function isGestao(role) {
  return role === 'gestao';
}

// Editor: edita cursos (conteúdo) e a aparência do site.
export function isEditor(role) {
  return role === 'editor';
}
