const repo = require('../db/userAdminRepo');
const { digitsOf, isValidCpf, hashCpf, encryptCpf } = require('./cpf');

// Importação de contas e matrículas por planilha (ver o modelo na tela de Usuários).
// Cada linha: nome, e-mail, CPF, papel no curso (aluno/docente), curso e grupo (opcionais).
// Uma linha com erro não impede as outras; o relatório mostra o que entrou e o que falhou.

const MAX_ROWS = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABELS = { aluno: 'student', estudante: 'student', student: 'student', docente: 'teacher', professor: 'teacher', teacher: 'teacher' };

const norm = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

function validateRow(raw, courseByKey) {
  const name = String(raw.nome || '').trim();
  const email = String(raw.email || '').trim().toLowerCase();
  const digits = digitsOf(raw.cpf);
  const roleText = norm(raw.papel_no_curso) || 'aluno';
  const courseText = String(raw.curso || '').trim();
  const groupText = String(raw.grupo || '').trim();

  if (name.length < 3 || name.length > 120) throw new Error('Nome é obrigatório (3 a 120 caracteres).');
  if (!EMAIL_PATTERN.test(email)) throw new Error('E-mail inválido.');
  if (!isValidCpf(digits)) throw new Error('CPF inválido. Confira os 11 dígitos.');
  if (!ROLE_LABELS[roleText]) throw new Error('Papel no curso inválido. Use "aluno" ou "docente".');

  let course = null;
  if (courseText) {
    course = courseByKey.get(norm(courseText));
    if (!course) throw new Error(`Curso não encontrado: "${courseText}". Use o título ou o identificador do curso.`);
  }
  if (groupText && !course) throw new Error('Informe o curso para indicar o grupo.');

  return { name, email, digits, role: ROLE_LABELS[roleText], course, group: groupText };
}

async function importRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('A planilha não tem linhas para importar.');
  if (rows.length > MAX_ROWS) throw new Error(`Importe no máximo ${MAX_ROWS} linhas por vez.`);

  const courseByKey = new Map();
  (await repo.listCoursesLookup()).forEach((course) => {
    courseByKey.set(norm(course.slug), course);
    courseByKey.set(norm(course.title), course);
  });

  const groupCache = new Map(); // courseId -> Map(nome normalizado -> id)
  const report = { linhas: rows.length, criados: 0, existentes: 0, matriculas: 0, grupos: 0, erros: [] };

  for (const [index, raw] of rows.entries()) {
    const line = Number(raw.linha) || index + 2;
    let row;
    try {
      row = validateRow(raw || {}, courseByKey);
    } catch (error) {
      report.erros.push({ linha: line, mensagem: error.message });
      continue;
    }

    try {
      const hash = hashCpf(row.digits);
      let user = await repo.findUserByEmailLite(row.email);

      if (user) {
        if (user.cpf_hash && user.cpf_hash !== hash) {
          report.erros.push({ linha: line, mensagem: 'O CPF não confere com o cadastro existente deste e-mail.' });
          continue;
        }
        report.existentes += 1;
      } else {
        const owner = await repo.findUserByCpfHash(hash);
        if (owner) {
          report.erros.push({ linha: line, mensagem: 'Este CPF já está cadastrado com outro e-mail.' });
          continue;
        }
        const id = await repo.insertImportedUser({
          name: row.name,
          email: row.email,
          cpfEncrypted: encryptCpf(row.digits),
          cpfHash: hash,
          cpfLast2: row.digits.slice(-2)
        });
        user = { id };
        report.criados += 1;
      }

      if (row.course) {
        const enrolled = await repo.enrollIfMissing(row.course.id, user.id, row.role);
        if (enrolled) report.matriculas += 1;

        if (row.group) {
          if (!groupCache.has(row.course.id)) {
            const groups = await repo.listGroupsOfCourse(row.course.id);
            groupCache.set(row.course.id, new Map(groups.map((group) => [norm(group.name), group.id])));
          }
          const groups = groupCache.get(row.course.id);
          let groupId = groups.get(norm(row.group));
          if (!groupId) {
            groupId = await repo.createGroupForCourse(row.course.id, row.group.slice(0, 80));
            groups.set(norm(row.group), groupId);
            report.grupos += 1;
          }
          await repo.addGroupMemberIfMissing(groupId, row.course.id, user.id);
        }
      }
    } catch (error) {
      console.error(`[importação] linha ${line}:`, error.message);
      report.erros.push({ linha: line, mensagem: 'Erro ao gravar esta linha. Tente novamente ou revise os dados.' });
    }
  }

  return report;
}

module.exports = { importRows, MAX_ROWS };
