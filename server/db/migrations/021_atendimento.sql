-- Atendimento (ex-Fala GT): chat do aluno com robô de perguntas frequentes e atendimento humano pela gestão.
-- Estados: bot (respondendo pelas perguntas), aberto (aguardando atendente), finalizado (encerrado).

create table if not exists atendimento_sessoes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  status             text not null default 'bot' check (status in ('bot', 'aberto', 'finalizado')),
  atendente_id       uuid references users (id) on delete set null,
  nao_lidas_gestao   integer not null default 0,
  nao_lidas_aluno    integer not null default 0,
  ultima_mensagem_em timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  finalizado_em      timestamptz
);

-- Um atendimento em aberto por aluno. Depois de finalizado, a próxima mensagem abre outro.
create unique index if not exists atendimento_sessoes_ativa_idx
  on atendimento_sessoes (user_id) where status <> 'finalizado';

create index if not exists atendimento_sessoes_status_idx
  on atendimento_sessoes (status, ultima_mensagem_em desc);

create table if not exists atendimento_mensagens (
  id         bigserial primary key,
  sessao_id  uuid not null references atendimento_sessoes (id) on delete cascade,
  remetente  text not null check (remetente in ('aluno', 'admin', 'sistema')),
  conteudo   text not null check (length(trim(conteudo)) > 0),
  autor_id   uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists atendimento_mensagens_sessao_idx
  on atendimento_mensagens (sessao_id, id);

-- Perguntas frequentes do robô. Palavras-chave separadas por vírgula; a de maior tamanho que aparece na pergunta vence.
create table if not exists atendimento_faq (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  palavras     text not null default '',
  resposta     text not null,
  ativo        boolean not null default true,
  revisado     boolean not null default false,
  ordem        integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- Conteúdo inicial vindo do Fala GT. Tópicos com dados de edição ficam inativos e sem revisão até a equipe confirmar.
insert into atendimento_faq (titulo, palavras, resposta, ativo, revisado, ordem)
select * from (values
  ('Quem pode participar?', 'quem pode,participar,requisito,elegivel,elegível,idade,cearense',
   E'*Quem pode participar do Geração Tech:*\n\n• Cearenses com idade mínima de 16 anos\n\n• *Full Stack:* não ter participado de edições anteriores\n• *IA Generativa:* ter noções de programação e dados\n• *IA e Soft Skills:* ter concluído o Geração Tech ou outro curso de programação (com comprovação)', true, false, 1),
  ('Quais formações estão disponíveis?', 'formação,formações,curso,cursos,trilha,disponível,disponíveis,opções,opcoes',
   E'*Formações disponíveis — todas gratuitas:*\n\n📌 *Desenvolvedor Full Stack* — 500 vagas online\n📌 *IA Generativa* — 200 presenciais + 400 online\n📌 *IA e Soft Skills para Programadores* — 100 presenciais + 500 online\n\nTodas com duração de aproximadamente 3 meses.', false, false, 2),
  ('Como funcionam os horários?', 'horário,horários,horario,horarios,aula,aulas,dias,turno,manhã,manha,tarde,semana',
   E'*Horários das aulas:*\n\n🖥️ *Online:* aulas gravadas + 1 aula ao vivo por semana (4h)\n🏫 *Presencial:* 2 encontros por semana, 4h cada — seg/qua ou ter/qui, manhã ou tarde', true, false, 3),
  ('Como é o processo seletivo?', 'seletivo,seleção,selecao,inscrição,inscricao,teste,testes,processo,como participar,como se inscrever',
   E'*Processo seletivo:*\n\n1️⃣ Inscrição no site\n2️⃣ Envio de documentos\n3️⃣ Testes: Raciocínio Lógico, Comportamental e Específico da formação\n\n✅ Todo o processo é *100% gratuito* — sem nenhuma taxa.', true, false, 4),
  ('É gratuito?', 'gratuito,gratis,grátis,pagar,pago,taxa,custo,valor,quanto custa',
   E'✅ Sim! O Geração Tech é *100% gratuito*.\n\nTanto o processo seletivo quanto as formações não têm nenhum custo para o aluno.', true, false, 5),
  ('Ex-alunos podem participar?', 'ex-aluno,ex aluno,participei antes,edição anterior,edicao anterior,já fiz,ja fiz,participei',
   E'*Ex-alunos do Geração Tech:*\n\n✅ Podem se inscrever novamente\n✅ Foco especial em ex-alunos para *IA e Soft Skills*\n❌ *Full Stack:* ex-alunos NÃO podem participar', false, false, 6),
  ('Documentos necessários', 'documento,documentos,comprovante,endereço,endereco,autodeclaração,autodeclaracao,rg,cpf',
   E'*Documentos para inscrição:*\n\nSe não tiver comprovante de endereço em seu nome, você pode usar a *autodeclaração de residência* (modelo no Anexo II do Edital).\n\nDúvidas sobre documentação? Clique em *Falar com a equipe*.', true, false, 7),
  ('O que é o Recruiting Day?', 'recruiting,recruiting day,feira,emprego,empregabilidade,empresa,vaga,vagas,contratação,contratacao,evento',
   E'Informação do evento de empregabilidade. Atualize esta resposta com a edição vigente antes de ativar.', false, false, 8),
  ('Formatura e eventos finais', 'formatura,certificado,certificação,certificacao,conclusão,conclusao,evento final,encerramento',
   E'Informação sobre formatura e eventos finais. Atualize esta resposta com a edição vigente antes de ativar.', false, false, 9),
  ('Como entrar em contato?', 'contato,email,e-mail,dúvida,duvida,falar,ajuda,suporte,atendimento',
   E'*Contato com a equipe:*\n\n📧 contato@geracaotech.iel-ce.org.br\n🕐 Segunda a sexta, das 9h às 17h\n📋 Prazo de resposta: até 48 horas úteis\n\nOu clique em *Falar com a equipe* para acionar o atendimento humano aqui mesmo.', true, false, 10)
) as v(titulo, palavras, resposta, ativo, revisado, ordem)
where not exists (select 1 from atendimento_faq);

alter table atendimento_sessoes enable row level security;
alter table atendimento_mensagens enable row level security;
alter table atendimento_faq enable row level security;
