// Aparência do site: só valores desta lista chegam ao CSS (o editor escolhe, não digita código).
export const FONTES = {
  sistema: { nome: 'Padrão do sistema', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", google: null },
  inter: { nome: 'Inter', stack: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;600;700' },
  roboto: { nome: 'Roboto', stack: "'Roboto', system-ui, sans-serif", google: 'Roboto:wght@400;500;700' },
  lora: { nome: 'Lora (com serifa)', stack: "'Lora', Georgia, serif", google: 'Lora:wght@400;600;700' }
};

export const LARGURAS = {
  estreita: { nome: 'Estreita', max: '960px' },
  padrao: { nome: 'Padrão', max: '1200px' },
  larga: { nome: 'Larga', max: 'none' }
};

export const APARENCIA_PADRAO = {
  corPrimaria: null,
  corDestaque: null,
  fonte: 'sistema',
  imagemFundo: null,
  imagemFundoCaminho: null,
  opacidadeFundo: 90,
  larguraConteudo: 'padrao'
};

function definirOuRemover(elemento, nome, valor) {
  if (valor) elemento.style.setProperty(nome, valor);
  else elemento.style.removeProperty(nome);
}

function atualizarLinkFonte(google) {
  let link = document.getElementById('site-font-link');
  if (!google) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = 'site-font-link';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
}

// Só aplica o fundo depois que a imagem carregou. Antes, o véu escuro (gradiente) pintava sozinho
// enquanto a imagem ainda baixava, e aparecia um fundo escuro antes da imagem.
let versaoFundo = 0;

function aplicarFundo(corpo, url, opacidade) {
  const versao = ++versaoFundo;
  const opaco = `color-mix(in srgb, var(--bg) ${Math.round(opacidade)}%, transparent)`;
  const imagem = new Image();
  imagem.onload = () => {
    if (versao === versaoFundo) {
      corpo.style.background = `linear-gradient(${opaco}, ${opaco}), url("${url}") center / cover fixed no-repeat`;
    }
  };
  imagem.onerror = () => {
    if (versao === versaoFundo) corpo.style.background = '';
  };
  imagem.src = url;
}

// Aplica a aparência no documento. Falha silenciosa: sem ela o site segue com o padrão.
export function aplicarAparencia(valor) {
  const config = { ...APARENCIA_PADRAO, ...(valor || {}) };
  try {
    const raiz = document.documentElement;
    const corpo = document.body;
    definirOuRemover(raiz, '--primary', config.corPrimaria);
    definirOuRemover(raiz, '--highlight', config.corDestaque);
    raiz.style.setProperty('--site-max', (LARGURAS[config.larguraConteudo] || LARGURAS.padrao).max);

    const fonte = FONTES[config.fonte] || FONTES.sistema;
    corpo.style.fontFamily = config.fonte === 'sistema' ? '' : fonte.stack;
    atualizarLinkFonte(fonte.google);

    if (config.imagemFundo) {
      aplicarFundo(corpo, config.imagemFundo, config.opacidadeFundo);
    } else {
      versaoFundo += 1;
      corpo.style.background = '';
    }
  } catch {
    /* preferência visual: nunca deve travar a tela */
  }
}