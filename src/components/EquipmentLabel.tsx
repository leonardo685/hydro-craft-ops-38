import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import QRCode from "qrcode";

interface EquipmentLabelProps {
  equipment: {
    numeroOrdem: string;
    cliente: string;
    dataEntrada: string;
  };
  onClose: () => void;
}

export function EquipmentLabel({ equipment, onClose }: EquipmentLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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
                width: 300px;
                height: 120px;
                border: 2px solid #000;
                display: flex;
                align-items: center;
                padding: 10px;
                box-sizing: border-box;
                background: white;
              }
              .content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
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
                <div class="logo">MEC-HIDRO</div>
                <div class="order">OS ${equipment.numeroOrdem}</div>
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

    canvas.width = 300;
    canvas.height = 120;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borda
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Texto MEC-HIDRO
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('MEC-HIDRO', 15, 35);

    // Número da ordem
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`OS ${equipment.numeroOrdem}`, 15, 70);

    // QR Code
    if (qrDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 200, 20, 80, 80);
        
        // Download
        const link = document.createElement('a');
        link.download = `etiqueta-${equipment.numeroOrdem}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = qrDataUrl;
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
          <div className="border-2 border-border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between h-20">
              <div className="flex flex-col justify-center">
                <div className="text-red-600 font-bold text-sm mb-1">MEC-HIDRO</div>
                <div className="text-xl font-bold text-foreground">OS {equipment.numeroOrdem}</div>
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
          <div className="flex gap-2 pt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}