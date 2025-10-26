import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, FileText, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { format, parse, isValid } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist';

interface TransacaoExtrato {
  id: string;
  data: Date;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoria?: string;
  contaBancaria?: string;
  fornecedorCliente?: string;
  selecionada: boolean;
}

interface UploadExtratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  categorias: any[];
  contasBancarias: any[];
  fornecedores: any[];
  clientes: any[];
}

export function UploadExtratoModal({
  open,
  onOpenChange,
  onImportComplete,
  categorias,
  contasBancarias,
  fornecedores,
  clientes
}: UploadExtratoModalProps) {
  const [etapa, setEtapa] = useState<'upload' | 'categorizar' | 'confirmacao'>('upload');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<TransacaoExtrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande", {
        description: "O arquivo deve ter no máximo 10MB"
      });
      return;
    }

    // Validar formato
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'pdf'].includes(ext || '')) {
      toast.error("Formato inválido", {
        description: "Por favor, envie um arquivo XLSX, XLS ou PDF"
      });
      return;
    }

    setArquivo(file);
  };

  const parseDate = (dateStr: any): Date => {
    if (!dateStr) return new Date();
    
    // Se já é um Date
    if (dateStr instanceof Date) return dateStr;
    
    // Tenta vários formatos comuns
    const formats = [
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'yyyy-MM-dd',
      'dd/MM/yy',
      'dd-MM-yy'
    ];
    
    for (const formatStr of formats) {
      try {
        const parsed = parse(String(dateStr).trim(), formatStr, new Date());
        if (isValid(parsed)) return parsed;
      } catch (e) {
        continue;
      }
    }
    
    // Tenta parsing nativo
    const native = new Date(dateStr);
    if (isValid(native)) return native;
    
    return new Date();
  };

  const parsePDF = (file: File): Promise<TransacaoExtrato[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Configurar o worker do PDF.js com versão fixa
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
          
          // Carregar o PDF
          const loadingTask = pdfjsLib.getDocument(arrayBuffer);
          const pdf = await loadingTask.promise;
          
          let fullText = '';
          
          // Extrair texto de todas as páginas
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          
          console.log('📄 Texto extraído do PDF (primeiras 500 chars):', fullText.substring(0, 500));
          
          // Processar o texto linha por linha
          const linhas = fullText.split('\n');
          const transacoes: TransacaoExtrato[] = [];
          
          // Palavras-chave para ignorar linhas de cabeçalho/totais
          const ignorarPalavras = [
            'saldo anterior',
            'saldo atual',
            'total',
            'extrato',
            'data',
            'histórico',
            'documento',
            'valor',
            'conta corrente',
            'agência',
            'página'
          ];
          
          linhas.forEach((linha, index) => {
            // Limpar e normalizar a linha
            const linhaNormalizada = linha.trim().toLowerCase();
            
            // Ignorar linhas vazias ou muito curtas
            if (linhaNormalizada.length < 10) return;
            
            // Ignorar linhas que contêm palavras-chave
            if (ignorarPalavras.some(palavra => linhaNormalizada.includes(palavra))) {
              return;
            }
            
            // Padrão específico para Sicredi e outros bancos:
            // Formato: DD/MM/YYYY seguido de texto e depois valores numéricos
            // Captura: data, descrição (tudo entre a data e os valores), e valores
            const match = linha.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s*([-]?[\d.]+,\d{2})?$/);
            
            if (match) {
              const [, dataStr, descricao, valor1Str, valor2Str] = match;
              
              // Converte valores brasileiros (1.234,56) para float
              const converterValor = (str: string): number => {
                if (!str) return 0;
                // Remove pontos de milhar e substitui vírgula por ponto
                return parseFloat(str.replace(/\./g, '').replace(',', '.'));
              };
              
              const valor1 = converterValor(valor1Str);
              const valor2 = valor2Str ? converterValor(valor2Str) : 0;
              
              // O primeiro valor geralmente é a movimentação, o segundo é o saldo
              // Se tem sinal negativo, é saída
              const valorMovimentacao = valor1;
              const isNegativo = valor1Str.includes('-');
              
              // Parse da data
              const data = parseDate(dataStr);
              
              // Limpar descrição
              const descricaoLimpa = descricao.trim()
                .replace(/\s+/g, ' ')  // Remove espaços múltiplos
                .substring(0, 200);     // Limita tamanho
              
              if (!isNaN(valorMovimentacao) && Math.abs(valorMovimentacao) > 0 && descricaoLimpa.length > 3) {
                const transacao: TransacaoExtrato = {
                  id: `temp_${Date.now()}_${index}`,
                  data,
                  descricao: descricaoLimpa,
                  valor: Math.abs(valorMovimentacao),
                  tipo: isNegativo ? 'saida' : 'entrada',
                  selecionada: true
                };
                
                transacoes.push(transacao);
                console.log(`✅ Transação ${transacoes.length}:`, {
                  data: dataStr,
                  desc: descricaoLimpa.substring(0, 50),
                  valor: valorMovimentacao,
                  tipo: isNegativo ? 'saída' : 'entrada'
                });
              }
            }
          });
          
          console.log(`📊 Total de transações encontradas: ${transacoes.length}`);
          
          if (transacoes.length === 0) {
            console.error('❌ Nenhuma transação detectada. Primeiras 10 linhas do PDF:', linhas.slice(0, 10));
            throw new Error(
              "Nenhuma transação encontrada no PDF.\n\n" +
              "Formatos suportados:\n" +
              "• Sicredi: DD/MM/YYYY Descrição Valor Saldo\n" +
              "• Outros bancos com formato similar\n\n" +
              "Verifique se o PDF contém dados de transações."
            );
          }
          
          resolve(transacoes);
        } catch (error) {
          console.error('❌ Erro ao processar PDF:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseXLSX = (file: File): Promise<TransacaoExtrato[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          if (!jsonData || jsonData.length === 0) {
            throw new Error("Planilha vazia ou sem dados válidos");
          }

          const transacoes = jsonData.map((row: any, index) => {
            // Busca por colunas de data (case insensitive)
            const dataKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('data') || k.toLowerCase().includes('date')
            );
            
            // Busca por colunas de descrição
            const descricaoKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('descri') || k.toLowerCase().includes('description') || 
              k.toLowerCase().includes('histor')
            );
            
            // Busca por colunas de valor
            const valorKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('valor') || k.toLowerCase().includes('value') || 
              k.toLowerCase().includes('montante') || k.toLowerCase().includes('amount')
            );

            const valorStr = valorKey ? String(row[valorKey]) : '0';
            const valorNum = parseFloat(valorStr.replace(/[^\d,-]/g, '').replace(',', '.'));
            
            return {
              id: `temp_${index}`,
              data: dataKey ? parseDate(row[dataKey]) : new Date(),
              descricao: descricaoKey ? String(row[descricaoKey]) : `Transação ${index + 1}`,
              valor: Math.abs(valorNum || 0),
              tipo: valorNum >= 0 ? 'entrada' : 'saida' as 'entrada' | 'saida',
              selecionada: true
            };
          }).filter(t => t.valor > 0); // Remove transações com valor 0
          
          resolve(transacoes);
        } catch (error) {
          console.error('Erro ao processar XLSX:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsBinaryString(file);
    });
  };

  const processar = async () => {
    if (!arquivo) return;
    
    setLoading(true);
    try {
      const ext = arquivo.name.split('.').pop()?.toLowerCase();
      
      let transacoesParsed: TransacaoExtrato[] = [];
      
      if (ext === 'pdf') {
        transacoesParsed = await parsePDF(arquivo);
      } else {
        transacoesParsed = await parseXLSX(arquivo);
      }
      
      setTransacoes(transacoesParsed);
      setEtapa('categorizar');
      toast.success("Extrato processado", {
        description: `${transacoesParsed.length} transações encontradas`
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo", {
        description: "Verifique se o arquivo está no formato correto"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelecao = (id: string) => {
    setTransacoes(prev => prev.map(t => 
      t.id === id ? { ...t, selecionada: !t.selecionada } : t
    ));
  };

  const toggleTodas = () => {
    const todasSelecionadas = transacoes.every(t => t.selecionada);
    setTransacoes(prev => prev.map(t => ({ ...t, selecionada: !todasSelecionadas })));
  };

  const atualizarTransacao = (id: string, campo: keyof TransacaoExtrato, valor: any) => {
    setTransacoes(prev => prev.map(t => 
      t.id === id ? { ...t, [campo]: valor } : t
    ));
  };

  const importarTransacoes = async () => {
    const selecionadas = transacoes.filter(t => t.selecionada);
    
    // Validar
    const invalidas = selecionadas.filter(t => !t.categoria || !t.contaBancaria);
    if (invalidas.length > 0) {
      toast.error("Categorização incompleta", {
        description: "Todas as transações selecionadas devem ter categoria e conta bancária"
      });
      return;
    }

    setProcessando(true);
    try {
      const lancamentos = selecionadas.map(t => ({
        tipo: t.tipo,
        descricao: t.descricao,
        valor: t.valor,
        data_emissao: new Date().toISOString(),
        data_esperada: t.data.toISOString(),
        data_realizada: t.data.toISOString(),
        pago: true,
        categoria_id: t.categoria,
        conta_bancaria: t.contaBancaria,
        fornecedor_cliente: t.fornecedorCliente || null,
        forma_pagamento: 'a_vista'
      }));

      const { error } = await supabase
        .from('lancamentos_financeiros')
        .insert(lancamentos);

      if (error) throw error;

      toast.success("Extrato importado", {
        description: `${selecionadas.length} transações adicionadas com sucesso`
      });

      // Reset e fechar
      setEtapa('upload');
      setArquivo(null);
      setTransacoes([]);
      onImportComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar transações");
    } finally {
      setProcessando(false);
    }
  };

  const resetar = () => {
    setEtapa('upload');
    setArquivo(null);
    setTransacoes([]);
  };

  const fornecedoresClientes = [...fornecedores, ...clientes];
  const selecionadas = transacoes.filter(t => t.selecionada);
  const totalEntradas = selecionadas.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = selecionadas.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Lançamento por Extrato</DialogTitle>
          <DialogDescription>
            Importe transações de arquivos XLSX ou PDF e categorize-as
          </DialogDescription>
        </DialogHeader>

        {etapa === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="flex gap-4 text-muted-foreground">
              <FileSpreadsheet className="h-16 w-16" />
              <FileText className="h-16 w-16" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Selecione o arquivo do extrato</h3>
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: XLSX, XLS ou PDF (máx. 10MB)
              </p>
            </div>

            <div className="w-full max-w-md">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-8 hover:border-primary transition-colors text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">
                    {arquivo ? arquivo.name : 'Clique para selecionar ou arraste o arquivo'}
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {arquivo && (
              <div className="flex gap-2">
                <Button onClick={processar} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Processar Extrato
                </Button>
                <Button variant="outline" onClick={() => setArquivo(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {etapa === 'categorizar' && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Categorize as transações antes de importar</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetar}>
                  Voltar
                </Button>
                <Button size="sm" onClick={importarTransacoes} disabled={processando || selecionadas.length === 0}>
                  {processando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar {selecionadas.length} Transações
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={transacoes.length > 0 && transacoes.every(t => t.selecionada)}
                          onCheckedChange={toggleTodas}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="min-w-[200px]">Categoria</TableHead>
                      <TableHead className="min-w-[180px]">Conta Bancária</TableHead>
                      <TableHead className="min-w-[180px]">Fornecedor/Cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoes.map(transacao => (
                      <TableRow key={transacao.id}>
                        <TableCell>
                          <Checkbox 
                            checked={transacao.selecionada}
                            onCheckedChange={() => toggleSelecao(transacao.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(transacao.data, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transacao.descricao}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transacao.tipo === 'entrada' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {transacao.valor.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={transacao.categoria} 
                            onValueChange={(val) => atualizarTransacao(transacao.id, 'categoria', val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categorias
                                .filter(c => c.tipo === 'filha' && c.classificacao === transacao.tipo)
                                .map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.codigo} - {cat.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={transacao.contaBancaria} 
                            onValueChange={(val) => atualizarTransacao(transacao.id, 'contaBancaria', val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {contasBancarias.map(conta => (
                                <SelectItem key={conta.id} value={conta.id}>
                                  {conta.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={transacao.fornecedorCliente} 
                            onValueChange={(val) => atualizarTransacao(transacao.id, 'fornecedorCliente', val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Opcional..." />
                            </SelectTrigger>
                            <SelectContent>
                              {fornecedoresClientes.map(fc => (
                                <SelectItem key={fc.id} value={fc.id}>
                                  {fc.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{selecionadas.length}</span> transações selecionadas
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Entradas:</span>
                  <span className="font-medium text-green-600">R$ {totalEntradas.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Saídas:</span>
                  <span className="font-medium text-red-600">R$ {totalSaidas.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
