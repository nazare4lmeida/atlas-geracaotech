-- Padrão de blocos para todos os cursos existentes.
--
-- Sem um plano específico, cada módulo (seção) vira um bloco próprio, na mesma ordem, em modo sequencial.
-- Assim todo curso ganha a trilha de fases automaticamente. Formações com plano próprio (ex.: Fullstack)
-- são reorganizadas pelo plano em server/data/blockPlans, aplicado uma única vez (block_plan_applied).
--
-- Só mexe em cursos que ainda não têm blocos. Pode rodar de novo sem efeito.

alter table courses
  add column if not exists block_plan_applied boolean not null default false;

with pending as (
  select s.id as section_id, s.course_id, s.position, s.title
    from sections s
   where s.block_id is null
     and s.kind = 'modulo'
     and not exists (select 1 from course_blocks b where b.course_id = s.course_id)
),
created as (
  insert into course_blocks (course_id, position, title, unlock_mode)
  select p.course_id, p.position, p.title, 'sequential'
    from pending p
  returning id, course_id, position
)
update sections s
   set block_id = c.id
  from created c
 where s.course_id = c.course_id
   and s.position = c.position
   and s.block_id is null;
