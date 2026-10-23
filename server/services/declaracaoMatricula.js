const path = require('path');
const PDFDocument = require('pdfkit');

// Declaração de matrícula (modelo oficial do IEL-CE / Geração Tech). Gerada na hora, em PDF, para o próprio aluno.
// O texto segue o modelo: só os dados do aluno e da formação mudam.

const ASSETS = path.join(__dirname, '..', 'assets', 'declaracao');
const PROGRAMA = 'Projeto Geração Tech 4.0';
const MODALIDADE = 'ONLINE';
const SIGNATARIO = { nome: 'Danadette Nunes Costa Souza', cargo: 'Superintendente do IEL-CE' };

const UNIDADES = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
// Feminino, porque a carga horária é em "horas-aula".
const CENTENAS = ['', 'cento', 'duzentas', 'trezentas', 'quatrocentas', 'quinhentas', 'seiscentas', 'setecentas', 'oitocentas', 'novecentas'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Número por extenso (1 a 9999), como no modelo: "cento e noventa e duas".
function porExtenso(n) {
  if (n === 0) return 'zero';
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DEZ_A_DEZENOVE[n - 10];
  if (n < 100) {
    const dezena = Math.floor(n / 10);
    const unidade = n % 10;
    return unidade ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena];
  }
  if (n < 1000) {
    if (n === 100) return 'cem';
    const centena = CENTENAS[Math.floor(n / 100)];
    const resto = n % 100;
    return resto ? `${centena} e ${porExtenso(resto)}` : centena;
  }
  const milhar = Math.floor(n / 1000);
  const resto = n % 1000;
  const cabeca = milhar === 1 ? 'mil' : `${porExtenso(milhar)} mil`;
  if (!resto) return cabeca;
  return `${cabeca}${resto < 100 ? ' e ' : ' '}${porExtenso(resto)}`;
}

function dataPorExtenso(isoDate) {
  const [ano, mes, dia] = isoDate.split('-').map(Number);
  return `Fortaleza/CE, ${dia} de ${MESES[mes - 1]} de ${ano}.`;
}

function gerarDeclaracaoMatricula({ nome, cpf, formacao, cargaHoraria, data }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const largura = doc.page.width - 144;
    const centro = doc.page.width / 2;
    const cor = '#1d3c6b';

    // Logo do programa
    const logoLargura = 140;
    doc.image(path.join(ASSETS, 'logo-geracao-tech.png'), centro - logoLargura / 2, 60, { width: logoLargura });

    // Título
    doc.font('Helvetica-Bold').fontSize(14).fillColor(cor)
      .text('DECLARAÇÃO DE MATRÍCULA', 72, 140, { width: largura, align: 'center' });

    // Corpo: dados em negrito, como no modelo
    const corpo = { width: largura, align: 'left', lineGap: 5 };
    const trecho = (texto, negrito = false) => ({ texto, negrito });
    const partes = [
      trecho('Declaramos, para os devidos fins, que '),
      trecho(nome.toLocaleUpperCase('pt-BR'), true),
      trecho(', inscrito(a) no CPF sob o nº '),
      trecho(cpf, true),
      trecho(', encontra-se regularmente matriculado(a) no '),
      trecho(PROGRAMA, true),
      trecho(', na formação '),
      trecho(formacao, true),
      trecho(', na modalidade '),
      trecho(MODALIDADE, true),
      trecho(', com carga horária de '),
      trecho(`${cargaHoraria} (${porExtenso(cargaHoraria)}) horas-aula`, true),
      trecho('.')
    ];

    doc.fillColor('#111111').fontSize(11.5);
    partes.forEach((parte, indice) => {
      doc.font(parte.negrito ? 'Helvetica-Bold' : 'Helvetica');
      const opcoes = { ...corpo, continued: indice < partes.length - 1 };
      if (indice === 0) doc.text(parte.texto, 72, 200, opcoes);
      else doc.text(parte.texto, opcoes);
    });

    doc.moveDown(1.6);
    doc.font('Helvetica').fontSize(11.5)
      .text(`A presente declaração é emitida para fins de comprovação de matrícula e participação no ${PROGRAMA}.`, corpo);

    doc.moveDown(2.2);
    doc.text(dataPorExtenso(data), corpo);

    // Assinatura
    const assinaturaLargura = 230;
    const assinaturaY = 462;
    doc.image(path.join(ASSETS, 'assinatura-superintendente.png'), centro - assinaturaLargura / 2, assinaturaY, { width: assinaturaLargura });
    const linhaY = assinaturaY + 46;
    doc.moveTo(centro - 115, linhaY).lineTo(centro + 115, linhaY).lineWidth(0.8).strokeColor('#111111').stroke();
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111111')
      .text(SIGNATARIO.nome, 72, linhaY + 6, { width: largura, align: 'center' });
    doc.font('Helvetica').fontSize(9.5).fillColor('#444444')
      .text(SIGNATARIO.cargo, 72, doc.y + 1, { width: largura, align: 'center' });

    // Realização (IEL, FIEC, ADECE)
    const realizacaoLargura = 300;
    doc.image(path.join(ASSETS, 'realizacao-iel-fiec-adece.png'), centro - realizacaoLargura / 2, 575, { width: realizacaoLargura });

    doc.end();
  });
}

module.exports = { gerarDeclaracaoMatricula, porExtenso };
