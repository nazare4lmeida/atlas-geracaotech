import * as XLSX from 'xlsx';

// Planilha de usuários: colunas iguais nas duas direções (importar e exportar), no mesmo formato do servidor.
export const SHEET_COLUMNS = ['nome', 'email', 'cpf', 'papel_no_curso', 'curso', 'grupo'];

const HEADER_ALIASES = {
  nome: 'nome',
  'nome completo': 'nome',
  email: 'email',
  'e-mail': 'email',
  cpf: 'cpf',
  papel_no_curso: 'papel_no_curso',
  'papel no curso': 'papel_no_curso',
  papel: 'papel_no_curso',
  curso: 'curso',
  grupo: 'grupo',
  turma: 'grupo'
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_WORDS = ['aluno', 'estudante', 'docente', 'professor'];

const norm = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export function isValidCpf(value) {
  const d = String(value).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(d[i]) * (length + 1 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(d[length])) return false;
  }
  return true;
}

function normalizeRow(row) {
  const out = {};
  Object.entries(row).forEach(([header, value]) => {
    const key = HEADER_ALIASES[norm(header).replace(/\s+/g, ' ')];
    if (key) out[key] = value;
  });
  return out;
}

// CSV salvo pelo Excel em português usa ";". Detecta pela primeira linha.
function csvSeparator(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  return (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
}

export async function readSheet(file) {
  const isCsv = /\.csv$/i.test(file.name);
  let workbook;
  if (isCsv) {
    const text = (await file.text()).replace(/^﻿/, '');
    workbook = XLSX.read(text, { type: 'string', FS: csvSeparator(text) });
  } else {
    workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }).map(normalizeRow);
}

// Confere cada linha no navegador (antes de enviar). O servidor confere de novo, com o banco.
export function validateRows(rows) {
  const emailCpf = new Map();

  return rows.map((data, index) => {
    const errors = [];
    const nome = String(data.nome ?? '').trim();
    const email = String(data.email ?? '').trim().toLowerCase();
    let cpf = String(data.cpf ?? '').replace(/\D/g, '');
    // Número no Excel perde o zero à esquerda do CPF: completa com zeros.
    if (cpf.length === 10) cpf = cpf.padStart(11, '0');
    const papel = norm(data.papel_no_curso) || 'aluno';
    const curso = String(data.curso ?? '').trim();
    const grupo = String(data.grupo ?? '').trim();

    if (nome.length < 3) errors.push('Nome obrigatório');
    if (!EMAIL_PATTERN.test(email)) errors.push('E-mail inválido');
    if (!isValidCpf(cpf)) errors.push('CPF inválido');
    if (!ROLE_WORDS.includes(papel)) errors.push('Papel: use "aluno" ou "docente"');
    if (grupo && !curso) errors.push('Grupo sem curso');

    if (EMAIL_PATTERN.test(email)) {
      const known = emailCpf.get(email);
      if (known && known !== cpf) errors.push('Mesmo e-mail com CPF diferente');
      emailCpf.set(email, cpf);
    }

    return {
      linha: Number(data.__linha) || index + 2,
      errors,
      data: { nome, email, cpf, papel_no_curso: papel, curso, grupo }
    };
  });
}

// Modelo para download: cabeçalho, um exemplo e uma aba com instruções.
export function downloadTemplate() {
  const workbook = XLSX.utils.book_new();
  const example = [
    {
      nome: 'Maria da Silva',
      email: 'maria@exemplo.com',
      cpf: '529.982.247-25',
      papel_no_curso: 'aluno',
      curso: 'Formação em Desenvolvimento Full Stack',
      grupo: 'Turma A'
    }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(example, { header: SHEET_COLUMNS }), 'Usuarios');
  const instructions = [
    ['Como preencher'],
    ['nome: nome completo (obrigatório)'],
    ['email: e-mail do aluno (obrigatório; é o login)'],
    ['cpf: 11 dígitos, com ou sem pontuação (obrigatório; usado no primeiro acesso)'],
    ['papel_no_curso: aluno ou docente (vazio = aluno)'],
    ['curso: título ou identificador do curso (vazio = só cria a conta)'],
    ['grupo: nome do grupo dentro do curso (cria o grupo se não existir)'],
    ['Uma linha por matrícula: o mesmo aluno pode aparecer em vários cursos.'],
    ['Formate a coluna cpf como texto para não perder zeros à esquerda.']
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), 'Instruções');
  XLSX.writeFile(workbook, 'modelo-usuarios-atlas.xlsx');
}

// Exporta as linhas (vindas do servidor) em .xlsx ou .csv (CSV com ";" e BOM, para abrir certo no Excel).
export function exportRows(rows, format, baseName = 'usuarios-atlas') {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: SHEET_COLUMNS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Usuarios');

  if (format === 'csv') {
    const csv = XLSX.write(workbook, { bookType: 'csv', FS: ';', type: 'string' });
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  XLSX.writeFile(workbook, `${baseName}.xlsx`);
}
