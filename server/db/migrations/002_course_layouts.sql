-- Layout e identidade visual do curso (escolhidos pelo professor, ajustáveis sem código).
alter table courses
  add column if not exists layout text not null default 'caderno'
    check (layout in ('caderno', 'classico', 'terminal', 'editorial'));

alter table courses
  add column if not exists theme jsonb not null default '{}'::jsonb;
