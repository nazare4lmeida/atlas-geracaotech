const { withTransaction } = require('../db/pool');
const { newId } = require('../utils/ids');
const PLANS = require('../data/blockPlans');

// Plano da formação, pelo título (o mesmo título vale para cópias da formação, ex.: "Fullstack - 2").
function planForCourse(course) {
  return PLANS.find((plan) => plan.titles.includes(course.title)) || null;
}

async function nextPosition(client, table, scopeColumn, scopeId) {
  const { rows } = await client.query(
    `select coalesce(max(position) + 1, 0) as next from ${table} where ${scopeColumn} = $1`,
    [scopeId]
  );
  return rows[0].next;
}

// Organiza o curso nos blocos do plano.
// Cada parte do plano aponta para um módulo do Moodle (`from`, pelo início do título) e, opcionalmente,
// para uma unidade dele (`unit`). Uma unidade vira um módulo novo, com as aulas dela. O progresso dos alunos
// não muda: aulas concluídas e testes continuam válidos, porque são identificados pelo próprio id.
// Módulos e aulas que o plano não cita ficam em blocos próprios no fim, para nada se perder.
async function applyBlockPlan(client, courseId, plan) {
  const { rows: sections } = await client.query(
    'select id, title, position from sections where course_id = $1 and kind = $2 order by position',
    [courseId, 'modulo']
  );
  const findSection = (prefix) => sections.find((section) => section.title.startsWith(prefix));

  await client.query('update sections set block_id = null where course_id = $1', [courseId]);
  await client.query('delete from course_blocks where course_id = $1', [courseId]);

  const blockIds = [];
  for (const [index, block] of plan.blocks.entries()) {
    const { rows: [row] } = await client.query(
      `insert into course_blocks (course_id, position, title, description, workload_hours, unlock_mode, level, accent)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [
        courseId, index, block.title, block.description || '', block.workloadHours || 0,
        block.unlockMode || 'sequential', block.level || '', block.accent || '#6366f1'
      ]
    );
    blockIds.push(row.id);
  }

  const warnings = [];
  const emptied = new Set();
  const order = []; // ids dos módulos na ordem do plano (bloco, depois parte)

  for (const [index, block] of plan.blocks.entries()) {
    for (const part of block.parts || []) {
      const source = findSection(part.from);
      if (!source) {
        warnings.push(`módulo não encontrado: ${part.from}`);
        continue;
      }

      if (!part.unit) {
        // Módulo inteiro (ex.: exercícios com teste): fica como está, dentro do bloco.
        await client.query(
          'update sections set block_id = $2, title = $3 where id = $1',
          [source.id, blockIds[index], part.title || source.title]
        );
        order.push(source.id);
        continue;
      }

      // Unidade: vira um módulo novo, com as aulas daquela unidade.
      const { rows: lessons } = await client.query(
        'select id from lessons where section_id = $1 and unit = $2',
        [source.id, part.unit]
      );
      if (lessons.length === 0) {
        warnings.push(`unidade sem aulas: ${part.from} · ${part.unit}`);
        continue;
      }
      const newSectionId = newId('mod');
      const position = await nextPosition(client, 'sections', 'course_id', courseId);
      await client.query(
        `insert into sections (id, course_id, position, title, description, visible, block_id)
         values ($1, $2, $3, $4, '', true, $5)`,
        [newSectionId, courseId, position, part.title || part.unit, blockIds[index]]
      );
      await client.query(
        'update lessons set section_id = $2 where section_id = $1 and unit = $3',
        [source.id, newSectionId, part.unit]
      );
      emptied.add(source.id);
      order.push(newSectionId);
    }
  }

  // Módulos de origem que ficaram sem aulas e sem teste saem do curso (o conteúdo já está nas unidades).
  for (const sectionId of emptied) {
    await client.query(
      `delete from sections s
        where s.id = $1
          and not exists (select 1 from lessons l where l.section_id = s.id)
          and not exists (select 1 from quiz_questions q where q.section_id = s.id)`,
      [sectionId]
    );
  }

  // Ordem dos módulos conforme o plano. Duas etapas para não repetir posição no meio do caminho.
  await client.query('update sections set position = position + 100000 where course_id = $1', [courseId]);
  for (const [position, sectionId] of order.entries()) {
    await client.query('update sections set position = $2 where id = $1', [sectionId, position]);
  }

  // Seções que o plano não citou (e que ainda têm conteúdo) ganham blocos próprios no fim.
  const { rows: leftovers } = await client.query(
    `select s.id, s.title from sections s
      where s.course_id = $1 and s.kind = 'modulo' and s.block_id is null
      order by s.position`,
    [courseId]
  );
  for (const [offset, section] of leftovers.entries()) {
    const { rows: [row] } = await client.query(
      `insert into course_blocks (course_id, position, title, unlock_mode)
       values ($1, $2, $3, 'sequential') returning id`,
      [courseId, plan.blocks.length + offset, section.title]
    );
    await client.query('update sections set block_id = $2 where id = $1', [section.id, row.id]);
    warnings.push(`fora do plano, bloco próprio: ${section.title}`);
  }

  for (const [index, project] of (plan.projects || []).entries()) {
    const blockIndex = plan.blocks.findIndex((block) => block.title === project.block);
    const blockId = blockIndex >= 0 ? blockIds[blockIndex] : null;
    const { rowCount } = await client.query(
      `update course_projects set title = $3, description = $4, block_id = $5, updated_at = now()
        where course_id = $1 and position = $2`,
      [courseId, index, project.title, project.description || '', blockId]
    );
    if (rowCount === 0) {
      await client.query(
        `insert into course_projects (course_id, position, title, description, block_id)
         values ($1, $2, $3, $4, $5)`,
        [courseId, index, project.title, project.description || '', blockId]
      );
    }
  }

  await client.query('update courses set block_plan_applied = true where id = $1', [courseId]);

  return { warnings };
}

// Aplica, uma única vez, os planos das formações que ainda não os receberam. Roda no db:migrate.
async function applyPendingBlockPlans() {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select id, title from courses where block_plan_applied = false');
    const applied = [];
    for (const course of rows) {
      const plan = planForCourse(course);
      if (!plan) continue;
      const result = await applyBlockPlan(client, course.id, plan);
      applied.push({ title: course.title, warnings: result.warnings });
    }
    return applied;
  });
}

module.exports = { planForCourse, applyBlockPlan, applyPendingBlockPlans };
