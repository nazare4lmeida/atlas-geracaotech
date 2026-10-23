-- Código de autenticação único por certificado (usado na verificação pública e no QR code).
alter table certificates add column if not exists auth_code text unique;
