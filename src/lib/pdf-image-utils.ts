/**
 * Utilitários para compressão de imagens em PDFs
 * Reduz significativamente o tamanho dos arquivos PDF para envio por email
 */

// Configurações de compressão otimizadas para email
const PDF_IMAGE_CONFIG = {
  maxWidth: 800,      // Largura máxima em pixels
  maxHeight: 600,     // Altura máxima em pixels
  quality: 0.6,       // Qualidade JPEG (0.6 = bom equilíbrio tamanho/qualidade)
  logoMaxWidth: 200,  // Largura máxima para logos
  logoMaxHeight: 100, // Altura máxima para logos
  logoQuality: 0.7,   // Qualidade para logos (um pouco maior)
};

/**
 * Processa e comprime uma imagem para uso em PDF
 * Reduz dimensões e qualidade para diminuir o tamanho do arquivo
 */
export function processarImagemParaPDF(img: HTMLImageElement, isLogo: boolean = false): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  const maxWidth = isLogo ? PDF_IMAGE_CONFIG.logoMaxWidth : PDF_IMAGE_CONFIG.maxWidth;
  const maxHeight = isLogo ? PDF_IMAGE_CONFIG.logoMaxHeight : PDF_IMAGE_CONFIG.maxHeight;
  const quality = isLogo ? PDF_IMAGE_CONFIG.logoQuality : PDF_IMAGE_CONFIG.quality;

  let { naturalWidth: width, naturalHeight: height } = img;

  // Redimensionar se necessário
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;

  // Usar suavização para melhor qualidade ao redimensionar
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Carrega e comprime uma imagem de URL para uso em PDF
 */
export function carregarImagemComprimida(url: string, isLogo: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const compressed = processarImagemParaPDF(img, isLogo);
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });
}
