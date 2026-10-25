-- Presença por grupo de curso: a aula pode ser de uma turma ou de um grupo (nunca das duas).
alter table attendance_sessions add column if not exists group_id uuid references course_groups (id) on delete cascade;
alter table attendance_sessions drop constraint if exists attendance_sessions_espaco_check;
alter table attendance_sessions add constraint attendance_sessions_espaco_check check (turma_id is null or group_id is null);
create index if not exists attendance_sessions_group_idx on attendance_sessions (group_id, session_date) where group_id is not null;

-- Quem participa de cada aula: alunos ativos da turma, ou membros do grupo com matrícula ativa no curso.
-- Usada pela marcação, pelo cronograma, pelo fechamento automático e pelo relatório.
create or replace view presenca_participantes as
  select s.id as session_id, m.user_id
    from attendance_sessions s
    join turma_alunos ta on ta.turma_id = s.turma_id and ta.situacao = 'ativo'
    join matriculas m on m.id = ta.matricula_id and m.situacao = 'ativo' and m.user_id is not null
   where s.turma_id is not null
  union
  select s.id, gm.user_id
    from attendance_sessions s
    join group_members gm on gm.group_id = s.group_id
    join enrollments e on e.course_id = gm.course_id and e.user_id = gm.user_id and e.status = 'active'
   where s.group_id is not null;
