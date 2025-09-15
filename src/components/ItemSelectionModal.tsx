import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Package, Settings, Wrench } from "lucide-react";
import jsPDF from "jspdf";

interface ItemSelectionModalProps {
  title: string;
  items: any[];
  type: 'pecas' | 'usinagem' | 'servicos';
  children: React.ReactNode;
}

export function ItemSelectionModal({ title, items, type, children }: ItemSelectionModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const selectedData = items.filter((_, index) => selectedItems.includes(index.toString()));
    
    // Header
    doc.setFontSize(20);
    doc.text(title, 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
    doc.text(`Total de itens selecionados: ${selectedData.length}`, 20, 55);
    
    // Content
    let yPosition = 75;
    
    selectedData.forEach((item, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(10);
      
      if (type === 'pecas') {
        doc.text(`${index + 1}. Peça: ${item.descricao || 'N/A'}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Quantidade: ${item.quantidade || 'N/A'}`, 25, yPosition);
        yPosition += 8;
        doc.text(`   Valor: R$ ${item.valor?.toFixed(2) || '0,00'}`, 25, yPosition);
      } else if (type === 'usinagem') {
        doc.text(`${index + 1}. Operação: ${item.operacao || 'N/A'}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Descrição: ${item.descricao || 'N/A'}`, 25, yPosition);
        yPosition += 8;
        doc.text(`   Tempo estimado: ${item.tempo || 'N/A'}`, 25, yPosition);
      } else if (type === 'servicos') {
        doc.text(`${index + 1}. Serviço: ${item.descricao || 'N/A'}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Responsável: ${item.responsavel || 'N/A'}`, 25, yPosition);
        yPosition += 8;
        doc.text(`   Prazo: ${item.prazo || 'N/A'}`, 25, yPosition);
      }
      
      yPosition += 15;
    });
    
    // Save the PDF
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
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
              <p className="font-medium">{item.descricao || 'Peça não especificada'}</p>
              <p className="text-sm text-muted-foreground">
                Quantidade: {item.quantidade || 'N/A'} | Valor: R$ {item.valor?.toFixed(2) || '0,00'}
              </p>
            </>
          )}
          {type === 'usinagem' && (
            <>
              <p className="font-medium">{item.operacao || 'Operação não especificada'}</p>
              <p className="text-sm text-muted-foreground">
                {item.descricao || 'Descrição não disponível'}
              </p>
              <p className="text-sm text-muted-foreground">
                Tempo estimado: {item.tempo || 'N/A'}
              </p>
            </>
          )}
          {type === 'servicos' && (
            <>
              <p className="font-medium">{item.descricao || 'Serviço não especificado'}</p>
              <p className="text-sm text-muted-foreground">
                Responsável: {item.responsavel || 'N/A'} | Prazo: {item.prazo || 'N/A'}
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
          {items.length > 0 ? (
            <>
              <div className="space-y-3">
                {items.map((item, index) => renderItem(item, index))}
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