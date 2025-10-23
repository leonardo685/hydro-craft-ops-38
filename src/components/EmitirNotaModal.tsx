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
  const [etapa, setEtapa] = useState<'dados' | 'nota_fiscal' | 'contas_receber'>('dados');
  const [numeroNF, setNumeroNF] = useState('');
  const [anexoNota, setAnexoNota] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Estados para o formulário de lançamento (igual ao DFC)
  const [prazoDias, setPrazoDias] = useState(30);
  const [parcelado, setParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [frequenciaParcelas, setFrequenciaParcelas] = useState<'mensal' | 'quinzenal'>('mensal');
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

  const handlePrazoDiasChange = (dias: string) => {
    const diasNum = parseInt(dias) || 0;
    setPrazoDias(diasNum);
    
    // Calcular nova data esperada
    const dataBase = lancamentoForm.dataEmissao;
    const novaDataEsperada = new Date(dataBase);
    novaDataEsperada.setDate(novaDataEsperada.getDate() + diasNum);
    setLancamentoForm(prev => ({ ...prev, dataEsperada: novaDataEsperada }));
  };

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
    setEtapa('nota_fiscal');
  };

  const handleConfirmarNotaFiscal = () => {
    // Validar campos obrigatórios
    if (!numeroNF.trim()) {
      toast({
        title: "Número da NF obrigatório",
        description: "Por favor, informe o número da nota fiscal",
        variant: "destructive"
      });
      return;
    }

    if (!anexoNota) {
      toast({
        title: "Arquivo obrigatório",
        description: "Por favor, anexe o PDF da nota fiscal",
        variant: "destructive"
      });
      return;
    }

    // Pré-preencher formulário com dados do orçamento
    const novaDataEsperada = new Date(Date.now() + prazoDias * 24 * 60 * 60 * 1000);
    setLancamentoForm({
      tipo: 'entrada',
      valor: orcamento.valor?.toString() || '',
      descricao: `NF ${numeroNF} - Orçamento ${orcamento.numero} - Pedido ${dadosAprovacao.numeroPedido}`,
      categoria: '',
      conta: 'conta_corrente',
      fornecedor: orcamento.cliente_nome,
      paga: false,
      dataEmissao: new Date(),
      dataEsperada: novaDataEsperada
    });
    setEtapa('contas_receber');
  };

  const handleFechar = () => {
    setEtapa('dados');
    setNumeroNF('');
    setAnexoNota(null);
    setPrazoDias(30);
    setParcelado(false);
    setNumeroParcelas(1);
    setFrequenciaParcelas('mensal');
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

    if (parcelado && numeroParcelas < 2) {
      toast({
        title: "Número de parcelas inválido",
        description: "Para faturamento parcelado, informe pelo menos 2 parcelas",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // 1. Upload do PDF
      const urlAnexo = await uploadAnexo();

      const valorTotal = parseFloat(lancamentoForm.valor);
      
      if (parcelado) {
        // Faturamento parcelado
        const valorParcela = valorTotal / numeroParcelas;
        
        // Gerar datas das parcelas
        const { gerarDatasParcelamento } = await import('@/lib/lancamento-utils');
        const datasParcelas = gerarDatasParcelamento(
          lancamentoForm.dataEsperada,
          numeroParcelas,
          frequenciaParcelas
        );

        // Criar lançamentos e contas a receber para cada parcela
        for (let i = 0; i < numeroParcelas; i++) {
          const dataVencimento = datasParcelas[i];
          const descricaoParcela = `${lancamentoForm.descricao} - Parcela ${i + 1}/${numeroParcelas}`;

          // Criar lançamento financeiro para a parcela
          const { error: lancamentoError } = await supabase
            .from('lancamentos_financeiros')
            .insert({
              tipo: lancamentoForm.tipo,
              descricao: descricaoParcela,
              categoria_id: lancamentoForm.categoria,
              valor: valorParcela,
              conta_bancaria: lancamentoForm.conta,
              data_emissao: lancamentoForm.dataEmissao.toISOString(),
              data_esperada: dataVencimento.toISOString(),
              data_realizada: null,
              pago: false,
              fornecedor_cliente: lancamentoForm.fornecedor,
              numero_parcelas: numeroParcelas,
              parcela_numero: i + 1
            });

          if (lancamentoError) {
            console.error('Erro ao criar lançamento financeiro:', lancamentoError);
            throw lancamentoError;
          }

          // Criar conta a receber para a parcela
          const { error: contaReceberError } = await supabase
            .from('contas_receber')
            .insert({
              orcamento_id: orcamento.id,
              numero_nf: `${numeroNF} - ${i + 1}/${numeroParcelas}`,
              cliente_nome: orcamento.cliente_nome,
              valor: valorParcela,
              data_emissao: lancamentoForm.dataEmissao.toISOString(),
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              forma_pagamento: lancamentoForm.conta.includes('corrente') ? 'transferencia' : 'boleto',
              observacoes: descricaoParcela,
              status: 'pendente'
            });

          if (contaReceberError) {
            console.error('Erro ao criar conta a receber:', contaReceberError);
            throw contaReceberError;
          }
        }

        toast({
          title: "Nota fiscal emitida!",
          description: `Nota fiscal ${numeroNF} emitida com ${numeroParcelas} parcelas`
        });
      } else {
        // Faturamento à vista (fluxo original)
        // 2. Criar lançamento financeiro
        const { error: lancamentoError } = await supabase
          .from('lancamentos_financeiros')
          .insert({
            tipo: lancamentoForm.tipo,
            descricao: lancamentoForm.descricao,
            categoria_id: lancamentoForm.categoria,
            valor: valorTotal,
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
            valor: valorTotal,
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

        toast({
          title: "Nota fiscal emitida!",
          description: `Nota fiscal ${numeroNF} emitida e lançamento criado com sucesso`
        });
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

      onConfirm();
      onOpenChange(false);

      // Reset
      setEtapa('dados');
      setNumeroNF('');
      setAnexoNota(null);
      setPrazoDias(30);
      setParcelado(false);
      setNumeroParcelas(1);
      setFrequenciaParcelas('mensal');
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
                Continuar
              </Button>
            </div>
          </>
        ) : etapa === 'nota_fiscal' ? (
          <>
            {/* Segunda tela - Nota Fiscal e Anexo */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Dados da Nota Fiscal</DialogTitle>
              </div>
              <DialogDescription>
                Informe o número da nota fiscal e anexe o PDF
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="numeroNF" className="text-base font-semibold">
                  Número da Nota Fiscal *
                </Label>
                <Input
                  id="numeroNF"
                  type="text"
                  placeholder="Ex: 12345"
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf" className="text-base font-semibold">
                  Anexar PDF da Nota Fiscal *
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {anexoNota && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      {anexoNota.name}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Formato: PDF • Tamanho máximo: 10MB
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Informações importantes</p>
                    <p className="text-sm text-blue-700">
                      O número da nota fiscal informado será usado na descrição do lançamento financeiro
                      e na conta a receber.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setEtapa('dados')} 
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmarNotaFiscal} 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
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

                {/* Opção de parcelamento */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="parcelado" 
                      checked={parcelado}
                      onCheckedChange={(checked) => setParcelado(checked as boolean)}
                    />
                    <Label htmlFor="parcelado" className="cursor-pointer font-semibold">
                      Faturamento Parcelado
                    </Label>
                  </div>

                  {parcelado && (
                    <>
                      <div className="grid grid-cols-2 gap-4 pl-6">
                        <div className="space-y-2">
                          <Label>Número de Parcelas</Label>
                          <Input 
                            type="number"
                            min="2"
                            max="12"
                            value={numeroParcelas}
                            onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)}
                            placeholder="Ex: 3"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequência</Label>
                          <Select value={frequenciaParcelas} onValueChange={(value: 'mensal' | 'quinzenal') => setFrequenciaParcelas(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensal">Mensal</SelectItem>
                              <SelectItem value="quinzenal">Quinzenal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2 pl-6">
                        <Label>Data da 1ª Parcela</Label>
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

                      {numeroParcelas > 1 && lancamentoForm.valor && (
                        <div className="pl-6 space-y-2">
                          <Label className="text-sm font-semibold">Previsão das Parcelas:</Label>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {(() => {
                              const { gerarDatasParcelamento } = require('@/lib/lancamento-utils');
                              const datas = gerarDatasParcelamento(
                                lancamentoForm.dataEsperada,
                                numeroParcelas,
                                frequenciaParcelas
                              );
                              const valorParcela = parseFloat(lancamentoForm.valor || '0') / numeroParcelas;
                              
                              return datas.map((data, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                                  <span className="font-medium">Parcela {index + 1}/{numeroParcelas}</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground">{format(data, "dd/MM/yyyy")}</span>
                                    <span className="font-semibold text-green-600">R$ {valorParcela.toFixed(2)}</span>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!parcelado && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prazo de Pagamento (dias)</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={prazoDias}
                        onChange={(e) => handlePrazoDiasChange(e.target.value)}
                        placeholder="Ex: 30"
                      />
                      <p className="text-xs text-muted-foreground">
                        {prazoDias} {prazoDias === 1 ? 'dia' : 'dias'} a partir da emissão
                      </p>
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
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEtapa('nota_fiscal')}>Voltar</Button>
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