-- Notas (0 a 10) das entregas de projeto e do certificado emitido.
--
-- A nota do projeto é lançada pela gestão em project_deliveries.grade.
-- A nota da prova de recuperação vem do quiz do módulo de recuperação (quiz_results), convertida para 0 a 10.
-- A nota final usada no certificado (a maior entre projeto e prova) fica gravada em certificates.grade.

alter table project_deliveries
  add column if not exists grade numeric(4, 2) check (grade is null or (grade >= 0 and grade <= 10)),
  add column if not exists graded_at timestamptz,
  add column if not exists graded_by uuid references users (id) on delete set null;

alter table certificates
  add column if not exists grade numeric(4, 2) check (grade is null or (grade >= 0 and grade <= 10));
