import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, FileText, Calendar, User, FileImage, X, AlertCircle, DollarSign, CreditCard, Eye, Download } from "lucide-react";

interface EmitirNotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onConfirm: () => void;
}

export default function EmitirNotaModal({
  open,
  onOpenChange,
  orcamento,
  onConfirm
}: EmitirNotaModalProps) {
  const [etapa, setEtapa] = useState<'dados' | 'anexo' | 'contas_receber'>('dados');
  const [numeroNF, setNumeroNF] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const numero = Math.floor(Math.random() * 90000) + 10000;
    return numero.toString();
  });
  const [anexoNota, setAnexoNota] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Estados para contas a receber
  const [prazoPagamento, setPrazoPagamento] = useState(30);
  const [dataVencimento, setDataVencimento] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('boleto');
  const [observacoesReceber, setObservacoesReceber] = useState('');

  // Extrair dados da aprovação
  const extrairDadosAprovacao = (descricao: string) => {
    console.log('Descrição completa:', descricao);
    const numeroPedidoMatch = descricao?.match(/[-\s]*Número do Pedido:\s*([^\n]+)/);
    const prazoPagamentoMatch = descricao?.match(/[-\s]*Prazo de Pagamento:\s*([^\n]+)/);
    const anexoMatch = descricao?.match(/[-\s]*Anexo do Pedido:\s*([^\n]+)/);
    
    console.log('Anexo extraído:', anexoMatch?.[1]?.trim());
    
    return {
      numeroPedido: numeroPedidoMatch?.[1]?.trim() || 'N/A',
      prazoPagamento: prazoPagamentoMatch?.[1]?.trim() || 'A definir',
      anexoUrl: anexoMatch?.[1]?.trim() || null
    };
  };

  const dadosAprovacao = orcamento ? extrairDadosAprovacao(orcamento.descricao || '') : { numeroPedido: 'N/A', prazoPagamento: 'A definir', anexoUrl: null };
  
  console.log('URL do anexo final:', dadosAprovacao.anexoUrl);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione apenas arquivos PDF",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive"
        });
        return;
      }
      setAnexoNota(file);
    }
  };

  const uploadAnexo = async (): Promise<string | null> => {
    if (!anexoNota || !orcamento) return null;
    try {
      const fileExt = anexoNota.name.split('.').pop();
      const fileName = `nota-fiscal-${orcamento.numero}-${Date.now()}.${fileExt}`;
      const filePath = `notas-fiscais/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('documentos').upload(filePath, anexoNota);
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('documentos').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };

  const copiarParaAreaTransferencia = async () => {
    const texto = `I - NF referente ao orçamento ${orcamento.numero}.
II - NF referente ao pedido ${dadosAprovacao.numeroPedido}.
III - Faturamento ${dadosAprovacao.prazoPagamento}.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Texto copiado para área de transferência"
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Erro ao copiar para área de transferência",
        variant: "destructive"
      });
    }
  };

  const handleVisualizarPedido = async () => {
    if (dadosAprovacao.anexoUrl) {
      try {
        // Tentar fazer download direto do arquivo
        const response = await fetch(dadosAprovacao.anexoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedido-${orcamento.numero}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download iniciado",
          description: "O PDF do pedido está sendo baixado"
        });
      } catch (error) {
        console.error('Erro ao baixar PDF:', error);
        // Fallback: tentar abrir em nova aba
        window.open(dadosAprovacao.anexoUrl, '_blank');
      }
    }
  };

  const handleConfirmarDados = () => {
    setEtapa('anexo');
  };

  const handleAnexarPDF = async () => {
    if (!anexoNota) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo PDF",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      const urlAnexo = await uploadAnexo();

      // Atualizar orçamento no Supabase
      const {
        error
      } = await supabase.from('orcamentos').update({
        status: 'finalizado',
        numero_nf: numeroNF,
        pdf_nota_fiscal: urlAnexo
      }).eq('id', orcamento.id);
      if (error) {
        console.error('Erro ao atualizar orçamento:', error);
        throw error;
      }
      toast({
        title: "Nota fiscal emitida!",
        description: `Nota fiscal ${numeroNF} emitida com sucesso`
      });
      
      // Go to accounts receivable step
      setEtapa('contas_receber');
    } catch (error) {
      console.error('Erro ao emitir nota fiscal:', error);
      toast({
        title: "Erro",
        description: "Erro ao emitir nota fiscal",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFechar = () => {
    setEtapa('dados');
    setAnexoNota(null);
    onOpenChange(false);
  };

  const handlePrazoPagamentoChange = (dias: string) => {
    const diasNum = parseInt(dias) || 0;
    setPrazoPagamento(diasNum);
    
    // Calcular nova data de vencimento
    const hoje = new Date();
    const novaDataVencimento = new Date(hoje);
    novaDataVencimento.setDate(novaDataVencimento.getDate() + diasNum);
    setDataVencimento(novaDataVencimento.toISOString().split('T')[0]);
  };

  const handleFinalizarContasReceber = async () => {
    try {
      const dataEmissaoAtual = new Date(); // Data de emissão é hoje
      
      // Salvar lançamento em contas a receber
      const { error } = await supabase
        .from('contas_receber')
        .insert({
          orcamento_id: orcamento.id,
          numero_nf: numeroNF,
          cliente_nome: orcamento.cliente_nome,
          valor: orcamento.valor,
          data_emissao: dataEmissaoAtual.toISOString(),
          data_vencimento: dataVencimento,
          forma_pagamento: formaPagamento,
          observacoes: observacoesReceber,
          status: 'pendente'
        });
      
      if (error) {
        console.error('Erro ao criar lançamento em contas a receber:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar lançamento em contas a receber",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Lançamento criado!",
        description: "Lançamento em contas a receber criado com sucesso"
      });
      
      onConfirm();
      onOpenChange(false);
      
      // Reset
      setEtapa('dados');
      setAnexoNota(null);
      setDataVencimento(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setFormaPagamento('boleto');
      setObservacoesReceber('');
    } catch (error) {
      console.error('Erro ao finalizar lançamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar lançamento",
        variant: "destructive"
      });
    }
  };

  if (!orcamento) return null;

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const textoNota = `I - NF referente ao orçamento ${orcamento.numero}.
II - NF referente ao pedido ${dadosAprovacao.numeroPedido}.
III - Faturamento ${dadosAprovacao.prazoPagamento}.`;

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-lg">
        {etapa === 'dados' ? (
          <>
            {/* Primeira tela - Dados da Nota */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Emitir Nota de Faturamento</DialogTitle>
              </div>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 p-0 h-6 w-6" onClick={handleFechar}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informações principais */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Entrada</p>
                    <p className="font-semibold">{formatarData(orcamento.data_criacao)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{orcamento.cliente_nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Nº do Pedido</p>
                    <p className="font-semibold">{dadosAprovacao.numeroPedido}</p>
                  </div>
                  {dadosAprovacao.anexoUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleVisualizarPedido}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Pedido (PDF)
                    </Button>
                  )}
                </div>
              </div>

              {/* Texto da nota */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Texto da Nota de Faturamento:</Label>
                <Textarea value={textoNota} readOnly className="min-h-[120px] border-2 border-red-200 bg-red-50/30 resize-none" />
                
                <Button variant="outline" onClick={copiarParaAreaTransferencia} className="w-full flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar para Área de Transferência"}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={handleFechar} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirmarDados} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Confirmar Emissão
              </Button>
            </div>
          </>
        ) : etapa === 'anexo' ? (
          <>
            {/* Segunda tela - Anexar PDF */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Anexar Nota de Faturamento</DialogTitle>
              </div>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 p-0 h-6 w-6" onClick={handleFechar}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Aviso */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Faça upload do PDF da nota de Faturamento</p>
                  <p className="text-sm text-yellow-700">Arquivo deve ser PDF, máximo 10MB</p>
                </div>
              </div>

              {/* Seleção de arquivo */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecione o arquivo PDF</Label>
                <div className="border-2 border-red-200 border-dashed rounded-lg p-6">
                  <Input type="file" accept=".pdf" onChange={handleFileChange} className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                  {anexoNota ? (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ {anexoNota.name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nenhum arquivo escolhido
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={() => setEtapa('dados')} className="flex-1" disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleAnexarPDF} className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={uploading || !anexoNota}>
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Anexando...
                  </>
                ) : (
                  "Anexar PDF"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Terceira tela - Contas a Receber */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Lançamento em Contas a Receber</DialogTitle>
              </div>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 p-0 h-6 w-6" onClick={handleFechar}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informações da nota */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-800">Nota fiscal emitida com sucesso!</p>
                </div>
                <p className="text-sm text-green-700">NF: {numeroNF} - {orcamento.cliente_nome}</p>
              </div>

              {/* Dados do lançamento */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valor</Label>
                  <Input 
                    value={`R$ ${orcamento.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`} 
                    readOnly 
                    className="bg-muted/50 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prazo de Pagamento (dias)</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={prazoPagamento}
                    onChange={(e) => handlePrazoPagamentoChange(e.target.value)}
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    {prazoPagamento} {prazoPagamento === 1 ? 'dia' : 'dias'} a partir da emissão
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data de Vencimento</Label>
                  <Input 
                    type="date" 
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Forma de Pagamento</Label>
                  <select 
                    className="w-full p-3 border border-input rounded-md bg-background font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                  >
                    <option value="boleto">Boleto Bancário</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Observações</Label>
                  <Textarea 
                    placeholder="Observações adicionais sobre o recebimento..."
                    className="min-h-[100px] resize-none"
                    value={observacoesReceber}
                    onChange={(e) => setObservacoesReceber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={() => setEtapa('anexo')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleFinalizarContasReceber} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                <CreditCard className="h-4 w-4 mr-2" />
                Finalizar Lançamento
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}