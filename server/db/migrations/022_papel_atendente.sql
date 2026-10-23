-- Papel de atendente: conta que responde aos alunos no atendimento (sem acesso à gestão acadêmica).
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('admin', 'teacher', 'student', 'atendente'));
