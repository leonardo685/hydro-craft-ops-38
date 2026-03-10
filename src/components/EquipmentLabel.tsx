import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileCode, Send } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { DxfWriter, point3d } from "@tarikjabiri/dxf";
import engrenagemLogo from "@/assets/engrenagem-logo.jpg";

interface EquipmentLabelProps {
  equipment: {
    numeroOrdem: string;
    cliente: string;
    dataEntrada: string;
  };
  onClose: () => void;
}

/** URL do webhook n8n para envio de gravação laser (configurável via .env) */
const GRAVACAO_WEBHOOK_URL = import.meta.env.VITE_N8N_GRAVACAO_WEBHOOK_URL || '';

export function EquipmentLabel({ equipment, onClose }: EquipmentLabelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [sendingToLaser, setSendingToLaser] = useState(false);

  useEffect(() => {
    const generateQRCode = async () => {
      const baseUrl = window.location.origin;
      const qrData = `${baseUrl}/ordem/${equipment.numeroOrdem}`;
      
      try {
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    };

    generateQRCode();
  }, [equipment]);

  useEffect(() => {
    const img = new Image();
    img.src = engrenagemLogo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoDataUrl(canvas.toDataURL());
      }
    };
  }, []);

  // ─── Gerar PNG como Blob (reutiliza lógica do handleDownload) ───
  const generatePNGBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      canvas.width = 302;
      canvas.height = 113;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      const logoImg = new Image();
      logoImg.src = engrenagemLogo;
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 10, 25, 30, 30);

        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('MEC HYDRO', 50, 40);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(equipment.numeroOrdem, 50, 70);

        if (qrDataUrl) {
          const qrImg = new Image();
          qrImg.onload = () => {
            ctx.drawImage(qrImg, 200, 20, 80, 80);
            canvas.toBlob((blob) => resolve(blob), 'image/png');
          };
          qrImg.src = qrDataUrl;
        } else {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        }
      };
    });
  };

  // ─── Gerar DXF como Blob (reutiliza lógica do handleDownloadDXF) ───
  const generateDXFBlob = async (): Promise<Blob | null> => {
    try {
      const dxf = new DxfWriter();
      const width = 80;
      const height = 30;

      dxf.addLine(point3d(0, 0), point3d(width, 0));
      dxf.addLine(point3d(width, 0), point3d(width, height));
      dxf.addLine(point3d(width, height), point3d(0, height));
      dxf.addLine(point3d(0, height), point3d(0, 0));

      dxf.addText(point3d(5, 20), 4, "MEC HYDRO");
      dxf.addText(point3d(5, 10), 6, equipment.numeroOrdem);

      await addQRCodeToDXF(dxf, width - 22, 3, 20);

      const dxfContent = dxf.stringify();
      return new Blob([dxfContent], { type: 'application/dxf' });
    } catch (error) {
      console.error('Erro ao gerar DXF:', error);
      return null;
    }
  };

  // ─── Enviar arquivos para gravação laser via webhook ───
  const handleSendToLaser = async () => {
    if (!GRAVACAO_WEBHOOK_URL) {
      toast.error('URL do webhook de gravação não configurada (VITE_N8N_GRAVACAO_WEBHOOK_URL)');
      return;
    }

    setSendingToLaser(true);
    try {
      // Gerar ambos os arquivos em paralelo
      const [pngBlob, dxfBlob] = await Promise.all([
        generatePNGBlob(),
        generateDXFBlob(),
      ]);

      if (!pngBlob) {
        toast.error('Erro ao gerar arquivo PNG da etiqueta');
        return;
      }
      if (!dxfBlob) {
        toast.error('Erro ao gerar arquivo DXF da etiqueta');
        return;
      }

      // Montar FormData com os arquivos e número da ordem
      const formData = new FormData();
      formData.append('orderNumber', equipment.numeroOrdem);
      formData.append('pngFile', pngBlob, `etiqueta-${equipment.numeroOrdem}.png`);
      formData.append('dxfFile', dxfBlob, `etiqueta-${equipment.numeroOrdem}.dxf`);

      // POST para o webhook n8n
      const response = await fetch(GRAVACAO_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Etiqueta enviada para gravação com sucesso!');
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar para gravação:', error);
      toast.error('Erro ao enviar para gravação: ' + (error.message || 'Falha na requisição'));
    } finally {
      setSendingToLaser(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta - ${equipment.numeroOrdem}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                background: white;
              }
              .label {
                width: 302px;
                height: 113px;
                border: 2px solid #000;
                display: flex;
                align-items: center;
                padding: 8px;
                box-sizing: border-box;
                background: white;
              }
              .content {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .logo-img {
                width: 32px;
                height: 32px;
                margin-right: 8px;
              }
              .header {
                display: flex;
                align-items: center;
              }
              .text-content {
                display: flex;
                flex-direction: column;
              }
              .logo {
                font-weight: bold;
                font-size: 16px;
                color: #dc2626;
                margin-bottom: 5px;
              }
              .order {
                font-size: 24px;
                font-weight: bold;
                color: #000;
              }
              .qr-container {
                margin-left: 10px;
              }
              .qr-code {
                width: 80px;
                height: 80px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .label { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="content">
                <div class="header">
                  <img src="${logoDataUrl}" alt="Logo" class="logo-img" />
                  <div class="text-content">
                    <div class="logo">MEC HYDRO</div>
                    <div class="order">${equipment.numeroOrdem}</div>
                  </div>
                </div>
              </div>
              <div class="qr-container">
                <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 302;
    canvas.height = 113;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    const logoImg = new Image();
    logoImg.src = engrenagemLogo;
    logoImg.onload = () => {
      ctx.drawImage(logoImg, 10, 25, 30, 30);
      
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('MEC HYDRO', 50, 40);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(equipment.numeroOrdem, 50, 70);
      
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 200, 20, 80, 80);
          
          const link = document.createElement('a');
          link.download = `etiqueta-${equipment.numeroOrdem}.png`;
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImg.src = qrDataUrl;
      }
    };
  };

  const handleDownloadDXF = async () => {
    const dxf = new DxfWriter();
    
    const width = 80;
    const height = 30;
    
    dxf.addLine(point3d(0, 0), point3d(width, 0));
    dxf.addLine(point3d(width, 0), point3d(width, height));
    dxf.addLine(point3d(width, height), point3d(0, height));
    dxf.addLine(point3d(0, height), point3d(0, 0));
    
    dxf.addText(point3d(5, 20), 4, "MEC HYDRO");
    dxf.addText(point3d(5, 10), 6, equipment.numeroOrdem);
    
    await addQRCodeToDXF(dxf, width - 22, 3, 20);
    
    const dxfContent = dxf.stringify();
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `etiqueta-${equipment.numeroOrdem}.dxf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const addQRCodeToDXF = async (
    dxf: DxfWriter,
    startX: number, 
    startY: number, 
    size: number
  ) => {
    const baseUrl = window.location.origin;
    const qrData = `${baseUrl}/ordem/${equipment.numeroOrdem}`;
    
    const qr = QRCode.create(qrData, { errorCorrectionLevel: 'M' });
    const modules = qr.modules.data;
    const moduleCount = qr.modules.size;
    const moduleSize = size / moduleCount;
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const index = row * moduleCount + col;
        if (modules[index]) {
          const x = startX + col * moduleSize;
          const y = startY + (moduleCount - row - 1) * moduleSize;
          
          dxf.addLine(point3d(x, y), point3d(x + moduleSize, y));
          dxf.addLine(point3d(x + moduleSize, y), point3d(x + moduleSize, y + moduleSize));
          dxf.addLine(point3d(x + moduleSize, y + moduleSize), point3d(x, y + moduleSize));
          dxf.addLine(point3d(x, y + moduleSize), point3d(x, y));
        }
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta do Equipamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview da etiqueta */}
          <div className="border-2 border-border rounded-lg p-4 bg-background">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-2">
                <img src={engrenagemLogo} alt="Logo" className="w-10 h-10" />
                <div className="flex flex-col justify-center">
                  <div className="text-red-600 font-bold text-sm mb-1">MEC HYDRO</div>
                  <div className="text-xl font-bold text-foreground">{equipment.numeroOrdem}</div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {qrDataUrl && (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code" 
                    className="w-16 h-16"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Informações do equipamento */}
          <div className="space-y-2 text-sm">
            <div><strong>Cliente:</strong> {equipment.cliente}</div>
            <div><strong>Data de Entrada:</strong> {equipment.dataEntrada}</div>
            <div><strong>Status:</strong> Aguardando Análise</div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button onClick={handleDownloadDXF} variant="outline" className="flex-1">
              <FileCode className="h-4 w-4 mr-2" />
              DXF
            </Button>
            <Button
              onClick={handleSendToLaser}
              variant="outline"
              className="flex-1"
              disabled={sendingToLaser || !GRAVACAO_WEBHOOK_URL}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingToLaser ? 'Enviando...' : 'Enviar para Gravação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
