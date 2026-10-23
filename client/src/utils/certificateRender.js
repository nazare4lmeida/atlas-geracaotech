// Desenha o certificado num canvas: fundo + campos (já com o texto final vindo do servidor).
// Posições e tamanhos são frações do fundo; tamanho em pt é convertido pela largura de referência (893 pt).

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar uma imagem do certificado.'));
    image.src = src;
  });
}

function wrapWords(ctx, text, maxWidth) {
  const lines = [];
  String(text || '')
    .split('\n')
    .forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push('');
        return;
      }
      let line = words[0];
      words.slice(1).forEach((word) => {
        const candidate = `${line} ${word}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      });
      lines.push(line);
    });
  return lines;
}

// QR code: quadrado inteiro dentro da caixa do campo, centralizado.
function drawQr(ctx, image, boxX, boxY, boxW, boxH) {
  const side = Math.min(boxW, boxH);
  ctx.drawImage(image, boxX + (boxW - side) / 2, boxY + (boxH - side) / 2, side, side);
}

// Lado do certificado: { background, config } (frente ou verso).
export async function drawCertificate(canvas, side) {
  const background = await loadImage(side.background);
  const width = background.naturalWidth;
  const height = background.naturalHeight;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(background, 0, 0, width, height);

  const scale = width / (side.config.largura_pt || 893);
  ctx.textBaseline = 'top';

  for (const field of side.config.campos) {
    const boxX = field.x * width;
    const boxY = field.y * height;
    const boxW = field.w * width;
    const boxH = field.h * height;

    if (field.tipo === 'qrcode') {
      if (field.qr) drawQr(ctx, await loadImage(field.qr), boxX, boxY, boxW, boxH);
      continue;
    }

    const size = field.tamanhoPt * scale;
    const lineHeight = size * 1.25;
    ctx.font = `${field.negrito ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = field.cor;
    ctx.textAlign = field.alinhamento || 'left';

    const anchorX = field.alinhamento === 'center' ? boxX + boxW / 2 : field.alinhamento === 'right' ? boxX + boxW : boxX;
    wrapWords(ctx, field.texto, boxW).forEach((line, index) => {
      ctx.fillText(line, anchorX, boxY + index * lineHeight);
    });
  }

  return canvas;
}
