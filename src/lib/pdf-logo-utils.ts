import defaultLogo from "@/assets/mec-hydro-logo-novo.jpg";

/**
 * Carrega uma imagem de logo para uso no jsPDF
 * Suporta URLs externas (com conversão para base64) e imports locais
 */
export async function loadLogoForPDF(logoUrl: string | null | undefined): Promise<{
  dataUrl: string;
  format: 'JPEG' | 'PNG';
}> {
  const defaultResult = { dataUrl: defaultLogo, format: 'JPEG' as const };
  
  // Se não há URL externa, usa o logo padrão
  if (!logoUrl) {
    return defaultResult;
  }

  try {
    // Para URLs externas, buscar como blob e converter para base64
    const response = await fetch(logoUrl, { mode: 'cors' });
    if (!response.ok) {
      console.warn('Erro ao buscar logo externo, usando padrão');
      return defaultResult;
    }
    
    const blob = await response.blob();
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve({ dataUrl: base64, format });
      };
      reader.onerror = () => {
        console.warn('Erro ao converter logo para base64, usando padrão');
        resolve(defaultResult);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Erro ao carregar logo externo:', error);
    return defaultResult;
  }
}

/**
 * Adiciona o logo ao documento PDF
 */
/**
 * Comprime uma imagem para uso em PDF
 */
function compressImageForPDF(img: HTMLImageElement, format: 'JPEG' | 'PNG'): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  // Limitar tamanho do logo para reduzir tamanho do PDF
  const maxWidth = 200;
  const maxHeight = 100;
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, width, height);

  // Usar JPEG com qualidade 0.7 para logos
  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Adiciona o logo ao documento PDF com compressão
 */
export async function addLogoToPDF(
  doc: any,
  logoUrl: string | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  try {
    const { dataUrl, format } = await loadLogoForPDF(logoUrl);
    
    const logoImg = new Image();
    logoImg.src = dataUrl;
    
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        // Comprimir imagem antes de adicionar ao PDF
        const compressedDataUrl = compressImageForPDF(logoImg, format);
        doc.addImage(compressedDataUrl, 'JPEG', x, y, width, height);
        resolve();
      };
      logoImg.onerror = () => {
        console.warn('Erro ao adicionar logo ao PDF');
        resolve();
      };
    });
  } catch (error) {
    console.error('Erro ao adicionar logo:', error);
  }
}
