-- Apresentação dos blocos (cards): nível e cor, como nos cards da biblioteca.
alter table course_blocks
  add column if not exists level text not null default '',
  add column if not exists accent text not null default '#6366f1' check (accent ~* '^#[0-9a-f]{6}$');

-- Transição: a Fullstack recebe o plano de seis blocos na próxima execução do migrate
-- (o plano anterior, de quatro blocos, pode já ter sido aplicado).
update courses set block_plan_applied = false where title = 'Desenvolvimento Web Fullstack - 4.0';
