import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AprovarOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onConfirm: () => void;
}

export const AprovarOrcamentoModal = ({ 
  open, 
  onOpenChange, 
  orcamento, 
  onConfirm 
}: AprovarOrcamentoModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    valor: orcamento?.valor || 0,
    prazoPagamento: '',
    descontoPercentual: 0,
    valorComDesconto: orcamento?.valor || 0,
    numeroPedido: '',
    observacoes: ''
  });
  const [anexoPedido, setAnexoPedido] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const calcularValorComDesconto = (valor: number, desconto: number) => {
    return valor - (valor * desconto / 100);
  };

  const handleDescontoChange = (desconto: string) => {
    const descontoNum = parseFloat(desconto) || 0;
    const valorComDesconto = calcularValorComDesconto(formData.valor, descontoNum);
    
    setFormData(prev => ({
      ...prev,
      descontoPercentual: descontoNum,
      valorComDesconto
    }));
  };

  const handleValorChange = (valor: string) => {
    const valorNum = parseFloat(valor) || 0;
    const valorComDesconto = calcularValorComDesconto(valorNum, formData.descontoPercentual);
    
    setFormData(prev => ({
      ...prev,
      valor: valorNum,
      valorComDesconto
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Apenas arquivos PDF são permitidos",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. Máximo 10MB",
          variant: "destructive"
        });
        return;
      }
      setAnexoPedido(file);
    }
  };

  const uploadAnexo = async (): Promise<string | null> => {
    if (!anexoPedido) return null;

    try {
      const fileName = `pedidos/${Date.now()}_${anexoPedido.name}`;
      
      const { data, error } = await supabase.storage
        .from('equipamentos')
        .upload(fileName, anexoPedido);

      if (error) {
        console.error('Erro ao fazer upload:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return null;
    }
  };

  const handleConfirmar = async () => {
    if (!formData.prazoPagamento || !formData.numeroPedido) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let anexoUrl = null;
      if (anexoPedido) {
        anexoUrl = await uploadAnexo();
        if (!anexoUrl) {
          toast({
            title: "Erro",
            description: "Erro ao fazer upload do anexo",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // Atualizar orçamento com os dados da aprovação
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
          valor: formData.valorComDesconto,
          descricao: `${orcamento.descricao || ''}\n\nDetalhes da Aprovação:\n- Valor Original: R$ ${formData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Desconto: ${formData.descontoPercentual}%\n- Valor Final: R$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Prazo de Pagamento: ${formData.prazoPagamento}\n- Número do Pedido: ${formData.numeroPedido}${anexoUrl ? `\n- Anexo do Pedido: ${anexoUrl}` : ''}${formData.observacoes ? `\n- Observações: ${formData.observacoes}` : ''}`.trim()
        })
        .eq('id', orcamento.id);

      if (error) {
        console.error('Erro ao aprovar orçamento:', error);
        toast({
          title: "Erro",
          description: "Erro ao aprovar orçamento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Orçamento aprovado com sucesso!"
      });
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      toast({
        title: "Erro", 
        description: "Erro ao aprovar orçamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!orcamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Aprovar Orçamento - {orcamento.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Dados do Orçamento</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{orcamento.cliente_nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Equipamento:</span>
                  <p className="font-medium">{orcamento.equipamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor Original (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => handleValorChange(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="desconto">Desconto (%)</Label>
              <Input
                id="desconto"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.descontoPercentual}
                onChange={(e) => handleDescontoChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valorFinal">Valor Final (R$)</Label>
              <Input
                id="valorFinal"
                type="number"
                step="0.01"
                value={formData.valorComDesconto}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="prazoPagamento">Prazo de Pagamento *</Label>
              <Input
                id="prazoPagamento"
                value={formData.prazoPagamento}
                onChange={(e) => setFormData(prev => ({ ...prev, prazoPagamento: e.target.value }))}
                placeholder="Ex: 30 dias"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="numeroPedido">Número do Pedido *</Label>
            <Input
              id="numeroPedido"
              value={formData.numeroPedido}
              onChange={(e) => setFormData(prev => ({ ...prev, numeroPedido: e.target.value }))}
              placeholder="Ex: PED-2024-001"
            />
          </div>

          <div>
            <Label htmlFor="anexo">Anexo do Pedido (PDF)</Label>
            <div className="mt-1">
              <input
                type="file"
                id="anexo"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="anexo"
                className="flex items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
              >
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {anexoPedido ? anexoPedido.name : 'Clique para selecionar PDF'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={3}
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre a aprovação..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Aprovando...' : 'Aprovar Orçamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};