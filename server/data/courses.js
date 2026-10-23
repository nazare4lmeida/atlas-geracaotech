const accentPalette = {
  logic: '#6366f1',
  htmlcss: '#14b8a6',
  javascript: '#f59e0b',
  react: '#38bdf8',
  node: '#22c55e',
  git: '#ef4444'
};

const coursesCatalog = [
  {
    slug: 'logica-de-programacao',
    key: 'logic',
    title: 'Lógica de Programação',
    summary: 'Construa pensamento computacional, algoritmos e resolução de problemas.',
    accent: accentPalette.logic,
    level: 'Iniciante',
    estimatedHours: 12,
    banner:
      'Aprenda a transformar problemas do mundo real em passos claros, testáveis e reutilizáveis.',
    finalProject: {
      title: 'Projeto Final: Simulador de Rotina de Estudos',
      description:
        'Crie um algoritmo que receba metas, tempo disponível e prioridades para montar uma rotina semanal de estudos.'
    },
    modules: [
      {
        id: 'logic-1',
        title: 'Pensamento computacional e algoritmos',
        description:
          'Entenda como decompor problemas, identificar padrões e escrever algoritmos descritivos.',
        lessons: [
          {
            id: 'logic-1-1',
            title: 'O que é lógica de programação',
            videoUrl: 'https://www.youtube.com/embed/zOjov-2OZ0E',
            content: `Lógica de programação é a habilidade de organizar raciocínio em etapas claras para que uma máquina consiga executar uma tarefa. Em vez de pensar apenas no código, você aprende a estruturar a solução. Isso inclui identificar entradas, processamento e saídas, além de prever erros e casos especiais.

Um bom algoritmo é legível, finito, ordenado e testável. Ao estudar lógica, você constrói a base para qualquer linguagem futura: JavaScript, Python, Java ou qualquer outra. O foco é aprender a pensar como desenvolvedor, modelando regras com precisão.`
          },
          {
            id: 'logic-1-2',
            title: 'Fluxogramas e pseudocódigo',
            videoUrl: 'https://www.youtube.com/embed/XZwBNDGuWGU',
            content: `Fluxogramas ajudam a visualizar decisões, repetições e fluxo de dados. Já o pseudocódigo descreve a solução em linguagem humana estruturada. Esses dois recursos aceleram o entendimento do problema antes de implementar código real.

Ao praticar pseudocódigo, trabalhe com verbos objetivos, condições explícitas e passos curtos. Isso reduz ambiguidade e ajuda na transição para uma linguagem de programação.`
          }
        ],
        quiz: [
          {
            question: 'Qual é o principal objetivo de um algoritmo?',
            options: [
              'Deixar o código mais bonito',
              'Descrever passos finitos para resolver um problema',
              'Escolher a linguagem ideal',
              'Substituir o banco de dados'
            ],
            answer: 1
          },
          {
            question: 'Qual recurso é mais visual para representar decisões?',
            options: ['Fluxograma', 'Banco relacional', 'Deploy', 'Framework'],
            answer: 0
          }
        ]
      },
      {
        id: 'logic-2',
        title: 'Variáveis, operadores e estruturas condicionais',
        description:
          'Descubra como armazenar dados, comparar valores e tomar decisões.',
        lessons: [
          {
            id: 'logic-2-1',
            title: 'Tipos de dados e variáveis',
            videoUrl: 'https://www.youtube.com/embed/6iF8Xb7Z3wQ',
            content: `Variáveis são espaços nomeados usados para guardar informações durante a execução do programa. Você pode armazenar números, textos, estados booleanos e até coleções de dados. Saber nomear variáveis corretamente aumenta muito a legibilidade.

Na prática, você deve pensar em tipos de dados com base no que será manipulado. Idade tende a ser número, nome tende a ser texto, status de matrícula tende a ser booleano. Essa clareza influencia decisões, validações e cálculos.`
          },
          {
            id: 'logic-2-2',
            title: 'Condições, comparações e cenários',
            videoUrl: 'https://www.youtube.com/embed/4pYsp5m6u7M',
            content: `Estruturas condicionais permitem alterar o fluxo do programa com base em regras. Você avalia expressões e escolhe qual caminho seguir. Esse raciocínio aparece em autenticação, validação de formulários, filtros e muito mais.

Ao escrever condições, prefira expressões simples, bem nomeadas e fáceis de testar. Em sistemas reais, uma condição ruim pode gerar comportamentos inesperados ou até vulnerabilidades.`
          }
        ],
        quiz: [
          {
            question: 'Quando usamos uma estrutura condicional?',
            options: [
              'Quando queremos repetir um bloco várias vezes',
              'Quando precisamos decidir entre caminhos possíveis',
              'Quando vamos estilizar uma página',
              'Quando faremos deploy'
            ],
            answer: 1
          },
          {
            question: 'Qual opção representa um dado booleano?',
            options: ['"Nazare"', '42', 'true', '[1,2,3]'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'html-css',
    key: 'htmlcss',
    title: 'HTML & CSS',
    summary: 'Crie interfaces semânticas, responsivas e agradáveis.',
    accent: accentPalette.htmlcss,
    level: 'Iniciante',
    estimatedHours: 14,
    banner: 'Estruture páginas com semântica e estilize layouts modernos com CSS.',
    finalProject: {
      title: 'Projeto Final: Landing Page de Portfólio',
      description:
        'Desenvolva uma landing page responsiva com seções, CTA, cards e layout mobile-first.'
    },
    modules: [
      {
        id: 'html-1',
        title: 'Estrutura e semântica',
        description: 'Aprenda a montar documentos acessíveis e organizados.',
        lessons: [
          {
            id: 'html-1-1',
            title: 'Anatomia do HTML',
            videoUrl: 'https://www.youtube.com/embed/pQN-pnXPaVg',
            content: `HTML define a estrutura do conteúdo. Elementos semânticos como header, main, section, article e footer comunicam intenção para navegadores, leitores de tela e mecanismos de busca. Uma boa estrutura ajuda acessibilidade e manutenção.

Ao pensar em HTML, foque em significado antes de aparência. Isso facilita evoluções de layout e reduz dependência de divs genéricas.`
          },
          {
            id: 'html-1-2',
            title: 'Formulários e acessibilidade',
            videoUrl: 'https://www.youtube.com/embed/fNcJuPIZ2WE',
            content: `Formulários são essenciais em aplicações reais. Labels, placeholders, validações e mensagens de erro claras afetam diretamente a experiência do usuário. Acessibilidade significa garantir navegação, leitura e interação com o maior número de pessoas possível.

Use label associado, textos de ajuda e hierarquia correta de títulos. Pequenos cuidados geram interfaces mais humanas.`
          }
        ],
        quiz: [
          {
            question: 'Qual tag indica o conteúdo principal da página?',
            options: ['main', 'span', 'strong', 'style'],
            answer: 0
          },
          {
            question: 'Por que usar label em formulários?',
            options: [
              'Para adicionar animação',
              'Para melhorar acessibilidade e contexto do campo',
              'Para conectar banco de dados',
              'Para minificar CSS'
            ],
            answer: 1
          }
        ]
      },
      {
        id: 'html-2',
        title: 'CSS moderno e responsividade',
        description: 'Utilize flexbox, grid, variáveis e media queries.',
        lessons: [
          {
            id: 'html-2-1',
            title: 'Flexbox e Grid',
            videoUrl: 'https://www.youtube.com/embed/JJSoEo8JSnc',
            content: `Flexbox resolve alinhamento e distribuição em um eixo. Grid permite controlar linhas e colunas com mais precisão. Juntos, esses recursos cobrem a maior parte dos layouts modernos. Em vez de hacks antigos, você passa a pensar em composição.

Use flexbox para componentes lineares, como barras e menus. Use grid para páginas, cards e dashboards.`
          },
          {
            id: 'html-2-2',
            title: 'Responsividade e design system',
            videoUrl: 'https://www.youtube.com/embed/srvUrASNj0s',
            content: `Responsividade é adaptar o layout a diferentes larguras e contextos. Isso não é só reduzir elementos: envolve priorização de conteúdo, tipografia escalável e espaçamento coerente. Já um design system ajuda a repetir padrões com consistência.

Variáveis CSS, tokens de cor e escala de espaçamento aceleram a manutenção e deixam a interface mais profissional.`
          }
        ],
        quiz: [
          {
            question: 'Qual recurso é mais indicado para layouts bidimensionais?',
            options: ['Grid', 'Float', 'Position fixed', 'Transform'],
            answer: 0
          },
          {
            question: 'O que significa mobile-first?',
            options: [
              'Construir primeiro para telas menores e depois expandir',
              'Criar apenas apps nativos',
              'Usar somente JavaScript',
              'Ignorar acessibilidade'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'javascript',
    key: 'javascript',
    title: 'JavaScript',
    summary: 'Domine a linguagem da web com foco em lógica, DOM e assincronicidade.',
    accent: accentPalette.javascript,
    level: 'Intermediário',
    estimatedHours: 18,
    banner: 'Saia do básico e aprenda a transformar páginas em aplicações interativas.',
    finalProject: {
      title: 'Projeto Final: Task Manager',
      description:
        'Monte um gerenciador de tarefas com filtros, persistência local, validação e estatísticas.'
    },
    modules: [
      {
        id: 'js-1',
        title: 'Fundamentos da linguagem',
        description: 'Sintaxe, escopo, funções e manipulação de dados.',
        lessons: [
          {
            id: 'js-1-1',
            title: 'Variáveis, escopo e funções',
            videoUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk',
            content: `JavaScript é a linguagem que dá comportamento à web. Ao dominar variáveis, funções e escopo, você aprende como o programa organiza estado e executa tarefas. Funções permitem reutilizar lógica, isolar responsabilidades e melhorar testes.

Também é importante entender a diferença entre escopo global, de função e de bloco. Essa distinção evita bugs difíceis ligados a reatribuições e closures.`
          },
          {
            id: 'js-1-2',
            title: 'Arrays, objetos e métodos úteis',
            videoUrl: 'https://www.youtube.com/embed/R8rmfD9Y5-c',
            content: `Arrays e objetos são a base de qualquer aplicação JavaScript. Você usa arrays para listas e objetos para modelar entidades com propriedades. Métodos como map, filter e reduce tornam o código mais declarativo e legível.

Pensar em transformação de dados é uma habilidade central no front-end e no back-end.`
          }
        ],
        quiz: [
          {
            question: 'Qual método retorna um novo array filtrado?',
            options: ['push', 'filter', 'forEach', 'sort'],
            answer: 1
          },
          {
            question: 'Funções ajudam principalmente a:',
            options: [
              'Repetir lógica sem organização',
              'Estilizar componentes',
              'Reutilizar comportamento e separar responsabilidades',
              'Substituir rotas'
            ],
            answer: 2
          }
        ]
      },
      {
        id: 'js-2',
        title: 'DOM, eventos e assincronicidade',
        description: 'Interaja com elementos e consuma dados externos.',
        lessons: [
          {
            id: 'js-2-1',
            title: 'Manipulação do DOM',
            videoUrl: 'https://www.youtube.com/embed/0ik6X4DJKCc',
            content: `O DOM representa a estrutura da página em objetos manipuláveis. Com JavaScript, você pode alterar texto, atributos, classes, estilos e reagir a eventos como clique, digitação e scroll.

O segredo é manter a lógica previsível. Eventos demais espalhados sem organização tornam a manutenção difícil.`
          },
          {
            id: 'js-2-2',
            title: 'Promises, async/await e APIs',
            videoUrl: 'https://www.youtube.com/embed/PoRJizFvM7s',
            content: `Aplicações modernas dependem de comunicação assíncrona. Promises representam operações futuras e async/await facilita a leitura. Com isso você busca dados, envia formulários e integra serviços externos sem travar a interface.

Também é essencial lidar com erros, estados de carregamento e mensagens de feedback.`
          }
        ],
        quiz: [
          {
            question: 'Qual sintaxe deixa código assíncrono mais legível?',
            options: ['switch', 'async/await', 'typeof', 'classList'],
            answer: 1
          },
          {
            question: 'O DOM representa:',
            options: [
              'A estrutura da página como objetos manipuláveis',
              'O banco de dados do navegador',
              'Um tipo de API de autenticação',
              'Um sistema de deploy'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'react',
    key: 'react',
    title: 'React',
    summary: 'Componentize interfaces e gerencie estado de forma escalável.',
    accent: accentPalette.react,
    level: 'Intermediário',
    estimatedHours: 16,
    banner: 'Aprenda a construir interfaces reativas, modulares e prontas para produto.',
    finalProject: {
      title: 'Projeto Final: Dashboard de Estudos',
      description:
        'Crie um dashboard com autenticação simulada, cards, rotas e gráficos simples.'
    },
    modules: [
      {
        id: 'react-1',
        title: 'Componentes, props e estado',
        description: 'Entenda a base do pensamento em componentes.',
        lessons: [
          {
            id: 'react-1-1',
            title: 'JSX e composição',
            videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk',
            content: `React permite compor interfaces a partir de componentes reutilizáveis. Cada componente recebe dados via props e pode manter estado interno. Isso ajuda a dividir aplicações grandes em partes pequenas, previsíveis e fáceis de testar.

Com JSX, você escreve uma sintaxe declarativa próxima do HTML, mas com o poder do JavaScript.`
          },
          {
            id: 'react-1-2',
            title: 'useState e renderização',
            videoUrl: 'https://www.youtube.com/embed/O6P86uwfdR0',
            content: `Estado é o que muda com o tempo. Ao atualizar estado, o React recalcula a interface e re-renderiza o que é necessário. Pensar em fluxo de dados e origem da verdade é essencial para evitar inconsistências.

O estado deve morar no lugar mais apropriado, nem muito alto sem necessidade, nem muito baixo limitando reutilização.`
          }
        ],
        quiz: [
          {
            question: 'Props servem para:',
            options: [
              'Passar dados de um componente para outro',
              'Criar banco de dados',
              'Executar queries SQL',
              'Substituir CSS'
            ],
            answer: 0
          },
          {
            question: 'Qual hook manipula estado local?',
            options: ['useMemo', 'useState', 'useNavigate', 'useRefetch'],
            answer: 1
          }
        ]
      },
      {
        id: 'react-2',
        title: 'Rotas, efeitos e arquitetura',
        description: 'Conecte telas e lide com efeitos colaterais.',
        lessons: [
          {
            id: 'react-2-1',
            title: 'React Router na prática',
            videoUrl: 'https://www.youtube.com/embed/Ul3y1LXxzdU',
            content: `Aplicações de página única precisam de navegação sem recarregar o navegador. O React Router resolve isso com rotas declarativas, parâmetros e navegação programática.

Você pode proteger telas, criar layouts compartilhados e organizar experiências complexas com clareza.`
          },
          {
            id: 'react-2-2',
            title: 'useEffect e comunicação com APIs',
            videoUrl: 'https://www.youtube.com/embed/0ZJgIjIuY7U',
            content: `Efeitos colaterais incluem chamadas HTTP, timers e integrações externas. O useEffect ajuda a sincronizar essas ações com o ciclo de vida do componente. Porém, seu uso excessivo sem planejamento costuma gerar bugs de dependência.

Combine estado, serviços e componentes bem separados para manter o projeto saudável.`
          }
        ],
        quiz: [
          {
            question: 'Quando normalmente usamos useEffect?',
            options: [
              'Para estilizar com CSS',
              'Para executar efeitos como chamadas de API',
              'Para criar tabelas no banco',
              'Para minificar imagens'
            ],
            answer: 1
          },
          {
            question: 'Qual biblioteca desta stack cuida das rotas?',
            options: ['Axios', 'Express', 'React Router Dom', 'Mongoose'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'node-js',
    key: 'node',
    title: 'Node.js',
    summary: 'Crie APIs escaláveis com Express, middlewares e persistência.',
    accent: accentPalette.node,
    level: 'Intermediário',
    estimatedHours: 17,
    banner: 'Leve JavaScript para o servidor e entenda a base de aplicações web modernas.',
    finalProject: {
      title: 'Projeto Final: API de Conteúdo',
      description:
        'Implemente uma API CRUD com autenticação, validação e persistência de dados.'
    },
    modules: [
      {
        id: 'node-1',
        title: 'Fundamentos do back-end',
        description: 'Entenda requisições, respostas, rotas e middlewares.',
        lessons: [
          {
            id: 'node-1-1',
            title: 'Node.js e o ciclo request-response',
            videoUrl: 'https://www.youtube.com/embed/TlB_eWDSMt4',
            content: `Node.js permite executar JavaScript no servidor usando um modelo orientado a eventos. Em APIs, o coração do trabalho é receber requisições, processar regras e devolver respostas adequadas.

Compreender verbos HTTP, status codes e separação de responsabilidades é obrigatório para criar serviços confiáveis.`
          },
          {
            id: 'node-1-2',
            title: 'Express e middlewares',
            videoUrl: 'https://www.youtube.com/embed/L72fhGm1tfE',
            content: `Express simplifica o roteamento e a composição do servidor. Middlewares interceptam a requisição para autenticar, validar, registrar logs e padronizar respostas.

Um bom pipeline de middlewares melhora segurança e manutenção.`
          }
        ],
        quiz: [
          {
            question: 'Qual papel de um middleware no Express?',
            options: [
              'Interceptar a requisição para tratar algum comportamento',
              'Desenhar a interface visual',
              'Executar CSS',
              'Criar componentes React'
            ],
            answer: 0
          },
          {
            question: 'Em uma API REST, GET normalmente é usado para:',
            options: ['Ler dados', 'Apagar banco', 'Gerar CSS', 'Minificar imagens'],
            answer: 0
          }
        ]
      },
      {
        id: 'node-2',
        title: 'Autenticação e banco de dados',
        description: 'Proteja rotas e modele dados com consistência.',
        lessons: [
          {
            id: 'node-2-1',
            title: 'JWT e autenticação',
            videoUrl: 'https://www.youtube.com/embed/mbsmsi7l3r4',
            content: `JWT é uma forma compacta de representar identidade e autorização. Após login, o servidor assina um token que o cliente envia nas próximas requisições. No back-end, o token é validado antes de permitir acesso a rotas privadas.

É importante armazenar segredos com segurança e evitar expor dados sensíveis no payload.`
          },
          {
            id: 'node-2-2',
            title: 'Modelagem com Mongoose',
            videoUrl: 'https://www.youtube.com/embed/DZBGEVgL2eE',
            content: `Mongoose organiza a camada de dados com schemas, validações e modelos. Você define formatos esperados, relacionamentos simples e timestamps, criando uma base mais previsível.

A modelagem correta evita inconsistências e simplifica consultas.`
          }
        ],
        quiz: [
          {
            question: 'O JWT é normalmente enviado ao servidor em qual header?',
            options: ['Authorization', 'Accept-Language', 'Referer', 'User-Agent'],
            answer: 0
          },
          {
            question: 'Mongoose é usado para:',
            options: [
              'Criar interfaces em React',
              'Modelar dados MongoDB em aplicações Node',
              'Processar imagens',
              'Executar testes E2E'
            ],
            answer: 1
          }
        ]
      }
    ]
  },
  {
    slug: 'git-github',
    key: 'git',
    title: 'Git & GitHub',
    summary: 'Versione projetos, colabore em equipe e publique portfólio.',
    accent: accentPalette.git,
    level: 'Iniciante',
    estimatedHours: 8,
    banner: 'Entenda commits, branches, pull requests e fluxo de colaboração real.',
    finalProject: {
      title: 'Projeto Final: Portfólio Versionado',
      description:
        'Versione um projeto completo, crie branches temáticas e documente o repositório com README.'
    },
    modules: [
      {
        id: 'git-1',
        title: 'Versionamento local',
        description: 'Aprenda commits, staging e histórico.',
        lessons: [
          {
            id: 'git-1-1',
            title: 'Snapshot do projeto',
            videoUrl: 'https://www.youtube.com/embed/RGOj5yH7evk',
            content: `Git é um sistema de versionamento distribuído. Ele registra snapshots do projeto ao longo do tempo e permite voltar, comparar e evoluir com segurança. Em vez de salvar arquivos com nomes como final-v2-mesmo-agora, você passa a rastrear mudanças com contexto.

Commits bons contam a história do produto com clareza.`
          },
          {
            id: 'git-1-2',
            title: 'Branches e organização',
            videoUrl: 'https://www.youtube.com/embed/e9lnsKot_SQ',
            content: `Branches permitem trabalhar em linhas paralelas sem quebrar a principal. Esse recurso é indispensável para times, revisões e experimentos. Você cria, testa, revisa e integra mudanças quando estiverem maduras.

Ao nomear branches e commits com consistência, a colaboração melhora muito.`
          }
        ],
        quiz: [
          {
            question: 'O staging area serve para:',
            options: [
              'Selecionar mudanças que entrarão no próximo commit',
              'Hospedar o site',
              'Rodar banco de dados',
              'Gerar CSS'
            ],
            answer: 0
          },
          {
            question: 'Branches são úteis para:',
            options: [
              'Trabalhar em funcionalidades isoladas',
              'Apagar histórico',
              'Substituir README',
              'Remover autenticação'
            ],
            answer: 0
          }
        ]
      },
      {
        id: 'git-2',
        title: 'Colaboração no GitHub',
        description: 'Use remotos, pull requests e boas práticas de revisão.',
        lessons: [
          {
            id: 'git-2-1',
            title: 'Push, pull e sincronização',
            videoUrl: 'https://www.youtube.com/embed/HkdAHXoRtos',
            content: `Ao conectar um repositório local ao GitHub, você ganha um ponto de compartilhamento, backup e colaboração. Push envia commits, pull atualiza sua cópia local e fetch baixa referências sem mesclar automaticamente.

Esses comandos fazem parte do dia a dia de qualquer time.`
          },
          {
            id: 'git-2-2',
            title: 'Pull requests e revisão',
            videoUrl: 'https://www.youtube.com/embed/8lGpZkjnkt4',
            content: `Pull requests organizam mudanças antes da integração final. Eles permitem discutir código, validar impacto, documentar contexto e reforçar qualidade. Saber abrir um bom PR é uma habilidade profissional importante.

Descreva objetivo, abordagem, testes e pontos de atenção com clareza.`
          }
        ],
        quiz: [
          {
            question: 'Qual recurso do GitHub é usado para revisar mudanças antes do merge?',
            options: ['Pull request', 'Forklift', 'Pipeline DOM', 'Snippet SQL'],
            answer: 0
          },
          {
            question: 'O comando pull normalmente:',
            options: [
              'Baixa e integra mudanças do remoto',
              'Apaga branches',
              'Cria CSS',
              'Gera certificado'
            ],
            answer: 0
          }
        ]
      }
    ]
  }
];

function getCourseBySlug(slug) {
  return coursesCatalog.find((course) => course.slug === slug);
}

function getLessonCount(course) {
  return course.modules.reduce((total, module) => total + module.lessons.length, 0);
}

function getQuizCount(course) {
  return course.modules.length;
}

module.exports = {
  coursesCatalog,
  getCourseBySlug,
  getLessonCount,
  getQuizCount
};
