// Plano da Desenvolvimento Web Fullstack - 4.0: a divisão do conteúdo em sete blocos, na ordem da imagem oficial.
// Cada bloco junta partes de módulos do Moodle. Uma parte pode ser o módulo inteiro (`from`) ou só uma unidade (`unit`),
// e a unidade vira um módulo próprio dentro do bloco, com as aulas dela.
// Aulas de Avisos e Apresentação ficam no primeiro bloco; os arquivos de apoio, no bloco de Git & GitHub.
// Os testes automatizados (Módulo 4 do Moodle) formam o bloco final.

module.exports = {
  titles: ['Desenvolvimento Web Fullstack - 4.0'],
  blocks: [
    {
      title: 'Lógica de Programação', level: 'Iniciante', workloadHours: 12, accent: '#6366f1',
      description: 'Construa pensamento computacional, algoritmos e resolução de problemas.',
      parts: [
        { from: 'Avisos, Fóruns', title: 'Avisos e fóruns' },
        { from: 'Apresentação do Curso', title: 'Apresentação do curso' },
        { from: 'Módulo 1 -', unit: 'Unidade 1', title: 'Introdução ao desenvolvimento web' }
      ]
    },
    {
      title: 'HTML & CSS', level: 'Iniciante', workloadHours: 14, accent: '#14b8a6',
      description: 'Crie interfaces semânticas, responsivas e agradáveis.',
      parts: [
        { from: 'Módulo 1 -', unit: 'Unidade 2', title: 'HTML e CSS' },
        { from: 'Módulo 1 -', unit: 'Unidade 4', title: 'Bootstrap' },
        { from: 'Exercícios de HTML e CSS', title: 'Exercícios de HTML e CSS' }
      ]
    },
    {
      title: 'Git & GitHub', level: 'Iniciante', workloadHours: 8, accent: '#ef4444',
      description: 'Versione projetos, colabore em equipe e publique portfólio.',
      parts: [
        { from: 'Módulo 1 -', unit: 'Unidade 3', title: 'Git e GitHub' },
        { from: 'Arquivos de Apoio', title: 'Arquivos de apoio' }
      ]
    },
    {
      title: 'JavaScript', level: 'Intermediário', workloadHours: 18, accent: '#f59e0b',
      description: 'Domine a linguagem da web com foco em lógica, DOM e assincronicidade.',
      parts: [
        { from: 'Módulo 2 -', unit: 'Unidade 1', title: 'JavaScript' },
        { from: 'Exercícios de Javascript', title: 'Exercícios de JavaScript' }
      ]
    },
    {
      title: 'React', level: 'Intermediário', workloadHours: 16, accent: '#38bdf8',
      description: 'Componentize interfaces e gerencie estado de forma escalável.',
      parts: [
        { from: 'Módulo 2 -', unit: 'Unidade 2', title: 'React' },
        { from: 'Exercícios de React', title: 'Exercícios de React' }
      ]
    },
    {
      title: 'Node.js', level: 'Intermediário', workloadHours: 17, accent: '#22c55e',
      description: 'Crie APIs escaláveis com Express, middlewares e persistência.',
      parts: [
        { from: 'Módulo 3 -', unit: 'Unidade 1', title: 'Back-end com Node.js' },
        { from: 'Módulo 3 -', unit: 'Unidade 2', title: 'Banco de dados' },
        { from: 'Módulo 3 -', unit: 'Unidade 3', title: 'Autenticação JWT' },
        { from: 'Exercícios de Back-end', title: 'Exercícios de back-end' }
      ]
    },
    {
      title: 'Testes Automatizados', level: 'Intermediário', workloadHours: 16, accent: '#a855f7',
      description: 'Teste interfaces com Cypress e valide APIs de forma automatizada.',
      parts: [
        { from: 'Módulo 4 -', unit: 'Unidade 1', title: 'Testes automatizados com Cypress' },
        { from: 'Módulo 4 -', unit: 'Unidade 2', title: 'Testes automatizados para APIs' }
      ]
    }
  ],
  // Os dois projetos da Fullstack: front-end no bloco React, back-end no bloco Node.js.
  projects: [
    { title: 'Projeto Front-end', description: '', block: 'React' },
    { title: 'Projeto Back-end', description: '', block: 'Node.js' }
  ]
};
