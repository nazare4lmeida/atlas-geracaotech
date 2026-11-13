-- Chave de configuracao da IA que o administrador liga e desliga pelo sistema (sem deploy).
-- chave 'ligada' com valor 'true' ou 'false'. Sem linha = desligada.
create table if not exists ia_configuracao (
  chave          text primary key,
  valor          text not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);
