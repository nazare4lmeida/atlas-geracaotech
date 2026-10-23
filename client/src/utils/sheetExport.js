import * as XLSX from 'xlsx';

// Exporta uma lista de objetos como .xlsx ou .csv, usando as colunas (key, label) informadas.
export function exportTable(rows, columns, format, baseName = 'atlas') {
  const header = columns.map((column) => column.label);
  const data = rows.map((row) => {
    const out = {};
    columns.forEach((column) => {
      const value = column.value ? column.value(row) : row[column.key];
      out[column.label] = value === null || value === undefined ? '' : value;
    });
    return out;
  });
  const sheet = XLSX.utils.json_to_sheet(data, { header });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dados');

  let blob;
  let extension;
  if (format === 'csv') {
    const csv = XLSX.write(workbook, { bookType: 'csv', FS: ';', type: 'string' });
    blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    extension = 'csv';
  } else {
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    extension = 'xlsx';
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Lê a primeira aba de uma planilha (.xlsx, .xls ou .csv) como lista de objetos com cabeçalho.
export async function readSheetFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  if (!first) return [];
  return XLSX.utils.sheet_to_json(first, { defval: '', raw: false });
}
