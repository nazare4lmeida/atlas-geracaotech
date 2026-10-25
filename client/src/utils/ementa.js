import * as XLSX from 'xlsx';

// Lê a ementa de um CSV ou XLSX: colunas módulo e aula (ou título). Módulo em branco repete o anterior.
const normalizar = (texto) =>
  String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export async function lerEmenta(arquivo) {
  let linhas;
  if (/\.xlsx?$/i.test(arquivo.name)) {
    const planilha = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
    linhas = XLSX.utils.sheet_to_json(planilha.Sheets[planilha.SheetNames[0]], { header: 1, defval: '' });
  } else {
    const texto = await arquivo.text();
    const linhasTexto = texto.split(/\r?\n/).filter((l) => l.trim());
    const separador = (linhasTexto[0] || '').includes(';') ? ';' : ',';
    linhas = linhasTexto.map((l) => l.split(separador).map((c) => c.trim().replace(/^"|"$/g, '')));
  }
  if (!linhas.length) return [];

  const cabecalho = linhas[0].map(normalizar);
  const iModulo = cabecalho.findIndex((c) => c.startsWith('modulo'));
  const iAula = cabecalho.findIndex((c) => c === 'aula' || c.startsWith('titulo'));
  const temCabecalho = iModulo >= 0 || iAula >= 0;
  const dados = temCabecalho ? linhas.slice(1) : linhas;
  const colModulo = temCabecalho && iModulo >= 0 ? iModulo : 0;
  const colAula = temCabecalho && iAula >= 0 ? iAula : 1;

  let moduloAtual = '';
  const itens = [];
  dados.forEach((linha) => {
    const modulo = String(linha[colModulo] ?? '').trim();
    const titulo = String(linha[colAula] ?? '').trim();
    if (modulo) moduloAtual = modulo;
    if (titulo) itens.push({ modulo: moduloAtual, titulo });
  });
  return itens;
}
