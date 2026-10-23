-- Pop-up de boas-vindas do primeiro acesso do aluno. Quem já existia não recebe o pop-up.
alter table users add column if not exists boas_vindas_em timestamptz;
update users set boas_vindas_em = now() where boas_vindas_em is null and role = 'student' and must_change_password = false;
