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
import { format } from "date-fns";

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
    prazoPagamento: 30,
    dataVencimento: '',
    descontoPercentual: 0,
    valorComDesconto: orcamento?.valor || 0,
    numeroPedido: '',
    observacoes: ''
  });

  // Update form data when orcamento changes
  React.useEffect(() => {
    if (orcamento) {
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      
      setFormData({
        valor: orcamento.valor || 0,
        prazoPagamento: 30,
        dataVencimento: dataVencimento.toISOString().split('T')[0],
        descontoPercentual: 0,
        valorComDesconto: orcamento.valor || 0,
        numeroPedido: '',
        observacoes: ''
      });
    }
  }, [orcamento]);

  // Atualizar data de vencimento quando prazo mudar
  const handlePrazoPagamentoChange = (dias: string) => {
    const diasNum = parseInt(dias) || 0;
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + diasNum);
    
    setFormData(prev => ({
      ...prev,
      prazoPagamento: diasNum,
      dataVencimento: dataVencimento.toISOString().split('T')[0]
    }));
  };
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
    if (!formData.prazoPagamento || !formData.numeroPedido || !formData.dataVencimento) {
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
          prazo_pagamento: formData.prazoPagamento,
          data_vencimento: formData.dataVencimento,
          descricao: `${orcamento.descricao || ''}\n\nDetalhes da Aprovação:\n- Valor Original: R$ ${formData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Desconto: ${formData.descontoPercentual}%\n- Valor Final: R$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Prazo de Pagamento: ${formData.prazoPagamento} dias\n- Data de Vencimento: ${new Date(formData.dataVencimento).toLocaleDateString('pt-BR')}\n- Número do Pedido: ${formData.numeroPedido}${anexoUrl ? `\n- Anexo do Pedido: ${anexoUrl}` : ''}${formData.observacoes ? `\n- Observações: ${formData.observacoes}` : ''}`.trim()
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

      // Atualizar ordem de serviço vinculada se houver
      if (orcamento.ordem_servico_id) {
        const { error: errorOrdem } = await supabase
          .from('ordens_servico')
          .update({
            status: 'aprovada',
            orcamento_id: orcamento.id,
            valor_estimado: formData.valorComDesconto
          })
          .eq('id', orcamento.ordem_servico_id);

        if (errorOrdem) {
          console.error('Erro ao atualizar ordem de serviço:', errorOrdem);
          toast({
            title: "Aviso",
            description: "Orçamento aprovado, mas houve erro ao atualizar a ordem de serviço vinculada",
            variant: "destructive"
          });
        } else {
          console.log('✅ Ordem de serviço atualizada para aprovada:', orcamento.ordem_servico_id);
        }
      }

      // Buscar dados da ordem de serviço vinculada se houver
      let ordemServicoNumero = null;
      let tipoEquipamento = null;
      if (orcamento.ordem_servico_id) {
        const { data: ordemData } = await supabase
          .from('ordens_servico')
          .select(`
            numero_ordem,
            equipamento,
            recebimento_id,
            recebimentos (
              numero_ordem,
              tipo_equipamento
            )
          `)
          .eq('id', orcamento.ordem_servico_id)
          .single();
        
        if (ordemData) {
          ordemServicoNumero = ordemData.recebimentos?.numero_ordem || ordemData.numero_ordem;
          tipoEquipamento = ordemData.equipamento || ordemData.recebimentos?.tipo_equipamento;
        }
      }

      // Enviar notificação para o n8n/Telegram com retry
      const maxTentativas = 3;
      const intervaloRetry = 2000; // 2 segundos
      let notificacaoEnviada = false;

      const payload = {
        tipo: 'orcamento_aprovado',
        numero: orcamento.numero,
        cliente: orcamento.cliente_nome,
        valor: `R$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        numeroPedido: formData.numeroPedido,
        data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
        // Dados da ordem de serviço vinculada
        ordem_servico_aprovada: orcamento.ordem_servico_id ? true : false,
        numero_ordem: ordemServicoNumero
      };

      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          console.log(`📤 Tentativa ${tentativa}/${maxTentativas} de envio da notificação...`);
          
          const webhookResponse = await fetch('https://primary-production-dc42.up.railway.app/webhook/f2cabfd9-4e4c-4dd0-802a-b27c4b0c9d17', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          if (webhookResponse.ok) {
            notificacaoEnviada = true;
            console.log('✅ Notificação de orçamento enviada com sucesso na tentativa', tentativa);
            break;
          } else {
            console.error(`❌ Tentativa ${tentativa} falhou com status:`, webhookResponse.status);
            if (tentativa < maxTentativas) {
              console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, intervaloRetry));
            }
          }
        } catch (webhookError) {
          console.error(`❌ Erro na tentativa ${tentativa}:`, webhookError);
          if (tentativa < maxTentativas) {
            console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, intervaloRetry));
          }
        }
      }

      if (!notificacaoEnviada) {
        toast({
          title: "Aviso",
          description: `Orçamento aprovado, mas notificação não foi enviada após ${maxTentativas} tentativas.`,
          variant: "destructive"
        });
      }

      // Se houver ordem de serviço vinculada, enviar webhook separado para aprovadores de OS
      if (orcamento.ordem_servico_id && ordemServicoNumero) {
        console.log('📤 Enviando webhook para aprovadores de ordem de serviço...');
        
        const payloadOrdem = {
          tipo: 'ordem_aprovada',
          numero_ordem: ordemServicoNumero,
          cliente: orcamento.cliente_nome,
          equipamento: tipoEquipamento || orcamento.equipamento || 'Equipamento não especificado',
          valor: `R$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
          orcamento_numero: orcamento.numero
        };

        try {
          const responseOrdem = await fetch('https://primary-production-dc42.up.railway.app/webhook/f2cabfd9-4e4c-4dd0-802a-b27c4b0c9d17', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadOrdem)
          });

          if (responseOrdem.ok) {
            console.log('✅ Webhook de ordem de serviço enviado com sucesso');
          } else {
            console.error('❌ Falha ao enviar webhook de ordem de serviço:', responseOrdem.status);
          }
        } catch (error) {
          console.error('❌ Erro ao enviar webhook de ordem de serviço:', error);
        }
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
            <Label htmlFor="prazoPagamento">Prazo de Pagamento (dias) *</Label>
            <Input
              id="prazoPagamento"
              type="number"
              min="1"
              value={formData.prazoPagamento}
              onChange={(e) => handlePrazoPagamentoChange(e.target.value)}
              placeholder="Ex: 30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.prazoPagamento} {formData.prazoPagamento === 1 ? 'dia' : 'dias'} a partir da aprovação
            </p>
          </div>

          <div>
            <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
            <Input
              id="dataVencimento"
              type="date"
              value={formData.dataVencimento}
              onChange={(e) => setFormData(prev => ({ ...prev, dataVencimento: e.target.value }))}
            />
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