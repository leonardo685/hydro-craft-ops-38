import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, FileText, Calendar as CalendarIcon, User, FileImage, X, AlertCircle, DollarSign, Check, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { Checkbox } from "@/components/ui/checkbox";

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
  const { getCategoriasForSelect } = useCategoriasFinanceiras();
  const [etapa, setEtapa] = useState<'dados' | 'contas_receber'>('dados');
  const [numeroNF, setNumeroNF] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const numero = Math.floor(Math.random() * 90000) + 10000;
    return numero.toString();
  });
  const [anexoNota, setAnexoNota] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Estados para o formulário de lançamento (igual ao DFC)
  const [lancamentoForm, setLancamentoForm] = useState({
    tipo: 'entrada' as const,
    valor: '',
    descricao: '',
    categoria: '',
    conta: 'conta_corrente',
    fornecedor: '',
    paga: false,
    dataEmissao: new Date(),
    dataEsperada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

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
    // Pré-preencher formulário com dados do orçamento
    setLancamentoForm({
      tipo: 'entrada',
      valor: orcamento.valor?.toString() || '',
      descricao: `NF ${numeroNF} - Orçamento ${orcamento.numero}`,
      categoria: '',
      conta: 'conta_corrente',
      fornecedor: orcamento.cliente_nome,
      paga: false,
      dataEmissao: new Date(),
      dataEsperada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    setEtapa('contas_receber');
  };

  const handleFechar = () => {
    setEtapa('dados');
    setAnexoNota(null);
    setLancamentoForm({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria: '',
      conta: 'conta_corrente',
      fornecedor: '',
      paga: false,
      dataEmissao: new Date(),
      dataEsperada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    onOpenChange(false);
  };

  const handleFinalizarLancamento = async () => {
    // Validar campos obrigatórios
    if (!lancamentoForm.valor || !lancamentoForm.descricao || !lancamentoForm.categoria) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!anexoNota) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo PDF da nota fiscal",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // 1. Upload do PDF
      const urlAnexo = await uploadAnexo();

      // 2. Criar lançamento financeiro
      const { error: lancamentoError } = await supabase
        .from('lancamentos_financeiros')
        .insert({
          tipo: lancamentoForm.tipo,
          descricao: lancamentoForm.descricao,
          categoria_id: lancamentoForm.categoria,
          valor: parseFloat(lancamentoForm.valor),
          conta_bancaria: lancamentoForm.conta,
          data_emissao: lancamentoForm.dataEmissao.toISOString(),
          data_esperada: lancamentoForm.dataEsperada.toISOString(),
          data_realizada: null,
          pago: false,
          fornecedor_cliente: lancamentoForm.fornecedor
        });

      if (lancamentoError) {
        console.error('Erro ao criar lançamento financeiro:', lancamentoError);
        throw lancamentoError;
      }

      // 3. Criar conta a receber
      const { error: contaReceberError } = await supabase
        .from('contas_receber')
        .insert({
          orcamento_id: orcamento.id,
          numero_nf: numeroNF,
          cliente_nome: orcamento.cliente_nome,
          valor: parseFloat(lancamentoForm.valor),
          data_emissao: lancamentoForm.dataEmissao.toISOString(),
          data_vencimento: lancamentoForm.dataEsperada.toISOString().split('T')[0],
          forma_pagamento: lancamentoForm.conta.includes('corrente') ? 'transferencia' : 'boleto',
          observacoes: lancamentoForm.descricao,
          status: 'pendente'
        });

      if (contaReceberError) {
        console.error('Erro ao criar conta a receber:', contaReceberError);
        throw contaReceberError;
      }

      // 4. Atualizar orçamento com nota fiscal
      const { error: orcamentoError } = await supabase
        .from('orcamentos')
        .update({
          status: 'finalizado',
          numero_nf: numeroNF,
          pdf_nota_fiscal: urlAnexo
        })
        .eq('id', orcamento.id);

      if (orcamentoError) {
        console.error('Erro ao atualizar orçamento:', orcamentoError);
        throw orcamentoError;
      }

      toast({
        title: "Nota fiscal emitida!",
        description: `Nota fiscal ${numeroNF} emitida e lançamento criado com sucesso`
      });

      onConfirm();
      onOpenChange(false);

      // Reset
      setEtapa('dados');
      setAnexoNota(null);
      setLancamentoForm({
        tipo: 'entrada',
        valor: '',
        descricao: '',
        categoria: '',
        conta: 'conta_corrente',
        fornecedor: '',
        paga: false,
        dataEmissao: new Date(),
        dataEsperada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast({
        title: "Erro",
        description: "Erro ao emitir nota fiscal e criar lançamento",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (!orcamento) return null;

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const textoNota = `I - NF referente ao orçamento ${orcamento.numero}.
II - NF referente ao pedido ${dadosAprovacao.numeroPedido}.
III - Faturamento ${dadosAprovacao.prazoPagamento}.`;

  const contasBancarias = [
    { id: 'conta_corrente', nome: 'Conta Corrente - Banco do Brasil' },
    { id: 'conta_poupanca', nome: 'Poupança - Banco do Brasil' },
    { id: 'conta_itau', nome: 'Conta Corrente - Itaú' },
    { id: 'conta_caixa', nome: 'Conta Corrente - Caixa' }
  ];

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
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
                Criar Lançamento Financeiro
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Segunda tela - Formulário de Lançamento (igual ao DFC) */}
            <div className={cn(
              "h-4 w-full transition-colors duration-300",
              lancamentoForm.tipo === 'entrada' ? "bg-green-500" : "bg-red-500"
            )} />
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>Novo Lançamento</DialogTitle>
                <DialogDescription>Adicione um novo lançamento ao extrato bancário</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Lançamento</Label>
                    <Input value="Entrada" readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={lancamentoForm.valor}
                      onChange={(e) => setLancamentoForm(prev => ({ ...prev, valor: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Emissão</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataEmissao && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {lancamentoForm.dataEmissao ? format(lancamentoForm.dataEmissao, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={lancamentoForm.dataEmissao}
                        onSelect={(date) => date && setLancamentoForm(prev => ({ ...prev, dataEmissao: date }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição do lançamento"
                    value={lancamentoForm.descricao}
                    onChange={(e) => setLancamentoForm(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={lancamentoForm.categoria} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, categoria: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoriasForSelect().map(categoria => (
                          <SelectItem key={categoria.value} value={categoria.value}>
                            {categoria.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta Bancária</Label>
                    <Select value={lancamentoForm.conta} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, conta: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map(conta => (
                          <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor/Cliente</Label>
                  <Input
                    value={lancamentoForm.fornecedor}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Esperada</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataEsperada && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {lancamentoForm.dataEsperada ? format(lancamentoForm.dataEsperada, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={lancamentoForm.dataEsperada}
                        onSelect={(date) => date && setLancamentoForm(prev => ({ ...prev, dataEsperada: date }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Anexar PDF */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Anexar PDF da Nota Fiscal</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    <Input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileChange} 
                      className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                    />
                    {anexoNota ? (
                      <p className="text-sm text-green-600 mt-2 font-medium flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {anexoNota.name}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        Nenhum arquivo escolhido
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEtapa('dados')}>Voltar</Button>
                <Button 
                  onClick={handleFinalizarLancamento} 
                  disabled={uploading}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    "Finalizar Lançamento"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}