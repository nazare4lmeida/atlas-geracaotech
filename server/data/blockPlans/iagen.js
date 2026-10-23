// Plano da Inteligência Artificial Generativa - 4.0: o curso em quatro blocos, um por módulo do Moodle.
// Cada unidade do Moodle vira um módulo dentro do bloco, com as aulas dela.
// Carga horária e níveis são sugestões: ajuste aqui ou pela gestão do curso antes de publicar.

module.exports = {
  titles: ['Inteligência Artificial Generativa - 4.0'],
  blocks: [
    {
      title: 'Fundamentos de IA Generativa', level: 'Iniciante', workloadHours: 0, accent: '#6366f1',
      description: 'Entenda como funcionam os modelos de linguagem, a ética, a engenharia de prompt e as APIs.',
      parts: [
        { from: 'Avisos, Fóruns', title: 'Avisos e fóruns' },
        { from: 'Apresentação do Curso', title: 'Apresentação do curso' },
        { from: 'MÓDULO 1', unit: 'Unidade 1', title: 'Introdução à IA Generativa e modelos de linguagem' },
        { from: 'MÓDULO 1', unit: 'Unidade 2', title: 'Ética, segurança e impacto ambiental' },
        { from: 'MÓDULO 1', unit: 'Unidade 3', title: 'Engenharia de prompt e melhores práticas' },
        { from: 'MÓDULO 1', unit: 'Unidade 4', title: 'Exploração de APIs de modelos de linguagem' },
        { from: 'MÓDULO 1', title: 'Teste do Módulo 1' }
      ]
    },
    {
      title: 'Embeddings e RAG', level: 'Intermediário', workloadHours: 0, accent: '#14b8a6',
      description: 'Vetorize informações, recupere contexto e construa aplicações com RAG e MCP.',
      parts: [
        { from: 'Módulo 2 -', unit: 'Unidade 1', title: 'Fundamentos de embeddings' },
        { from: 'Módulo 2 -', unit: 'Unidade 2', title: 'Recuperação de informação' },
        { from: 'Módulo 2 -', unit: 'Unidade 3', title: 'Aplicações de RAG' },
        { from: 'Módulo 2 -', unit: 'Unidade 4', title: 'MCP e contexto' }
      ]
    },
    {
      title: 'Workflows e Data Lake', level: 'Intermediário', workloadHours: 0, accent: '#f59e0b',
      description: 'Automatize processos com low code, integrações, APIs, data lake e pipelines.',
      parts: [
        { from: 'Módulo 3 -', unit: 'Unidade 1', title: 'Automação e low code' },
        { from: 'Módulo 3 -', unit: 'Unidade 2', title: 'Integrações e APIs' },
        { from: 'Módulo 3 -', unit: 'Unidade 3', title: 'Data lake e repositórios' },
        { from: 'Módulo 3 -', unit: 'Unidade 4', title: 'Pipelines' }
      ]
    },
    {
      title: 'Multiagentes de IA Generativa', level: 'Avançado', workloadHours: 0, accent: '#a855f7',
      description: 'Projete agentes autônomos, com segurança, integrações e arquitetura multiagente.',
      parts: [
        { from: 'Módulo 04', unit: 'Unidade 1', title: 'Agentes autônomos e segurança' },
        { from: 'Módulo 04', unit: 'Unidade 2', title: 'Continuação: agentes autônomos e segurança' },
        { from: 'Módulo 04', unit: 'Unidade 3', title: 'Agentes inteligentes e integração' },
        { from: 'Módulo 04', unit: 'Unidade 4', title: 'Integrações avançadas de agentes autônomos' }
      ]
    }
  ]
};
