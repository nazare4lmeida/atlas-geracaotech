// Converte um backup de curso do Moodle (.mbz) para o formato de backup do Atlas (JSON).
//
// Uso (dentro de server/):
//   node scripts/convertMoodleBackup.js <arquivo.mbz> <saida.json> [--slug <slug>] [--layout <layout>] [--report <relatorio.md>]
//
// O que é convertido:
//   seção            -> seção (módulo)
//   rótulo (label)   -> recurso do tipo página
//   livro (book)     -> um recurso do tipo página por capítulo
//   página (page)    -> recurso do tipo página
//   lição (lesson)   -> um recurso do tipo página por página da lição
//   URL e Meet       -> recurso do tipo link
//   tarefa (assign)  -> recurso do tipo página com as instruções
//   questionário     -> questões de múltipla escolha com uma alternativa correta (e verdadeiro/falso)
//
// O que NÃO é convertido (aparece no relatório): arquivos binários (imagens, PDFs, vídeos),
// presença, pastas com arquivos, fóruns, questões dissertativas e de resposta curta, e notas/tentativas.
// Estilos fixos de cor e fonte são removidos do HTML, para que o layout do curso controle a aparência.
//
// Sem dependências externas: lê o gzip e o tar com módulos nativos do Node.

const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');

const { normalizeLayout } = require('../services/layouts');
const { parseBackup, BACKUP_FORMAT } = require('../services/courseBackup');

// ---------- Leitura do arquivo .mbz ----------

function readCString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? length : end).toString('utf8');
}

// Lê apenas os arquivos XML do tar (os binários são ignorados para economizar memória).
function readXmlEntries(tarBuffer) {
  const entries = new Map();
  let offset = 0;
  let longName = null;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    let name = readCString(header, 0, 100);
    const prefix = readCString(header, 345, 155);
    if (prefix) name = `${prefix}/${name}`;
    const size = parseInt(readCString(header, 124, 12).trim() || '0', 8) || 0;
    const type = String.fromCharCode(header[156]);
    const data = tarBuffer.subarray(offset + 512, offset + 512 + size);

    if (type === 'L') {
      longName = data.toString('utf8').replace(/\0[\s\S]*$/, '');
    } else if (type === '0' || type === '\0') {
      const fileName = longName || name;
      longName = null;
      if (fileName.endsWith('.xml')) {
        entries.set(fileName.replace(/^\.\//, ''), data.toString('utf8'));
      }
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return entries;
}

// ---------- Auxiliares de XML e HTML ----------

function decodeEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Pega o conteúdo de uma tag simples (sem atributos) dentro de um bloco XML.
function tag(block, name) {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decodeEntities(match[1]).trim() : '';
}

// Remove tags de um texto já decodificado uma vez (o XML). Entidades como &lt;div&gt; são código literal e permanecem.
function stripTagsRaw(html) {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

// Texto puro a partir de HTML bruto (uso geral: resumos e verificações de conteúdo).
function stripTags(html) {
  return decodeEntities(stripTagsRaw(decodeEntities(html)));
}

// Remove estilos fixos e atributos de aparência, para o layout do Atlas controlar o visual.
// Macro de vídeo do Moodle: {GENERICO:type=VideoResponsivo,url=https://www.youtube.com/embed/ID}
// Vira iframe do YouTube (o cliente só aceita embeds de provedores listados). IDs de exemplo são descartados.
function videoMacroToEmbed(html) {
  return html.replace(/\{GENERICO:type=VideoResponsivo,url=([^}\s]+)\}/gi, (_, rawUrl) => {
    const match = rawUrl.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i);
    if (!match) return '';
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe></div>`;
  });
}

function adaptHtml(html) {
  return videoMacroToEmbed(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s(bgcolor|color|face|size|align|width|height|border|cellpadding|cellspacing)="[^"]*"/gi, '')
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .replace(/(<p>\s*(&nbsp;|\s)*<\/p>\s*)+/gi, '')
    .trim();
}

function firstLine(text, max = 90) {
  const line = text.split('\n').map((item) => item.trim()).find(Boolean) || '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function isVisible(xml) {
  return !/<visible>0<\/visible>/.test(xml) && !/<visibleoncoursepage>0<\/visibleoncoursepage>/.test(xml);
}

// Busca um bloco de atividade (ex.: <chapter id="7">...</chapter>) em um XML.
function blocks(xml, tagName) {
  const pattern = new RegExp(`<${tagName}\\s+id="\\d+">([\\s\\S]*?)</${tagName}>`, 'g');
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

function between(text, startTag, endTag) {
  const start = text.indexOf(startTag);
  const end = text.indexOf(endTag, start + startTag.length);
  return start === -1 || end === -1 ? '' : text.slice(start, end);
}

// Um trecho tem conteúdo se tiver texto ou mídia (vídeo, imagem, link).
function hasContent(html) {
  return Boolean(stripTags(html)) || /<(iframe|img|video|audio|a|embed)\b/i.test(html);
}

// ---------- Questionário ----------

// Monta o mapa de questões do banco: id da entrada do banco -> bloco da questão (versão atual).
function indexQuestionBank(questionsXml) {
  const map = new Map();
  const entries = [...questionsXml.matchAll(/<question_bank_entry id="(\d+)">/g)];

  entries.forEach((match, index) => {
    const start = match.index;
    const end = index + 1 < entries.length ? entries[index + 1].index : questionsXml.length;
    const block = questionsXml.slice(start, end);
    const question = block.match(/<question id="(\d+)">([\s\S]*?)<\/question>/);
    if (question) map.set(match[1], question[2]);
  });

  return map;
}

// Converte uma questão do Moodle. Retorna null e um motivo quando não é possível converter.
function convertQuestion(questionBlock) {
  const qtype = tag(questionBlock, 'qtype');
  // Remove as alternativas e a linha "ANSWER: X" que alguns enunciados trazem escritas no texto.
  const text = decodeEntities(stripTagsRaw(tag(questionBlock, 'questiontext')))
    .split('\n')
    .filter((line) => !/^\s*[A-Za-z]\)\s/.test(line) && !/^\s*ANSWER\s*:/i.test(line))
    .join('\n')
    .trim();

  if (qtype === 'multichoice') {
    const answers = [...questionBlock.matchAll(/<answer id="\d+">([\s\S]*?)<\/answer>/g)].map((match) => ({
      text: decodeEntities(stripTagsRaw(tag(match[1], 'answertext'))),
      fraction: Number(tag(match[1], 'fraction')),
      feedback: decodeEntities(stripTagsRaw(tag(match[1], 'feedback'))).trim()
    }));
    const pairs = answers.filter((answer) => answer.text);
    const correct = pairs.filter((answer) => answer.fraction > 0);

    if (correct.length !== 1) return { reason: `múltipla escolha com ${correct.length} respostas corretas` };
    if (pairs.length < 2 || pairs.length > 10) return { reason: `múltipla escolha com ${pairs.length} alternativas` };

    return {
      question: {
        question: text,
        options: pairs.map((answer) => answer.text),
        answer: pairs.indexOf(correct[0]),
        optionFeedback: pairs.map((answer) => answer.feedback.slice(0, 500)),
        explanation: decodeEntities(stripTagsRaw(tag(questionBlock, 'generalfeedback'))).trim().slice(0, 1000)
      }
    };
  }

  if (qtype === 'truefalse') {
    const answers = [...questionBlock.matchAll(/<answer id="\d+">([\s\S]*?)<\/answer>/g)].map((match) => ({
      fraction: Number(tag(match[1], 'fraction'))
    }));
    if (answers.length === 0) return { reason: 'verdadeiro/falso sem respostas' };
    // No Moodle, a primeira alternativa de verdadeiro/falso é "Verdadeiro"; a correta tem fração > 0.
    const trueIsCorrect = answers[0].fraction > 0;
    return {
      question: {
        question: text,
        options: ['Verdadeiro', 'Falso'],
        answer: trueIsCorrect ? 0 : 1,
        optionFeedback: [],
        explanation: decodeEntities(stripTagsRaw(tag(questionBlock, 'generalfeedback'))).trim().slice(0, 1000)
      }
    };
  }

  if (qtype === 'description') return { skip: true };
  return { reason: `tipo "${qtype}" não suportado` };
}

// ---------- Conversão principal ----------

function convertBackup(xmlFiles, options = {}) {
  const get = (name) => {
    const content = xmlFiles.get(name);
    if (content === undefined) throw new Error(`Arquivo ${name} não encontrado no backup.`);
    return content;
  };

  const backupXml = get('moodle_backup.xml');
  const courseXml = get('course/course.xml');
  const questionBank = indexQuestionBank(xmlFiles.get('questions.xml') || '');

  const report = { converted: { lessons: 0, links: 0, questions: 0 }, skipped: [], placeholders: 0, pluginFiles: 0 };

  // Seções: o nome e a ordem vêm de section.xml; as atividades, de moodle_backup.xml.
  // O índice repete seções e atividades em outros blocos (configurações); lemos só <sections> e <activities>.
  const sectionsBlock = between(backupXml, '<sections>', '</sections>');
  const activitiesBlock = between(backupXml, '<activities>', '</activities>');

  const sectionEntries = [...sectionsBlock.matchAll(/<section>([\s\S]*?)<\/section>/g)].map((match) => ({
    id: tag(match[1], 'sectionid'),
    directory: tag(match[1], 'directory'),
    title: tag(match[1], 'title')
  }));
  const activityEntries = [...activitiesBlock.matchAll(/<activity>([\s\S]*?)<\/activity>/g)].map((match) => ({
    sectionId: tag(match[1], 'sectionid'),
    moduleId: tag(match[1], 'moduleid'),
    modulename: tag(match[1], 'modulename'),
    title: tag(match[1], 'title'),
    directory: tag(match[1], 'directory')
  }));

  const sections = sectionEntries.map((entry) => {
    const sectionXml = xmlFiles.get(`${entry.directory}/section.xml`) || '';
    const number = Number(tag(sectionXml, 'number')) || 0;
    const sequence = tag(sectionXml, 'sequence').split(',').filter(Boolean);
    return {
      number,
      name: tag(sectionXml, 'name') || `Seção ${number}`,
      summary: stripTags(tag(sectionXml, 'summary')),
      visible: isVisible(sectionXml),
      sequence,
      activities: activityEntries.filter((activity) => activity.sectionId === entry.id)
    };
  }).sort((a, b) => a.number - b.number);

  const modules = [];

  for (const section of sections) {
    const lessons = [];
    const quiz = [];
    const ordered = section.activities.sort(
      (a, b) => section.sequence.indexOf(a.moduleId) - section.sequence.indexOf(b.moduleId)
    );

    for (const activity of ordered) {
      const dir = `activities/${activity.directory.split('/').pop()}`;
      const moduleXml = xmlFiles.get(`${dir}/module.xml`) || '';
      const visible = isVisible(moduleXml);
      const name = activity.title;
      const xml = xmlFiles.get(`${dir}/${activity.modulename}.xml`) || '';
      const context = `"${name}" (${section.name})`;

      if (activity.modulename === 'label') {
        const intro = adaptHtml(tag(xml, 'intro'));
        if (!hasContent(intro)) continue;
        lessons.push({ title: firstLine(stripTags(intro)), type: 'page', url: '', content: intro, visible });
        report.converted.lessons += 1;
        continue;
      }

      if (activity.modulename === 'book') {
        for (const chapter of blocks(xml, 'chapter')) {
          const title = tag(chapter, 'title') || name;
          const content = adaptHtml(tag(chapter, 'content'));
          if (!hasContent(content)) {
            report.skipped.push({ type: 'capítulo de livro', name: title, section: section.name, reason: 'sem conteúdo' });
            continue;
          }
          const hidden = /<hidden>1<\/hidden>/.test(chapter);
          lessons.push({ title, type: 'page', url: '', content, visible: visible && !hidden });
          report.converted.lessons += 1;
        }
        continue;
      }

      if (activity.modulename === 'page') {
        const content = adaptHtml(tag(xml, 'content'));
        lessons.push({ title: name, type: 'page', url: '', content: content || '<p>Sem conteúdo.</p>', visible });
        report.converted.lessons += 1;
        continue;
      }

      if (activity.modulename === 'lesson') {
        const pages = blocks(xml, 'page').filter((page) => tag(page, 'title'));
        for (const page of pages) {
          const content = adaptHtml(tag(page, 'contents'));
          if (!hasContent(content)) continue;
          lessons.push({ title: tag(page, 'title'), type: 'page', url: '', content, visible });
          report.converted.lessons += 1;
        }
        continue;
      }

      if (activity.modulename === 'url') {
        const url = tag(xml, 'externalurl');
        if (!/^https?:\/\//i.test(url)) {
          report.skipped.push({ type: 'URL', name, section: section.name, reason: 'endereço inválido' });
          continue;
        }
        lessons.push({ title: name, type: 'link', url, content: '', visible });
        report.converted.links += 1;
        continue;
      }

      if (activity.modulename === 'googlemeet') {
        const url = tag(xml, 'url');
        if (!/^https?:\/\//i.test(url)) {
          report.skipped.push({ type: 'Google Meet', name, section: section.name, reason: 'sem link' });
          continue;
        }
        lessons.push({ title: name, type: 'link', url, content: '', visible });
        report.converted.links += 1;
        continue;
      }

      if (activity.modulename === 'assign') {
        const intro = adaptHtml(tag(xml, 'intro'));
        const content = hasContent(intro)
          ? intro
          : '<p>As instruções desta entrega estão no Moodle e serão reenviadas.</p>';
        lessons.push({ title: `Entrega: ${name}`, type: 'page', url: '', content, visible });
        report.converted.lessons += 1;
        report.placeholders += hasContent(intro) ? 0 : 1;
        continue;
      }

      if (activity.modulename === 'quiz') {
        const references = [...xml.matchAll(/<question_reference id="\d+">([\s\S]*?)<\/question_reference>/g)]
          .map((match) => ({ entry: tag(match[1], 'questionbankentryid') }));
        const slots = [...xml.matchAll(/<question_instance id="\d+">([\s\S]*?)<\/question_instance>/g)];
        slots.forEach((slot, index) => {
          const entryId = tag(slot[1], 'questionbankentryid') || references[index]?.entry;
          const questionBlock = questionBank.get(entryId);
          if (!questionBlock) {
            report.skipped.push({ type: 'questão de questionário', name, section: section.name, reason: 'questão não encontrada' });
            return;
          }
          const result = convertQuestion(questionBlock);
          if (result.question) {
            quiz.push(result.question);
            report.converted.questions += 1;
          } else if (!result.skip) {
            report.skipped.push({ type: 'questão de questionário', name, section: section.name, reason: `${result.reason} (banco ${entryId})` });
          }
        });
        continue;
      }

      if (activity.modulename === 'folder') {
        report.skipped.push({ type: 'pasta com arquivos', name, section: section.name, reason: 'arquivos não migram automaticamente' });
        continue;
      }

      report.skipped.push({ type: activity.modulename, name, section: section.name, reason: 'tipo não suportado' });
    }

    // Os arquivos referenciados pelo HTML (@@PLUGINFILE@@) não são copiados: contamos para o relatório.
    report.pluginFiles += lessons.reduce((total, lesson) => total + (lesson.content.match(/@@PLUGINFILE@@/g) || []).length, 0);

    // Unidades: no Moodle, um capítulo chamado "UNIDADE N" abre uma unidade; as aulas seguintes da seção
    // pertencem a ela até a próxima unidade. O próprio capítulo de unidade fica dentro da unidade.
    let currentUnit = '';
    for (const lesson of lessons) {
      lesson.title = lesson.title.replace(/[\s|]+$/, '').trim() || lesson.title;
      const header = lesson.title.match(/\bunidade\s+(\d+)\b/i);
      if (header) currentUnit = `Unidade ${header[1]}`;
      lesson.unit = currentUnit;
    }

    if (lessons.length === 0 && quiz.length === 0) continue;

    modules.push({
      title: section.name,
      description: section.summary.slice(0, 2000),
      visible: section.visible,
      lessons,
      quiz
    });
  }

  const finalProjects = sections.flatMap((section) => section.activities)
    .filter((activity) => activity.modulename === 'assign' && /projeto/i.test(activity.title))
    .map((activity) => activity.title);

  const courseName = tag(courseXml, 'fullname') || 'Curso importado';
  const slug = options.slug || courseName;

  const backup = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    course: {
      slug,
      key: '',
      title: courseName,
      summary: stripTags(tag(courseXml, 'summary')).slice(0, 1000),
      banner: '',
      level: '',
      estimatedHours: 0,
      accent: '',
      layout: normalizeLayout(options.layout),
      theme: {},
      finalProject: {
        title: finalProjects.length ? 'Projeto final' : '',
        description: finalProjects.length ? `Entregas do projeto: ${finalProjects.join('; ')}.`.slice(0, 4000) : ''
      },
      modules
    }
  };

  return { backup, report, courseName };
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item.startsWith('--')) {
      args[item.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      args.positional.push(item);
    }
  }
  return args;
}

function renderReport(report, courseName, outputFile) {
  const lines = [
    `# Relatório de conversão: ${courseName}`,
    '',
    `Arquivo gerado: \`${outputFile}\``,
    '',
    '## Convertido',
    `- Recursos de página (rótulos, páginas, capítulos, lições, entregas): ${report.converted.lessons}`,
    `- Links (URLs e Google Meet): ${report.converted.links}`,
    `- Questões de múltipla escolha e verdadeiro/falso: ${report.converted.questions}`,
    '',
    '## Não convertido (precisa de ação manual)',
    ...(report.skipped.length
      ? report.skipped.map((item) => `- [${item.type}] ${item.name} (${item.section}): ${item.reason}`)
      : ['- Nada.']),
    '',
    '## Arquivos referenciados pelo conteúdo',
    `- ${report.pluginFiles} referência(s) a arquivos do Moodle (imagens, PDFs, anexos). Eles aparecem como "@@PLUGINFILE@@" no conteúdo e precisam ser reenviados para a plataforma.`,
    '',
    '## Entregas sem instruções',
    `- ${report.placeholders} entrega(s) sem texto de instrução no Moodle.`,
    ''
  ];
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [input, output] = args.positional;
  if (!input || !output) {
    console.error('Uso: node scripts/convertMoodleBackup.js <arquivo.mbz> <saida.json> [--slug <slug>] [--layout <layout>] [--report <relatorio.md>]');
    process.exitCode = 1;
    return;
  }

  const archive = zlib.gunzipSync(fs.readFileSync(input));
  const xmlFiles = readXmlEntries(archive);
  const { backup, report, courseName } = convertBackup(xmlFiles, { slug: args.slug, layout: args.layout });

  // Valida com as mesmas regras da importação: se passar aqui, passa na API.
  parseBackup(JSON.parse(JSON.stringify(backup)));

  fs.writeFileSync(output, JSON.stringify(backup, null, 2), 'utf8');
  const reportFile = args.report || path.join(path.dirname(output), 'relatorio-conversao.md');
  fs.writeFileSync(reportFile, renderReport(report, courseName, output), 'utf8');

  console.log(`Curso: ${courseName}`);
  console.log(`Seções: ${backup.course.modules.length}`);
  console.log(`Recursos de página: ${report.converted.lessons}, links: ${report.converted.links}, questões: ${report.converted.questions}`);
  console.log(`Itens não convertidos: ${report.skipped.length}`);
  console.log(`Backup: ${output}`);
  console.log(`Relatório: ${reportFile}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { convertBackup, readXmlEntries, convertQuestion, adaptHtml };
