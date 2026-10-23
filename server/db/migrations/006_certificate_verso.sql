-- Verso do certificado (ex.: conteúdo programático). Null = modelo só com frente.
alter table certificate_templates add column if not exists verso jsonb;
