-- Modelos de certificado: fundo (PNG/JPG em data URL) e campos editáveis (posição, fonte, cor, tokens).
create table if not exists certificate_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  background  text not null,
  config      jsonb not null default '{}'::jsonb,
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cada curso usa um modelo (ou nenhum, e então vale o certificado padrão).
alter table courses
  add column if not exists certificate_template_id uuid references certificate_templates (id) on delete set null;
