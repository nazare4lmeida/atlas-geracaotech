-- Configurações visuais do site (aba Aparência): uma linha por tipo de configuração.
create table if not exists site_settings (
  chave          text primary key,
  valor          jsonb not null default '{}'::jsonb,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references users (id) on delete set null
);

alter table site_settings enable row level security;

insert into site_settings (chave, valor) values ('aparencia', '{}'::jsonb)
on conflict (chave) do nothing;
