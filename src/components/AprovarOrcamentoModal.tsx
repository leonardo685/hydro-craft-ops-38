import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Calculator, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { enviarWebhook } from "@/lib/webhook-utils";
import { quoteCardValues } from "@/lib/quote-card-values";

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
  const { empresaAtual } = useEmpresa();
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>('');
  
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

      // Buscar condições de pagamento do cliente
      if (orcamento.cliente_id) {
        supabase
          .from('clientes')
          .select('condicoes_pagamento')
          .eq('id', orcamento.cliente_id)
          .single()
          .then(({ data }) => {
            setCondicoesPagamento(data?.condicoes_pagamento || '');
          });
      } else {
        setCondicoesPagamento('');
      }
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
  const [maisCotacoes, setMaisCotacoes] = useState<boolean | null>(null);
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  React.useEffect(() => {
    setMaisCotacoes(null);
    setSelecionados([]);
    setPendentes([]);
    if (!open || !orcamento || !empresaAtual?.id) return;
    supabase
      .from('orcamentos')
      .select('id, numero, cliente_nome, cliente_id, equipamento, valor, descricao, ordem_servico_id, urgency_fee_enabled, urgency_fee_percentual')
      .eq('empresa_id', empresaAtual.id)
      .eq('status', 'pendente')
      .neq('id', orcamento.id)
      .order('numero', { ascending: false })
      .then(({ data }) => {
        const lista = (data || []).sort((a: any, b: any) => {
          const sa = a.cliente_id && a.cliente_id === orcamento.cliente_id ? 0 : 1;
          const sb = b.cliente_id && b.cliente_id === orcamento.cliente_id ? 0 : 1;
          return sa - sb;
        });
        setPendentes(lista);
      });
  }, [open, orcamento?.id, empresaAtual?.id]);

  const aprovarAdicional = async (orc: any, anexoUrl: string | null) => {
    const valorFinal = Number(orc.valor) || 0;
    const { data: atualizados, error } = await supabase
      .from('orcamentos')
      .update({
        status: 'aprovado',
        data_aprovacao: new Date().toISOString(),
        prazo_pagamento: formData.prazoPagamento,
        data_vencimento: formData.dataVencimento,
        numero_pedido: formData.numeroPedido,
        descricao: `${orc.descricao || ''}\n\nDetalhes da Aprovação:\n- Valor Final: $ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Prazo de Pagamento: ${formData.prazoPagamento} dias\n- Data de Vencimento: ${new Date(formData.dataVencimento).toLocaleDateString('pt-BR')}\n- Número do Pedido: ${formData.numeroPedido}${anexoUrl ? `\n- Anexo do Pedido: ${anexoUrl}` : ''}\n- Aprovado junto com o orçamento ${orcamento.numero}${formData.observacoes ? `\n- Observações: ${formData.observacoes}` : ''}`.trim()
      })
      .eq('id', orc.id)
      .eq('empresa_id', empresaAtual?.id)
      .eq('status', 'pendente')
      .select('id');
    if (error) throw error;
    if (!atualizados || atualizados.length === 0) {
      throw new Error('Orçamento não está mais pendente ou não pertence à empresa');
    }
    let ordemSnapshot: any = null;
    if (orc.ordem_servico_id) {
      const { data: osPrev } = await supabase
        .from('ordens_servico')
        .select('id, status, valor_estimado, orcamento_id, numero_ordem')
        .eq('id', orc.ordem_servico_id)
        .eq('empresa_id', empresaAtual?.id)
        .maybeSingle();
      ordemSnapshot = osPrev ?? null;
      const { error: osErr } = await supabase
        .from('ordens_servico')
        .update({ status: 'aprovada', orcamento_id: orc.id, valor_estimado: valorFinal })
        .eq('id', orc.ordem_servico_id)
        .eq('empresa_id', empresaAtual?.id);
      if (osErr) console.error('Erro ao atualizar OS do orçamento adicional:', osErr);
    }
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      await supabase.from('acoes_reversiveis').insert({
        empresa_id: empresaAtual?.id ?? null,
        user_id: u?.id ?? null,
        user_email: u?.email ?? null,
        tipo: 'orcamento_aprovado',
        descricao: `Aprovou orçamento ${orc.numero}${orc.cliente_nome ? ` (${orc.cliente_nome})` : ''} no mesmo P.O. de ${orcamento.numero}`,
        entidade_principal_tipo: 'orcamento',
        entidade_principal_id: orc.id,
        estado_anterior: {
          orcamento: { status: 'pendente', data_aprovacao: null, valor: orc.valor ?? null, prazo_pagamento: null, data_vencimento: null, numero_pedido: null, descricao: orc.descricao ?? null },
          ordem_servico: ordemSnapshot,
        },
        estado_novo: {
          orcamento: { status: 'aprovado', numero_pedido: formData.numeroPedido },
          ordem_servico: ordemSnapshot ? { id: ordemSnapshot.id, status: 'aprovada' } : null,
        },
      });
    } catch (histErr) {
      console.warn('Falha ao registrar ação reversível:', histErr);
    }
    await enviarWebhook(empresaAtual?.id || null, {
      tipo: 'orcamento_aprovado',
      numero: orc.numero,
      cliente: orc.cliente_nome,
      valor: `$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      numeroPedido: formData.numeroPedido,
      data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
      ordem_servico_aprovada: !!orc.ordem_servico_id,
      numero_ordem: null,
      empresa: empresaAtual?.nome || 'N/A'
    });
  };

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

      // Snapshot do estado anterior do orçamento (para histórico/desfazer)
      const orcamentoSnapshot = {
        status: orcamento.status,
        data_aprovacao: orcamento.data_aprovacao ?? null,
        valor: orcamento.valor ?? null,
        prazo_pagamento: orcamento.prazo_pagamento ?? null,
        data_vencimento: orcamento.data_vencimento ?? null,
        numero_pedido: orcamento.numero_pedido ?? null,
        descricao: orcamento.descricao ?? null,
      };

      // Snapshot da OS vinculada (antes de atualizar)
      let ordemSnapshot: any = null;
      if (orcamento.ordem_servico_id) {
        const { data: osPrev } = await supabase
          .from('ordens_servico')
          .select('id, status, valor_estimado, orcamento_id, numero_ordem')
          .eq('id', orcamento.ordem_servico_id)
          .maybeSingle();
        if (osPrev) ordemSnapshot = osPrev;
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
          numero_pedido: formData.numeroPedido,
          descricao: `${orcamento.descricao || ''}\n\nDetalhes da Aprovação:\n- Valor Original: $ ${formData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Desconto: ${formData.descontoPercentual}%\n- Valor Final: $ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Prazo de Pagamento: ${formData.prazoPagamento} dias\n- Data de Vencimento: ${new Date(formData.dataVencimento).toLocaleDateString('pt-BR')}\n- Número do Pedido: ${formData.numeroPedido}${anexoUrl ? `\n- Anexo do Pedido: ${anexoUrl}` : ''}${formData.observacoes ? `\n- Observações: ${formData.observacoes}` : ''}`.trim()
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

      // Registrar ação reversível (histórico para admin desfazer)
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const u = userRes?.user;
        let userNome: string | null = null;
        if (u?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', u.id)
            .maybeSingle();
          userNome = profile?.nome ?? null;
        }
        await supabase.from('acoes_reversiveis').insert({
          empresa_id: empresaAtual?.id ?? null,
          user_id: u?.id ?? null,
          user_nome: userNome,
          user_email: u?.email ?? null,
          tipo: 'orcamento_aprovado',
          descricao: `Aprovou orçamento ${orcamento.numero}${orcamento.cliente_nome ? ` (${orcamento.cliente_nome})` : ''}`,
          entidade_principal_tipo: 'orcamento',
          entidade_principal_id: orcamento.id,
          estado_anterior: {
            orcamento: orcamentoSnapshot,
            ordem_servico: ordemSnapshot,
          },
          estado_novo: {
            orcamento: { status: 'aprovado', numero_pedido: formData.numeroPedido },
            ordem_servico: ordemSnapshot ? { id: ordemSnapshot.id, status: 'aprovada' } : null,
          },
        });
      } catch (histErr) {
        console.warn('Falha ao registrar ação reversível:', histErr);
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

      // Enviar notificação via webhook centralizado
      const payload = {
        tipo: 'orcamento_aprovado',
        numero: orcamento.numero,
        cliente: orcamento.cliente_nome,
        valor: `$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        numeroPedido: formData.numeroPedido,
        data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
        ordem_servico_aprovada: orcamento.ordem_servico_id ? true : false,
        numero_ordem: ordemServicoNumero,
        empresa: empresaAtual?.nome || 'N/A'
      };

      const notificacaoEnviada = await enviarWebhook(empresaAtual?.id || null, payload);

      if (!notificacaoEnviada) {
        toast({
          title: "Aviso",
          description: "Orçamento aprovado, mas notificação não foi enviada após 3 tentativas.",
          variant: "destructive"
        });
      }

      // Se houver ordem de serviço vinculada, enviar webhook separado
      if (orcamento.ordem_servico_id && ordemServicoNumero) {
        console.log('📤 Enviando webhook para aprovadores de ordem de serviço...');
        
        const payloadOrdem = {
          tipo: 'ordem_aprovada',
          numero_ordem: ordemServicoNumero,
          cliente: orcamento.cliente_nome,
          equipamento: tipoEquipamento || orcamento.equipamento || 'Equipamento não especificado',
          valor: `$ ${formData.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
          orcamento_numero: orcamento.numero,
          empresa: empresaAtual?.nome || 'N/A'
        };

        await enviarWebhook(empresaAtual?.id || null, payloadOrdem);
      }

      let extrasOk = 0;
      if (maisCotacoes) {
        for (const id of selecionados) {
          const orc = pendentes.find((p) => p.id === id);
          if (!orc) continue;
          try {
            await aprovarAdicional(orc, anexoUrl);
            extrasOk++;
          } catch (e) {
            console.error('Erro ao aprovar orçamento adicional:', e);
            toast({ title: "Aviso", description: `Não foi possível aprovar o orçamento ${orc.numero}`, variant: "destructive" });
          }
        }
      }

      toast({
        title: "Sucesso",
        description: extrasOk > 0
          ? `${extrasOk + 1} orçamentos aprovados no P.O. ${formData.numeroPedido}`
          : "Orçamento aprovado com sucesso!"
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

  // Display urgency using the same rule as the cards; persist only the discounted
  // base so the existing cards and PDF do not apply the fee a second time.
  const originalTotals = quoteCardValues({ ...orcamento, valor: formData.valor }, empresaAtual?.nome);
  const finalTotals = quoteCardValues({ ...orcamento, valor: formData.valorComDesconto }, empresaAtual?.nome);

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
              <Label htmlFor="valor">Valor do Orçamento ($)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={originalTotals.value}
                readOnly
                disabled
                className="bg-muted"
              />
              {originalTotals.urgencyFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Urgência ({Number(orcamento.urgency_fee_percentual)}%): $ {originalTotals.urgencyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
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
            <Label htmlFor="valorFinal">Valor Final ($)</Label>
            <Input
              id="valorFinal"
              type="number"
              step="0.01"
              value={finalTotals.value}
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
            <Label>Condições de Pagamento do Cliente</Label>
            {condicoesPagamento ? (
              <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {condicoesPagamento}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1 italic">
                Nenhuma condição cadastrada para este cliente. Edite no Cadastro de Clientes.
              </p>
            )}
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

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium text-sm">Este P.O. inclui mais cotações?</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={maisCotacoes === true ? "default" : "outline"} onClick={() => setMaisCotacoes(true)}>Sim</Button>
                <Button type="button" size="sm" variant={maisCotacoes === false ? "default" : "outline"} onClick={() => { setMaisCotacoes(false); setSelecionados([]); }}>Não</Button>
              </div>
              {maisCotacoes && (
                pendentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma outra cotação aguardando aprovação.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1 border rounded-md p-2">
                    {pendentes.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selecionados.includes(p.id)}
                          onChange={(e) => setSelecionados((prev) => e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id))}
                        />
                        <span className="font-medium">{p.numero}</span>
                        <span className="text-muted-foreground truncate flex-1">{p.cliente_nome} · {p.equipamento}</span>
                        <span>$ {quoteCardValues(p, empresaAtual?.nome).value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </label>
                    ))}
                  </div>
                )
              )}
              {maisCotacoes && selecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selecionados.length} cotação(ões) serão aprovadas com o mesmo P.O., prazo e anexo, cada uma com seu próprio valor.
                </p>
              )}
            </CardContent>
          </Card>

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