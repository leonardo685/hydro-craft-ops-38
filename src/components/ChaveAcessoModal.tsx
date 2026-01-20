import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileText, UserPlus, FileDown, Pencil } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatarChaveAcesso, validarChaveAcesso, extrairDadosNFe, buscarClientePorCNPJ, type DadosNFe, type ItemNFe, type OrdemExistente } from "@/lib/nfe-utils";
import { baixarPdfDanfe } from "@/lib/danfe-pdf-utils";
import { ItensNFeModal } from "./ItensNFeModal";
import { EditarDadosNFeModal } from "./EditarDadosNFeModal";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { useEmpresaId } from "@/hooks/use-empresa-id";
import { supabase } from "@/integrations/supabase/client";

interface ChaveAcessoModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChaveAcessoModal({ open, onClose }: ChaveAcessoModalProps) {
  const navigate = useNavigate();
  const { empresaId, loading: empresaLoading } = useEmpresaId();
  const { criarNotaFiscal, criarRecebimento, gerarNumeroOrdem, recarregar } = useRecebimentos();
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosNFe | null>(null);
  const [cliente, setCliente] = useState("");
  const [erro, setErro] = useState("");
  const [mostrarItens, setMostrarItens] = useState(false);
  const [mostrarEdicao, setMostrarEdicao] = useState(false);
  const [ordensExistentes, setOrdensExistentes] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const handleChaveChange = (valor: string) => {
    const valorFormatado = formatarChaveAcesso(valor);
    setChaveAcesso(valorFormatado);
    setErro("");
    
    // Limpar dados extraídos se a chave for alterada
    if (dadosExtraidos) {
      setDadosExtraidos(null);
      setCliente("");
    }
  };

  const handleValidar = async () => {
    if (!chaveAcesso.trim()) {
      setErro("Por favor, digite a chave de acesso");
      return;
    }

    const valida = validarChaveAcesso(chaveAcesso);
    
    if (!valida) {
      setErro("Chave de acesso inválida. Verifique se digitou corretamente.");
      setDadosExtraidos(null);
      setCliente("");
      return;
    }

    const dados = await extrairDadosNFe(chaveAcesso);
    
    // Buscar recebimentos existentes para esta nota e enriquecer os itens
    const chaveNormalizada = chaveAcesso.replace(/\s/g, '');
    const { data: recebimentosExistentes } = await supabase
      .from('recebimentos')
      .select('id, numero_ordem, observacoes')
      .or(`chave_acesso_nfe.eq.${chaveNormalizada},chave_acesso_nfe.eq.${chaveAcesso}`);
    
    console.log('Recebimentos existentes encontrados:', recebimentosExistentes);
    
    // Mapear recebimentos existentes por código + valor unitário para identificar itens únicos
    const recebimentosPorItem = new Map<string, { numeroOrdem: string; recebimentoId: number }>();
    recebimentosExistentes?.forEach(rec => {
      if (rec.observacoes) {
        // Extrair código e valor das observações - formato: "Item da NFe: CODIGO | Valor: VALOR - DESCRICAO"
        const matchCodigo = rec.observacoes.match(/Item da NFe: ([^\s|-]+)/);
        const matchValor = rec.observacoes.match(/Valor: ([\d.,]+)/);
        
        if (matchCodigo) {
          const codigo = matchCodigo[1];
          const valor = matchValor ? matchValor[1].replace(',', '.') : '';
          // Chave única: código + valor unitário
          const chaveItem = valor ? `${codigo}|${valor}` : codigo;
          
          console.log('Mapeando recebimento:', { codigo, valor, chaveItem, numeroOrdem: rec.numero_ordem });
          
          if (!recebimentosPorItem.has(chaveItem)) {
            recebimentosPorItem.set(chaveItem, {
              numeroOrdem: rec.numero_ordem,
              recebimentoId: rec.id
            });
          }
        }
      }
    });
    
    console.log('Mapa de recebimentos:', Array.from(recebimentosPorItem.entries()));
    
    // Enriquecer itens da NFe com informações de ordens existentes
    const itensEnriquecidos = dados.itens?.map(item => {
      // Criar chave de busca: código + valor unitário
      const valorFormatado = item.valorUnitario.toFixed(2);
      const chaveItem = `${item.codigo}|${valorFormatado}`;
      
      console.log('Buscando item:', { codigo: item.codigo, valor: valorFormatado, chaveItem });
      
      // Tentar encontrar pelo código + valor, ou só pelo código como fallback
      const ordemExistente = recebimentosPorItem.get(chaveItem) || recebimentosPorItem.get(item.codigo);
      
      if (ordemExistente) {
        console.log('Ordem existente encontrada:', ordemExistente);
        // Remover do mapa para não reutilizar em itens duplicados
        recebimentosPorItem.delete(chaveItem);
        recebimentosPorItem.delete(item.codigo);
      }
      
      return {
        ...item,
        ordemExistente: ordemExistente
      };
    }) || [];
    
    const dadosEnriquecidos = { ...dados, itens: itensEnriquecidos };
    setDadosExtraidos(dadosEnriquecidos);
    
    const qtdOrdensExistentes = recebimentosExistentes?.length || 0;
    setOrdensExistentes(qtdOrdensExistentes);
    const totalItens = dados.itens?.length || 0;
    
    if (qtdOrdensExistentes >= totalItens && totalItens > 0) {
      setErro(`Esta nota fiscal já possui ordens de serviço para todos os ${totalItens} itens. Não é possível criar novas ordens.`);
      setDadosExtraidos(null);
      return;
    }
    
    // Buscar cliente pelo CNPJ
    const clienteEncontrado = await buscarClientePorCNPJ(dados.cnpjEmitente);
    setCliente(clienteEncontrado);
    
    if (!clienteEncontrado) {
      setErro("Cliente não encontrado no cadastro. Navegue até a aba Cadastros para cadastrar o cliente.");
    }
  };

  const handleProsseguir = () => {
    if (!dadosExtraidos) return;
    
    // Verificar se empresa está carregada ANTES de prosseguir
    if (!empresaId) {
      setErro("Empresa não identificada. Por favor, aguarde o carregamento ou recarregue a página.");
      return;
    }
    
    setMostrarItens(true);
  };

  const handleConfirmarItens = async (dadosNFe: DadosNFe, itensSelecionados: ItemNFe[]) => {
    setSalvando(true);
    try {
      // 1. Salvar a nota fiscal no Supabase
      const notaFiscalData = {
        chave_acesso: dadosNFe.chaveAcesso,
        cnpj_emitente: dadosNFe.cnpjEmitente,
        numero: dadosNFe.numero,
        serie: dadosNFe.serie,
        modelo: dadosNFe.modelo || 'NFe',
        data_emissao: dadosNFe.dataEmissao,
        cliente_nome: cliente,
        cliente_cnpj: dadosNFe.cnpjEmitente,
        valor_total: itensSelecionados.reduce((total, item) => total + item.valorTotal, 0),
        status: 'processada',
        created_at: new Date().toISOString()
      };

      // Preparar itens da NFe para salvar
      const itensParaSalvar = (dadosNFe.itens || []).map(item => ({
        codigo: item.codigo,
        descricao: item.descricao,
        ncm: item.ncm || '',
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal
      }));

      const notaCriada = await criarNotaFiscal(notaFiscalData, itensParaSalvar);
      
      // Se a nota já existia, não continuar
      if (!notaCriada) {
        setSalvando(false);
        return;
      }

      // 2. Criar recebimentos e ordens de serviço para cada item selecionado
      for (const item of itensSelecionados) {
        const numeroOrdem = await gerarNumeroOrdem();
        
        const recebimentoData = {
          numero_ordem: numeroOrdem,
          cliente_nome: cliente,
          cliente_cnpj: dadosNFe.cnpjEmitente,
          data_entrada: new Date().toISOString(),
          nota_fiscal: dadosNFe.numero,
          chave_acesso_nfe: dadosNFe.chaveAcesso.replace(/\s/g, ''), // Normalizar: sempre sem espaços
          tipo_equipamento: item.descricao,
          descricao_nfe: item.descricao,
          numero_serie: `${item.codigo}-${new Date().getFullYear()}`,
          // Formato: "Item da NFe: CODIGO | Valor: VALOR - DESCRICAO" para matching preciso
          observacoes: `Item da NFe: ${item.codigo} | Valor: ${item.valorUnitario.toFixed(2)} - ${item.descricao}${item.ncm ? ` | NCM: ${item.ncm}` : ''}`,
          urgente: false,
          na_empresa: true,
          status: 'recebido'
        };

        const recebimentoCriado = await criarRecebimento(recebimentoData);
        
        // Criar ordem de serviço vinculada ao recebimento
        if (recebimentoCriado) {
          const ordemData = {
            numero_ordem: numeroOrdem,
            recebimento_id: recebimentoCriado.id,
            cliente_nome: cliente,
            equipamento: item.descricao,
            status: 'recebida',
            data_entrada: new Date().toISOString().split('T')[0],
            empresa_id: empresaId,
            prioridade: 'normal'
          };

          await supabase.from('ordens_servico').insert([ordemData]);
        }
      }

      // Recarregar dados para mostrar na listagem
      await recarregar();
      
      handleFechar();
    } catch (error) {
      console.error('Erro ao salvar nota fiscal:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleCadastrarCliente = () => {
    if (!dadosExtraidos) return;
    
    // Navegar para página de cadastro com dados pré-preenchidos da NFe
    navigate('/cadastros', { 
      state: { 
        clienteData: {
          cnpj_cpf: dadosExtraidos.clienteCnpj || dadosExtraidos.cnpjEmitente,
          nome: dadosExtraidos.clienteNome || '',
        },
        activeTab: 'clientes',
        autoFill: true
      } 
    });
    handleFechar();
  };

  const handleSalvarEdicao = (dadosEditados: DadosNFe) => {
    setDadosExtraidos(dadosEditados);
    // Atualizar cliente com o nome do destinatário se tiver
    if (dadosEditados.clienteNome) {
      setCliente(dadosEditados.clienteNome);
    }
  };

  const handleFechar = () => {
    setChaveAcesso("");
    setDadosExtraidos(null);
    setCliente("");
    setErro("");
    setMostrarItens(false);
    setMostrarEdicao(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova Nota Fiscal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chaveAcesso">Chave de Acesso da NFe (44 dígitos)</Label>
            <Input
              id="chaveAcesso"
              value={chaveAcesso}
              onChange={(e) => handleChaveChange(e.target.value)}
              placeholder="Ex: 1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234"
              maxLength={54} // 44 dígitos + 10 espaços
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Digite ou cole a chave de acesso de 44 dígitos da nota fiscal
            </p>
          </div>

          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p>{erro}</p>
                  {dadosExtraidos && !cliente && (
                    <Button 
                      onClick={handleCadastrarCliente}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Cadastrar Cliente
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {dadosExtraidos && dadosExtraidos.valida && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Chave de acesso válida!</p>
                  <div className="text-sm space-y-1">
                    <p><strong>CNPJ:</strong> {dadosExtraidos.cnpjEmitente}</p>
                    <p><strong>Modelo:</strong> {dadosExtraidos.modelo}</p>
                    <p><strong>Série:</strong> {dadosExtraidos.serie}</p>
                    <p><strong>Número:</strong> {dadosExtraidos.numero}</p>
                    <p><strong>Itens encontrados:</strong> {dadosExtraidos.itens?.length || 0}</p>
                    {cliente ? (
                      <p><strong>Cliente:</strong> {cliente}</p>
                    ) : (
                      <div className="text-amber-600 mt-2">
                        <p><strong>Cliente não encontrado no cadastro.</strong></p>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-amber-600 underline"
                          onClick={handleCadastrarCliente}
                        >
                          Ir para Cadastros
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {dadosExtraidos && dadosExtraidos.valida && (
              <Button 
                variant="outline" 
                onClick={() => baixarPdfDanfe(dadosExtraidos)}
                className="w-full"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Baixar DANFE
              </Button>
            )}
            
            <div className="flex gap-2">
              {!dadosExtraidos ? (
                <>
                  <Button variant="outline" onClick={handleFechar} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleValidar} className="flex-1">
                    Validar Chave
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleFechar} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleProsseguir} className="flex-1">
                    Ver Itens ({dadosExtraidos.itens?.length || 0})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {dadosExtraidos && (
          <>
            <ItensNFeModal
              open={mostrarItens}
              onClose={() => setMostrarItens(false)}
              onConfirm={handleConfirmarItens}
              dadosNFe={dadosExtraidos}
              salvando={salvando}
              ordensExistentes={ordensExistentes}
            />
            <EditarDadosNFeModal
              open={mostrarEdicao}
              onClose={() => setMostrarEdicao(false)}
              dados={dadosExtraidos}
              onSalvar={handleSalvarEdicao}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}