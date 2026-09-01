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
import { format, parse, isValid, addDays, subDays } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEmpresa } from '@/contexts/EmpresaContext';

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
  duplicata?: {
    status: 'possivel' | 'confirmada';
    origem: 'lancamentos' | 'contas_receber' | 'ambos';
    registros: any[];
  };
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
  const { empresaAtual } = useEmpresa();
  const [etapa, setEtapa] = useState<'upload' | 'categorizar' | 'confirmacao'>('upload');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<TransacaoExtrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');

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
    if (!['xlsx', 'xls', 'pdf', 'csv'].includes(ext || '')) {
      toast.error("Formato inválido", {
        description: "Por favor, envie um arquivo XLSX, XLS, CSV ou PDF"
      });
      return;
    }

    setArquivo(file);
  };

  // Verificar duplicatas nas transações
  const verificarDuplicatas = async (transacoes: TransacaoExtrato[]) => {
    console.log('🔍 Iniciando verificação de duplicatas...');
    
    for (const t of transacoes) {
      try {
        const registrosDuplicados: any[] = [];
        
        // Calcular range de datas (±3 dias)
        const dataMin = subDays(t.data, 3).toISOString();
        const dataMax = addDays(t.data, 3).toISOString();
        
        // Buscar em lancamentos_financeiros
        const { data: lancs, error: errorLancs } = await supabase
          .from('lancamentos_financeiros')
          .select('*')
          .eq('tipo', t.tipo)
          .gte('data_esperada', dataMin)
          .lte('data_esperada', dataMax)
          .gte('valor', t.valor - 0.5)
          .lte('valor', t.valor + 0.5);

        if (errorLancs) {
          console.error('Erro ao buscar lançamentos:', errorLancs);
        } else if (lancs && lancs.length > 0) {
          registrosDuplicados.push(...lancs.map(l => ({ ...l, _origem: 'lancamentos' })));
        }

        // Buscar em contas_receber (só para entradas)
        if (t.tipo === 'entrada') {
          const { data: contas, error: errorContas } = await supabase
            .from('contas_receber')
            .select('*')
            .gte('data_vencimento', dataMin.split('T')[0])
            .lte('data_vencimento', dataMax.split('T')[0])
            .gte('valor', t.valor - 0.5)
            .lte('valor', t.valor + 0.5);
            
          if (errorContas) {
            console.error('Erro ao buscar contas a receber:', errorContas);
          } else if (contas && contas.length > 0) {
            registrosDuplicados.push(...contas.map(c => ({ ...c, _origem: 'contas_receber' })));
          }
        }

        // Marcar como duplicata se encontrou registros
        if (registrosDuplicados.length > 0) {
          // Verificar se é duplicata confirmada (mesmo valor exato e data exata)
          const duplicataExata = registrosDuplicados.some(r => {
            const dataRegistro = new Date(r.data_esperada || r.data_vencimento);
            const diferençaDias = Math.abs((dataRegistro.getTime() - t.data.getTime()) / (1000 * 60 * 60 * 24));
            const valorExato = Math.abs(r.valor - t.valor) < 0.01;
            return diferençaDias <= 1 && valorExato;
          });

          const origens = [...new Set(registrosDuplicados.map(r => r._origem))];
          
          t.duplicata = {
            status: duplicataExata ? 'confirmada' : 'possivel',
            origem: origens.length > 1 ? 'ambos' : origens[0] as any,
            registros: registrosDuplicados
          };

          // Desmarcar duplicatas confirmadas automaticamente
          if (duplicataExata) {
            t.selecionada = false;
          }
          
          console.log(`${duplicataExata ? '🔴' : '🟡'} Duplicata ${duplicataExata ? 'confirmada' : 'possível'} encontrada:`, {
            transacao: `${format(t.data, 'dd/MM/yyyy')} - ${t.descricao} - R$ ${t.valor.toFixed(2)}`,
            registros: registrosDuplicados.length,
            status: t.duplicata.status
          });
        }
      } catch (error) {
        console.error('Erro ao verificar duplicata:', error);
      }
    }
    
    console.log('✅ Verificação de duplicatas concluída');
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
      'dd-MM-yy',
      'dd/MM'  // Formato curto sem ano - assume ano atual
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

  // Função auxiliar para converter valores brasileiros
  const converterValorBR = (str: string): number => {
    if (!str) return 0;
    // Remove tudo exceto dígitos, vírgula, ponto e sinal negativo
    const cleaned = str.replace(/[^\d,.-]/g, '').trim();
    // Converte formato BR (1.234,56) para float
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  };

  // Detecta o banco pelo nome do arquivo ou conteúdo
  const detectarBanco = (texto: string, nomeArquivo: string): string => {
    const textoLower = texto.toLowerCase();
    const nomeLower = nomeArquivo.toLowerCase();
    
    if (nomeLower.includes('c6') || textoLower.includes('c6 bank') || textoLower.includes('banco c6')) {
      return 'C6 Bank';
    }
    if (nomeLower.includes('sicredi') || textoLower.includes('sicredi')) {
      return 'Sicredi';
    }
    if (nomeLower.includes('itau') || textoLower.includes('itaú') || textoLower.includes('itau')) {
      return 'Itaú';
    }
    if (nomeLower.includes('nubank') || textoLower.includes('nubank') || textoLower.includes('roxinho')) {
      return 'Nubank';
    }
    if (nomeLower.includes('bradesco') || textoLower.includes('bradesco')) {
      return 'Bradesco';
    }
    if (nomeLower.includes('santander') || textoLower.includes('santander')) {
      return 'Santander';
    }
    if (nomeLower.includes('caixa') || textoLower.includes('caixa econômica')) {
      return 'Caixa';
    }
    if (nomeLower.includes('bb') || nomeLower.includes('banco do brasil') || textoLower.includes('banco do brasil')) {
      return 'Banco do Brasil';
    }
    
    return 'Genérico';
  };

  // Parser genérico que tenta múltiplos padrões
  const parseGenerico = (fullText: string, nomeArquivo: string): TransacaoExtrato[] => {
    const transacoes: TransacaoExtrato[] = [];
    let transacaoIndex = 0;
    
    console.log('🔍 Tentando parser genérico multi-formato...');
    
    // Lista de regex para diferentes formatos de banco
    const patterns = [
      // Formato 1: C6 Bank Tabela Robusto (DD/MM formato curto sem pipes)
      {
        nome: 'C6 Bank Tabela',
        regex: /(\d{2}\/\d{2})\s+\d{2}\/\d{2}\s+(Outros gastos|Entrada PIX|Saída PIX|TED|DOC|Tarifa|Débito|Crédito|[A-Za-zÀ-ÿ\s]+?)\s+(C6TAG|PIX|TED|DOC|[A-ZÀ-Ÿ][^\d-]*?)\s+(-R\$\s*[\d.]+,\d{2}|R\$\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, tipo: 2, descricao: 3, valor: 4 }
      },
      // Formato 2: C6 Bank Simplificado (backup - apenas data curta + texto + valor)
      {
        nome: 'C6 Bank Simplificado',
        regex: /(\d{2}\/\d{2})\s+\d{2}\/\d{2}\s+.+?\s+(C6TAG [A-Z]+|[A-ZÀ-Ÿ][^-R$]+?)\s+(-R\$\s*[\d.]+,\d{2}|R\$\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      },
      // Formato 3: Itaú/DD-MM (logo após C6 pois também usa formato curto)
      {
        nome: 'Itaú/DD-MM',
        regex: /(\d{2}\/\d{2})\s+([^\d\n]+?)\s+([-]?[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      },
      // Formato 4: Sicredi/tradicional - Data Descrição Valor Saldo
      {
        nome: 'Sicredi/Tradicional',
        regex: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z][\s\S]+?)\s+([-]?[\d.]+,\d{2})\s+([-]?[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3, saldo: 4 }
      },
      // Formato 5: C6 Bank ano completo - Data Descrição -R$ Valor ou R$ Valor
      {
        nome: 'C6 Bank Ano Completo',
        regex: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?R?\$?\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      },
      // Formato 6: Nubank/App - Data Descrição Valor (sem R$)
      {
        nome: 'Nubank/Simples',
        regex: /(\d{2}\/\d{2}\/\d{4})\s+([^\d\n]+?)\s+([-+]?\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      },
      // Formato 7: Data com hífen - DD-MM-YYYY
      {
        nome: 'Data com hífen',
        regex: /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([-]?R?\$?\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      },
      // Formato 8: Mais genérico - qualquer data seguida de texto e valor
      {
        nome: 'Genérico amplo',
        regex: /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.{5,}?)\s+([-+]?R?\$?\s*[\d.]+,\d{2})/g,
        grupos: { data: 1, descricao: 2, valor: 3 }
      }
    ];
    
    // Tenta cada padrão
    for (const pattern of patterns) {
      console.log(`🔍 Testando padrão: ${pattern.nome}`);
      const regex = new RegExp(pattern.regex.source, 'g');
      let match;
      let countThisPattern = 0;
      
      while ((match = regex.exec(fullText)) !== null) {
        const dataStr = match[pattern.grupos.data];
        const descricaoBruta = match[pattern.grupos.descricao];
        const valorStr = match[pattern.grupos.valor];
        const tipoStr = pattern.grupos.tipo ? match[pattern.grupos.tipo]?.trim() : '';
        
        // Filtros básicos para ignorar cabeçalhos e linhas de saldo (case-insensitive)
        const descricaoLower = descricaoBruta?.toLowerCase() || '';
        if (/saldo\s+(anterior|atual|do\s+dia)/i.test(descricaoBruta) ||
            /total\s*(de\s*)?(entradas|saídas|geral)?/i.test(descricaoBruta) ||
            /extrato/i.test(descricaoBruta) ||
            /data\s+(descrição|movimentação)/i.test(descricaoBruta) ||
            /lançamento/i.test(descricaoBruta) ||
            descricaoLower.length < 3) {
          continue;
        }
        
        // Converte valor
        const valorNum = converterValorBR(valorStr);
        if (isNaN(valorNum) || valorNum === 0) continue;
        
        // Determina tipo (entrada/saída)
        const isNegativo = valorStr.includes('-') || valorNum < 0;
        
        // Parse da data
        let data: Date;
        try {
          data = parseDate(dataStr);
        } catch {
          continue;
        }
        
        // Limpa descrição e adiciona tipo se houver
        let descricaoLimpa = descricaoBruta
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\s*(PIX_DEB|PIX_CRED|PIX|TED|DOC|CX\d+|DOCUMENTO)\s*/gi, '')
          .replace(/\s+[-+]?R?\$?\s*[\d.]+,\d{2}\s*$/, '')
          .substring(0, 200);
        
        // Se tem tipo (C6 Bank tabela), adiciona à descrição
        if (tipoStr && !descricaoLimpa.includes(tipoStr)) {
          descricaoLimpa = `${tipoStr.trim()} - ${descricaoLimpa}`;
        }
        
        if (descricaoLimpa.length < 3) continue;
        
        const transacao: TransacaoExtrato = {
          id: `temp_${Date.now()}_${transacaoIndex}_${pattern.nome.replace(/\s/g, '_')}`,
          data,
          descricao: descricaoLimpa,
          valor: Math.abs(valorNum),
          tipo: isNegativo ? 'saida' : 'entrada',
          selecionada: true
        };
        
        transacoes.push(transacao);
        transacaoIndex++;
        countThisPattern++;
      }
      
      console.log(`   ${pattern.nome}: ${countThisPattern} transações encontradas`);
      
      // Se encontrou transações suficientes, para aqui
      if (transacoes.length > 0) {
        console.log(`✅ Padrão "${pattern.nome}" funcionou! ${transacoes.length} transações`);
        break;
      }
    }
    
    // Remove duplicatas baseadas em data + descrição + valor
    const transacoesUnicas = transacoes.filter((t, index, self) => 
      index === self.findIndex(x => 
        x.data.getTime() === t.data.getTime() && 
        x.descricao === t.descricao && 
        x.valor === t.valor
      )
    );
    
    // Validação da soma total
    const totalEntradas = transacoesUnicas.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
    const totalSaidas = transacoesUnicas.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0);
    console.log(`💰 Totais calculados - Entradas: R$ ${totalEntradas.toFixed(2)} | Saídas: R$ ${totalSaidas.toFixed(2)}`);
    
    return transacoesUnicas;
  };

  const parsePDF = (file: File): Promise<TransacaoExtrato[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Configurar o worker do PDF.js
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
          
          // Carregar o PDF
          const loadingTask = pdfjsLib.getDocument(arrayBuffer);
          const pdf = await loadingTask.promise;
          
          let fullText = '';
          
          // Extrair texto de todas as páginas
          console.log(`📄 Processando PDF com ${pdf.numPages} página(s)...`);
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            console.log(`📄 Página ${i}: ${pageText.substring(0, 200)}...`);
            fullText += pageText + '\n';
          }
          
          console.log('📄 Primeiras 1500 caracteres:', fullText.substring(0, 1500));
          
          // Detecta o banco
          const bancoDetectado = detectarBanco(fullText, file.name);
          console.log(`🏦 Banco detectado: ${bancoDetectado}`);
          
          // Usa parser genérico que tenta múltiplos formatos
          const transacoes = parseGenerico(fullText, file.name);
          
          console.log(`📊 Total final: ${transacoes.length} transações encontradas`);
          
          // Log das primeiras 3 transações para debug
          transacoes.slice(0, 3).forEach((t, i) => {
            console.log(`   ${i + 1}. ${format(t.data, 'dd/MM/yyyy')} - ${t.descricao.substring(0, 40)} - R$ ${t.valor.toFixed(2)} (${t.tipo})`);
          });
          
          if (transacoes.length === 0) {
            console.error('❌ Nenhuma transação detectada.');
            console.error('Texto completo (primeiros 1500 chars):', fullText.substring(0, 1500));
            throw new Error(
              `Nenhuma transação encontrada no PDF.\n\n` +
              `Banco detectado: ${bancoDetectado}\n\n` +
              `O sistema tentou ${6} formatos diferentes, mas não encontrou transações.\n\n` +
              `Dica: Tente exportar o extrato como XLSX se disponível.`
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

  // Função auxiliar para parsing de valores numéricos
  const parseValor = (valorStr: any): number => {
    if (!valorStr) return 0;
    
    const str = String(valorStr);
    const limpo = str.replace(/[^\d,.-]/g, '');
    
    if (limpo.includes(',') && limpo.includes('.')) {
      // Tem ambos: determina formato baseado em qual vem depois
      if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
        // Formato BR: 1.234,56
        return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
      } else {
        // Formato US: 1,234.56
        return parseFloat(limpo.replace(/,/g, ''));
      }
    } else if (limpo.includes(',')) {
      // Só vírgula: assume BR
      return parseFloat(limpo.replace(',', '.'));
    } else {
      // Só ponto ou sem separador
      return parseFloat(limpo);
    }
  };

  const parseCSV = (file: File): Promise<TransacaoExtrato[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'string' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
          
          console.log('📊 Processando CSV:', file.name);
          console.log(`   Encontradas ${jsonData.length} linhas`);
          
          if (!jsonData || jsonData.length === 0) {
            throw new Error("Arquivo CSV vazio ou sem dados válidos");
          }

          // Log das colunas encontradas
          if (jsonData.length > 0) {
            const colunas = Object.keys(jsonData[0] as any);
            console.log('   Colunas:', colunas);
          }

          // Detecta colunas separadas de Entrada e Saída
          const primeiraLinha = jsonData[0] as any;
          const entradaKey = Object.keys(primeiraLinha).find(k => {
            const kLower = k.toLowerCase().trim();
            return (kLower.includes('entrada') || kLower.includes('crédito') || kLower.includes('credito')) 
                   && (kLower.includes('r$') || kLower.includes('valor') || kLower.includes('rs'));
          });

          const saidaKey = Object.keys(primeiraLinha).find(k => {
            const kLower = k.toLowerCase().trim();
            return (kLower.includes('saída') || kLower.includes('saida') || kLower.includes('débito') || kLower.includes('debito')) 
                   && (kLower.includes('r$') || kLower.includes('valor') || kLower.includes('rs'));
          });

          const temColunasSeparadas = entradaKey && saidaKey;
          
          if (temColunasSeparadas) {
            console.log('   ✅ Detectadas colunas separadas de Entrada/Saída');
            console.log(`      Entrada: "${entradaKey}"`);
            console.log(`      Saída: "${saidaKey}"`);
          } else {
            console.log('   ℹ️ Usando detecção de coluna única de valores');
          }

          const transacoes = jsonData.map((row: any, index) => {
            // FLUXO A: Colunas separadas de Entrada/Saída
            if (temColunasSeparadas) {
              const valorEntrada = parseValor(row[entradaKey!]);
              const valorSaida = parseValor(row[saidaKey!]);
              
              // Busca data e descrição
              const dataKey = Object.keys(row).find(k => {
                const kLower = k.toLowerCase();
                return kLower.includes('data') || 
                       kLower.includes('date') || 
                       kLower.includes('dt') ||
                       kLower.includes('dia');
              });
              
              const descricaoKey = Object.keys(row).find(k => {
                const kLower = k.toLowerCase();
                return kLower.includes('descri') || 
                       kLower.includes('description') || 
                       kLower.includes('histor') ||
                       kLower.includes('detalhe') ||
                       kLower.includes('memo') ||
                       kLower.includes('obs') ||
                       kLower.includes('lancamento');
              });
              
              // Determina tipo e valor baseado em qual coluna tem valor
              let tipo: 'entrada' | 'saida';
              let valor: number;
              
              if (valorEntrada > 0 && valorSaida === 0) {
                tipo = 'entrada';
                valor = valorEntrada;
              } else if (valorSaida > 0 && valorEntrada === 0) {
                tipo = 'saida';
                valor = valorSaida;
              } else if (valorEntrada > 0 && valorSaida > 0) {
                // Caso raro: ambas preenchidas, usar a maior
                console.warn('⚠️ Linha com entrada E saída preenchidas:', row);
                tipo = valorEntrada > valorSaida ? 'entrada' : 'saida';
                valor = Math.max(valorEntrada, valorSaida);
              } else {
                // Ambas zeradas, skip
                return null;
              }
              
              return {
                id: `temp_csv_${index}`,
                data: dataKey ? parseDate(row[dataKey]) : new Date(),
                descricao: descricaoKey ? String(row[descricaoKey]).trim() : 'Sem descrição',
                valor,
                tipo,
                selecionada: true
              };
            }
            
            // FLUXO B: Coluna única (lógica original)
            // Busca por colunas de data (mais flexível)
            const dataKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('data') || 
                     kLower.includes('date') || 
                     kLower.includes('dt') ||
                     kLower.includes('dia');
            });
            
            // Busca por colunas de descrição (mais flexível)
            const descricaoKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('descri') || 
                     kLower.includes('description') || 
                     kLower.includes('histor') ||
                     kLower.includes('detalhe') ||
                     kLower.includes('memo') ||
                     kLower.includes('obs') ||
                     kLower.includes('lancamento');
            });
            
            // Busca por colunas de valor (mais flexível, incluindo débito/crédito)
            let valorKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('valor') || 
                     kLower.includes('value') || 
                     kLower.includes('montante') || 
                     kLower.includes('amount') ||
                     kLower.includes('débito') ||
                     kLower.includes('debito') ||
                     kLower.includes('crédito') ||
                     kLower.includes('credito');
            });

            // Se não encontrou valor, tenta pela primeira coluna numérica
            if (!valorKey) {
              valorKey = Object.keys(row).find(k => {
                const val = String(row[k]).replace(/[^\d,.-]/g, '');
                return val.length > 0 && !isNaN(parseFloat(val.replace(',', '.')));
              });
            }

            // Parse do valor usando a função auxiliar
            let valorNum = 0;
            if (valorKey) {
              valorNum = parseValor(row[valorKey]);
            }

            // Determina o tipo (entrada/saída)
            let tipo: 'entrada' | 'saida' = 'entrada';
            
            // Tenta detectar pelo nome da coluna ou valor negativo
            if (valorKey) {
              const kLower = valorKey.toLowerCase();
              if (kLower.includes('débito') || kLower.includes('debito') || kLower.includes('saida') || kLower.includes('saída')) {
                tipo = 'saida';
              } else if (kLower.includes('crédito') || kLower.includes('credito') || kLower.includes('entrada')) {
                tipo = 'entrada';
              }
            }
            
            // Se o valor é negativo, é saída
            if (valorNum < 0) {
              tipo = 'saida';
              valorNum = Math.abs(valorNum);
            }

            // Parse da data
            const dataStr = dataKey ? row[dataKey] : new Date();
            const data = parseDate(dataStr);

            // Descrição
            const descricao = descricaoKey 
              ? String(row[descricaoKey]).trim().substring(0, 200)
              : `Transação linha ${index + 1}`;

            // Skip linhas sem valor ou sem descrição mínima
            if (!valorNum || valorNum === 0 || descricao.length < 2) {
              return null;
            }

            return {
              id: `temp_${Date.now()}_${index}`,
              data,
              descricao,
              valor: valorNum,
              tipo,
              selecionada: true
            };
          }).filter((t): t is TransacaoExtrato => t !== null);

          if (transacoes.length === 0) {
            throw new Error(
              "Nenhuma transação válida encontrada no CSV.\n\n" +
              "Certifique-se de que o arquivo contém:\n" +
              "• Uma coluna com datas\n" +
              "• Uma coluna com descrições\n" +
              "• Uma coluna com valores OU colunas separadas de Entrada/Saída"
            );
          }
          
          resolve(transacoes);
        } catch (error) {
          console.error('❌ Erro ao processar CSV:', error);
          
          // Detecta erro de senha
          if (error instanceof Error && error.message.includes('password-protected')) {
            reject(new Error('ARQUIVO_PROTEGIDO_SENHA'));
          } else {
            reject(error);
          }
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsText(file);
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
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
          
          console.log('📊 Processando XLSX:', file.name);
          console.log(`   Encontradas ${jsonData.length} linhas`);
          
          if (!jsonData || jsonData.length === 0) {
            throw new Error("Planilha vazia ou sem dados válidos");
          }

          // Log das colunas encontradas
          if (jsonData.length > 0) {
            const colunas = Object.keys(jsonData[0] as any);
            console.log('   Colunas:', colunas);
          }

          // Detecta colunas separadas de Entrada e Saída
          const primeiraLinha = jsonData[0] as any;
          const entradaKey = Object.keys(primeiraLinha).find(k => {
            const kLower = k.toLowerCase().trim();
            return (kLower.includes('entrada') || kLower.includes('crédito') || kLower.includes('credito')) 
                   && (kLower.includes('r$') || kLower.includes('valor') || kLower.includes('rs'));
          });

          const saidaKey = Object.keys(primeiraLinha).find(k => {
            const kLower = k.toLowerCase().trim();
            return (kLower.includes('saída') || kLower.includes('saida') || kLower.includes('débito') || kLower.includes('debito')) 
                   && (kLower.includes('r$') || kLower.includes('valor') || kLower.includes('rs'));
          });

          const temColunasSeparadas = entradaKey && saidaKey;
          
          if (temColunasSeparadas) {
            console.log('   ✅ Detectadas colunas separadas de Entrada/Saída');
            console.log(`      Entrada: "${entradaKey}"`);
            console.log(`      Saída: "${saidaKey}"`);
          } else {
            console.log('   ℹ️ Usando detecção de coluna única de valores');
          }

          const transacoes = jsonData.map((row: any, index) => {
            // FLUXO A: Colunas separadas de Entrada/Saída
            if (temColunasSeparadas) {
              const valorEntrada = parseValor(row[entradaKey!]);
              const valorSaida = parseValor(row[saidaKey!]);
              
              // Busca data e descrição
              const dataKey = Object.keys(row).find(k => {
                const kLower = k.toLowerCase();
                return kLower.includes('data') || 
                       kLower.includes('date') || 
                       kLower.includes('dt') ||
                       kLower.includes('dia');
              });
              
              const descricaoKey = Object.keys(row).find(k => {
                const kLower = k.toLowerCase();
                return kLower.includes('descri') || 
                       kLower.includes('description') || 
                       kLower.includes('histor') ||
                       kLower.includes('detalhe') ||
                       kLower.includes('memo') ||
                       kLower.includes('obs') ||
                       kLower.includes('lancamento');
              });
              
              // Determina tipo e valor baseado em qual coluna tem valor
              let tipo: 'entrada' | 'saida';
              let valor: number;
              
              if (valorEntrada > 0 && valorSaida === 0) {
                tipo = 'entrada';
                valor = valorEntrada;
              } else if (valorSaida > 0 && valorEntrada === 0) {
                tipo = 'saida';
                valor = valorSaida;
              } else if (valorEntrada > 0 && valorSaida > 0) {
                // Caso raro: ambas preenchidas, usar a maior
                console.warn('⚠️ Linha com entrada E saída preenchidas:', row);
                tipo = valorEntrada > valorSaida ? 'entrada' : 'saida';
                valor = Math.max(valorEntrada, valorSaida);
              } else {
                // Ambas zeradas, skip
                return null;
              }
              
              return {
                id: `temp_xlsx_${index}`,
                data: dataKey ? parseDate(row[dataKey]) : new Date(),
                descricao: descricaoKey ? String(row[descricaoKey]).trim() : 'Sem descrição',
                valor,
                tipo,
                selecionada: true
              };
            }
            
            // FLUXO B: Coluna única (lógica original)
            // Busca por colunas de data (mais flexível)
            const dataKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('data') || 
                     kLower.includes('date') || 
                     kLower.includes('dt') ||
                     kLower.includes('dia');
            });
            
            // Busca por colunas de descrição (mais flexível)
            const descricaoKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('descri') || 
                     kLower.includes('description') || 
                     kLower.includes('histor') ||
                     kLower.includes('detalhe') ||
                     kLower.includes('memo') ||
                     kLower.includes('obs') ||
                     kLower.includes('lancamento');
            });
            
            // Busca por colunas de valor (mais flexível, incluindo débito/crédito)
            let valorKey = Object.keys(row).find(k => {
              const kLower = k.toLowerCase();
              return kLower.includes('valor') || 
                     kLower.includes('value') || 
                     kLower.includes('montante') || 
                     kLower.includes('amount') ||
                     kLower.includes('débito') ||
                     kLower.includes('debito') ||
                     kLower.includes('crédito') ||
                     kLower.includes('credito');
            });

            // Se não encontrou valor, tenta pela primeira coluna numérica
            if (!valorKey) {
              valorKey = Object.keys(row).find(k => {
                const val = String(row[k]).replace(/[^\d,.-]/g, '');
                return val.length > 0 && !isNaN(parseFloat(val.replace(',', '.')));
              });
            }

            // Parse do valor usando a função auxiliar
            let valorNum = 0;
            if (valorKey) {
              valorNum = parseValor(row[valorKey]);
            }

            // Se não encontrou descrição, usa a primeira coluna de texto
            let descricao = 'Transação sem descrição';
            if (descricaoKey) {
              descricao = String(row[descricaoKey]);
            } else {
              const primeiraTextoKey = Object.keys(row).find(k => {
                const val = String(row[k]);
                return val.length > 3 && isNaN(parseFloat(val.replace(/[^\d]/g, '')));
              });
              if (primeiraTextoKey) {
                descricao = String(row[primeiraTextoKey]);
              }
            }

            // Determina tipo baseado no sinal ou colunas de débito/crédito
            let tipo: 'entrada' | 'saida' = 'entrada';
            const valorKeyLower = valorKey?.toLowerCase() || '';
            if (valorKeyLower.includes('débito') || valorKeyLower.includes('debito') || valorNum < 0) {
              tipo = 'saida';
            } else if (valorKeyLower.includes('crédito') || valorKeyLower.includes('credito') || valorNum > 0) {
              tipo = 'entrada';
            }
            
            return {
              id: `temp_xlsx_${index}`,
              data: dataKey ? parseDate(row[dataKey]) : new Date(),
              descricao: descricao.substring(0, 200).trim() || `Transação ${index + 1}`,
              valor: Math.abs(valorNum || 0),
              tipo,
              selecionada: true
            };
          }).filter(t => t.valor > 0); // Remove transações com valor 0
          
          console.log(`✅ XLSX processado: ${transacoes.length} transações válidas`);
          
          // Log das primeiras 3 para debug
          transacoes.slice(0, 3).forEach((t, i) => {
            console.log(`   ${i + 1}. ${format(t.data, 'dd/MM/yyyy')} - ${t.descricao.substring(0, 40)} - R$ ${t.valor.toFixed(2)} (${t.tipo})`);
          });

          if (transacoes.length === 0) {
            throw new Error(
              "Nenhuma transação válida encontrada na planilha.\n\n" +
              "Certifique-se de que a planilha contém:\n" +
              "• Uma coluna com datas\n" +
              "• Uma coluna com descrições\n" +
              "• Uma coluna com valores OU colunas separadas de Entrada/Saída"
            );
          }
          
          resolve(transacoes);
        } catch (error) {
          console.error('❌ Erro ao processar XLSX:', error);
          
          // Detecta erro de senha
          if (error instanceof Error && error.message.includes('password-protected')) {
            reject(new Error('ARQUIVO_PROTEGIDO_SENHA'));
          } else {
            reject(error);
          }
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsBinaryString(file);
    });
  };

  const processar = async () => {
    if (!arquivo) return;
    
    if (!bancoSelecionado) {
      toast.error("Selecione o banco", {
        description: "É necessário selecionar a conta bancária antes de processar"
      });
      return;
    }
    
    setLoading(true);
    try {
      const ext = arquivo.name.split('.').pop()?.toLowerCase();
      
      let transacoesParsed: TransacaoExtrato[] = [];
      
      if (ext === 'pdf') {
        transacoesParsed = await parsePDF(arquivo);
      } else if (ext === 'csv') {
        transacoesParsed = await parseCSV(arquivo);
      } else {
        transacoesParsed = await parseXLSX(arquivo);
      }
      
      // Aplica o banco selecionado em todas as transações
      const transacoesComBanco = transacoesParsed.map(t => ({
        ...t,
        contaBancaria: bancoSelecionado
      }));
      
      // Marcar todas como selecionadas inicialmente
      transacoesComBanco.forEach(t => t.selecionada = true);
      
      // Verificar duplicatas
      await verificarDuplicatas(transacoesComBanco);
      
      setTransacoes(transacoesComBanco);
      setEtapa('categorizar');
      toast.success("Extrato processado", {
        description: `${transacoesParsed.length} transações encontradas`
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      
      if (error instanceof Error) {
        if (error.message === 'ARQUIVO_PROTEGIDO_SENHA') {
          toast.error("Arquivo protegido por senha", {
            description: "Remova a senha do arquivo Excel e tente novamente. A biblioteca não suporta arquivos protegidos."
          });
        } else if (error.message.includes('Nenhuma transação válida')) {
          toast.error("Estrutura inválida", {
            description: error.message
          });
        } else {
          toast.error("Erro ao processar arquivo", {
            description: error.message || "Verifique se o arquivo está no formato correto"
          });
        }
      } else {
        toast.error("Erro ao processar arquivo", {
          description: "Verifique se o arquivo está no formato correto"
        });
      }
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
    // Filtrar selecionadas e excluir duplicatas confirmadas
    const selecionadas = transacoes.filter(t => 
      t.selecionada && (!t.duplicata || t.duplicata.status !== 'confirmada')
    );
    
    // Validar
    const invalidas = selecionadas.filter(t => !t.categoria || !t.contaBancaria);
    if (invalidas.length > 0) {
      toast.error("Categorização incompleta", {
        description: "Todas as transações selecionadas devem ter categoria e conta bancária"
      });
      return;
    }
    
    // Avisar sobre duplicatas possíveis que serão importadas
    const duplicatasPossiveis = selecionadas.filter(t => t.duplicata?.status === 'possivel');
    if (duplicatasPossiveis.length > 0) {
      console.warn(`⚠️ Importando ${duplicatasPossiveis.length} transação(ões) com possível duplicata`);
    }

    if (!empresaAtual?.id) {
      toast.error("Erro de configuração", {
        description: "Nenhuma empresa selecionada. Por favor, selecione uma empresa primeiro."
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
        forma_pagamento: 'a_vista',
        empresa_id: empresaAtual.id
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
    setBancoSelecionado('');
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
            Importe transações de qualquer banco em XLSX, CSV ou PDF. Suporta: Sicredi, C6 Bank, Nubank, Itaú, Bradesco, Santander e outros.
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
                Formatos aceitos: XLSX, XLS, CSV ou PDF (máx. 10MB)<br/>
                Funciona com extratos de qualquer banco brasileiro
              </p>
              <p className="text-xs text-destructive mt-2">
                ⚠️ Arquivos Excel protegidos por senha não são suportados
              </p>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Conta Bancária / Banco
                </label>
                <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map(conta => (
                      <SelectItem key={conta.id} value={conta.nome}>
                        {conta.nome}{conta.banco ? ` - ${conta.banco}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed rounded-lg p-8 hover:border-primary transition-colors text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">
                    {arquivo ? arquivo.name : 'Clique para selecionar ou arraste o arquivo'}
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {arquivo && (
              <div className="flex gap-2">
                <Button onClick={processar} disabled={loading || !bancoSelecionado}>
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
                      <TableHead>Status</TableHead>
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
                    {transacoes.map(transacao => {
                      const isDuplicata = transacao.duplicata;
                      const isConfirmada = isDuplicata?.status === 'confirmada';
                      const isPossivel = isDuplicata?.status === 'possivel';
                      
                      return (
                        <TableRow 
                          key={transacao.id}
                          className={
                            isConfirmada 
                              ? 'bg-destructive/5 hover:bg-destructive/10' 
                              : isPossivel 
                              ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
                              : ''
                          }
                        >
                          <TableCell>
                            <Checkbox 
                              checked={transacao.selecionada}
                              onCheckedChange={() => toggleSelecao(transacao.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {!isDuplicata ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                                🟢 Novo
                              </span>
                            ) : isConfirmada ? (
                              <span 
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive cursor-help"
                                title={`Duplicata confirmada - ${isDuplicata.registros.length} registro(s) similar(es) encontrado(s)`}
                              >
                                🔴 Duplicata
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 cursor-help"
                                title={`Possível duplicata - ${isDuplicata.registros.length} registro(s) similar(es) encontrado(s)`}
                              >
                                🟡 Possível
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(transacao.data, 'dd/MM/yyyy')}
                          </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span 
                            className="block truncate cursor-help"
                            title={transacao.descricao}
                          >
                            {transacao.descricao}
                          </span>
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
                          $ {transacao.valor.toFixed(2)}
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
                                .filter(c => c.classificacao === transacao.tipo)
                                .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
                                .map(cat => (
                                  <SelectItem 
                                    key={cat.id} 
                                    value={cat.id}
                                    className={cat.tipo === 'filha' ? 'pl-8' : 'font-semibold'}
                                  >
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
                                <SelectItem key={conta.id} value={conta.nome}>
                                  {conta.banco ? `${conta.nome} - ${conta.banco}` : conta.nome}
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
                      );
                    })}
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
                  <span className="font-medium text-green-600">$ {totalEntradas.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Saídas:</span>
                  <span className="font-medium text-red-600">$ {totalSaidas.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
