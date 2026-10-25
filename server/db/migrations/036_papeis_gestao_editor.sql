-- Novos papéis de conta: gestão (acompanhamento, relatórios, presença e atendimento em números)
-- e editor (cursos e aparência do site). Só a administração cria e altera esses usuários.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('admin', 'teacher', 'student', 'atendente', 'gestao', 'editor'));
