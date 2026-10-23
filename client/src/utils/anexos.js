// Anexos do atendimento: imagem (PNG, JPG, GIF, WEBP) ou PDF, até 2 MB.
export const TIPOS_ACEITOS = 'image/png,image/jpeg,image/gif,image/webp,application/pdf';
export const LIMITE_ANEXO = 2 * 1024 * 1024;

export function lerArquivo(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Escolha um arquivo.'));
    if (file.size > LIMITE_ANEXO) return reject(new Error('O arquivo pode ter no máximo 2 MB.'));
    const leitor = new FileReader();
    leitor.onload = () => {
      const texto = String(leitor.result || '');
      resolve({ nome: file.name, tipo: file.type, dados: texto.replace(/^data:[^;]+;base64,/, '') });
    };
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(file);
  });
}

export function tamanhoLegivel(bytes) {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
