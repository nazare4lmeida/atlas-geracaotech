-- Contas importadas por planilha: CPF criptografado (busca por hash), últimos dígitos para exibição,
-- e conta sem senha até o "primeiro acesso" (CPF + e-mail).
alter table users
  add column if not exists cpf_encrypted text,
  add column if not exists cpf_hash text unique,
  add column if not exists cpf_last2 text not null default '',
  add column if not exists activated_at timestamptz;

alter table users alter column password_hash drop not null;
