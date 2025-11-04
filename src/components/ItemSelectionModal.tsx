import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Package, Settings, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import mecHidroLogo from "@/assets/mec-hidro-logo-novo.jpg";

interface ItemSelectionModalProps {
  title: string;
  items: any[];
  type: 'pecas' | 'usinagem' | 'servicos';
  children: React.ReactNode;
  ordemId: string;
}

export function ItemSelectionModal({ title, items, type, children, ordemId }: ItemSelectionModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [realItems, setRealItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ordemData, setOrdemData] = useState<any>(null);

  useEffect(() => {
    if (open && ordemId) {
      loadRealData();
    }
  }, [open, ordemId, type]);

  const loadRealData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', ordemId)
        .single();

      if (error) throw error;
      
      // Armazenar dados da ordem para usar no PDF
      setOrdemData(data);
      
      let fieldData: any[] = [];
      if (type === 'pecas' && data.pecas_necessarias) {
        fieldData = Array.isArray(data.pecas_necessarias) ? data.pecas_necessarias : [];
      } else if (type === 'usinagem' && data.usinagem_necessaria) {
        fieldData = Array.isArray(data.usinagem_necessaria) ? data.usinagem_necessaria : [];
      } else if (type === 'servicos' && data.servicos_necessarios) {
        fieldData = Array.isArray(data.servicos_necessarios) ? data.servicos_necessarios : [];
      }
      
      setRealItems(fieldData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setRealItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const generatePDF = async () => {
    const EMPRESA_INFO = {
      nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
      cnpj: "03.328.334/0001-87",
      telefone: "(19) 3026-6227",
      email: "contato@mechidro.com.br"
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 10;

    const selectedData = realItems.filter((_, index) => selectedItems.includes(index.toString()));

    // Função para adicionar detalhes decorativos (triângulos vermelhos e pretos)
    const adicionarDetalheDecorativo = () => {
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 30, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
      doc.setFillColor(0, 0, 0);
      doc.triangle(pageWidth - 15, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
    };

    // Função para adicionar rodapé
    const adicionarRodape = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        adicionarDetalheDecorativo();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
      }
    };

    // Adicionar logo MEC-HIDRO
    try {
      const logoImg = new Image();
      logoImg.src = mecHidroLogo;
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          doc.addImage(logoImg, 'JPEG', pageWidth - 50, 8, 35, 20);
          resolve();
        };
        logoImg.onerror = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao adicionar logo:', error);
    }

    // Cabeçalho com informações da empresa
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
    doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
    doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
    
    // Linha separadora vermelha
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
    
    // Triângulo decorativo vermelho no canto superior direito
    doc.setFillColor(220, 38, 38);
    doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
    
    yPosition = 48;
    
    // Título em vermelho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPosition = 65;

    // Informações da Ordem
    if (ordemData) {
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Informações da Ordem de Serviço", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Primeira linha: Nº Ordem + Data
      const colWidth = (pageWidth - 40) / 2;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      doc.text(`Nº Ordem: ${ordemData.numero_ordem || 'N/A'}`, 22, yPosition + 5.5);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 22 + colWidth, yPosition + 5.5);
      yPosition += 8;

      yPosition += 10;
    }

    // Título da seção de itens
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
    doc.text(`${title.toUpperCase()} SELECIONADOS`, pageWidth / 2, yPosition + 7, { align: 'center' });
    yPosition += 15;

    // Conteúdo dos itens
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    selectedData.forEach((item, index) => {
      if (yPosition > pageHeight - 40) {
        adicionarRodape();
        doc.addPage();
        yPosition = 30;
      }
      
      // Box para cada item
      const boxHeight = type === 'pecas' ? 25 : 20;
      
      doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
      doc.rect(20, yPosition, pageWidth - 40, boxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, boxHeight);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, 25, yPosition + 7);
      
      if (type === 'pecas') {
        doc.text(`Peça: ${item.peca || item.descricao || 'N/A'}`, 35, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantidade: ${item.quantidade || 'N/A'}`, 35, yPosition + 14);
        doc.text(`Valor: R$ ${item.valor?.toFixed(2) || '0,00'}`, 35, yPosition + 21);
      } else if (type === 'usinagem') {
        doc.text(`Operação: ${item.trabalho || item.operacao || item.descricao || 'N/A'}`, 35, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantidade: ${item.quantidade || 'N/A'}`, 35, yPosition + 14);
      } else if (type === 'servicos') {
        doc.text(`Serviço: ${item.servico || item.descricao || 'N/A'}`, 35, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantidade: ${item.quantidade || 'N/A'}`, 35, yPosition + 14);
      }
      
      yPosition += boxHeight + 5;
    });

    // Adicionar rodapé em todas as páginas
    adicionarRodape();
    
    // Save the PDF
    const tipoNome = type === 'pecas' ? 'pecas' : type === 'usinagem' ? 'usinagem' : 'servicos';
    const numeroOrdem = ordemData?.numero_ordem || 'ordem';
    doc.save(`${numeroOrdem}_${tipoNome}_${new Date().getTime()}.pdf`);
    setOpen(false);
  };

  const getIcon = () => {
    switch (type) {
      case 'pecas':
        return <Package className="h-4 w-4" />;
      case 'usinagem':
        return <Settings className="h-4 w-4" />;
      case 'servicos':
        return <Wrench className="h-4 w-4" />;
    }
  };

  const renderItem = (item: any, index: number) => {
    const itemId = index.toString();
    
    return (
      <div key={itemId} className="flex items-start space-x-3 p-3 border rounded-lg">
        <Checkbox
          id={itemId}
          checked={selectedItems.includes(itemId)}
          onCheckedChange={() => handleItemToggle(itemId)}
        />
        <div className="flex-1 space-y-1">
          {type === 'pecas' && (
            <>
              <p className="font-medium">{item.peca || item.descricao || 'Peça não especificada'}</p>
              <p className="text-sm text-muted-foreground">
                Quantidade: {item.quantidade || 'N/A'} | Valor: R$ {item.valor?.toFixed(2) || '0,00'}
              </p>
            </>
          )}
          {type === 'usinagem' && (
            <>
              <p className="font-medium">{item.trabalho || item.operacao || item.descricao || 'Operação não especificada'}</p>
              <p className="text-sm text-muted-foreground">
                Quantidade: {item.quantidade || 'N/A'}
              </p>
            </>
          )}
          {type === 'servicos' && (
            <>
              <p className="font-medium">{item.servico || item.descricao || 'Serviço não especificado'}</p>
              <p className="text-sm text-muted-foreground">
                Quantidade: {item.quantidade || 'N/A'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : realItems.length > 0 ? (
            <>
              <div className="space-y-3">
                {realItems.map((item, index) => renderItem(item, index))}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedItems.length} item(s) selecionado(s)
                </p>
                <Button 
                  onClick={generatePDF}
                  disabled={selectedItems.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Gerar PDF
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                {getIcon()}
                <h3 className="text-lg font-medium text-foreground mb-2 mt-4">
                  Nenhum item encontrado
                </h3>
                <p className="text-muted-foreground">
                  Não há {type} cadastradas para esta ordem de serviço.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}