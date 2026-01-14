import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileText, UserPlus, FileDown, Pencil } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatarChaveAcesso, validarChaveAcesso, extrairDadosNFe, buscarClientePorCNPJ, type DadosNFe, type ItemNFe } from "@/lib/nfe-utils";
import { baixarPdfDanfe } from "@/lib/danfe-pdf-utils";
import { ItensNFeModal } from "./ItensNFeModal";
import { EditarDadosNFeModal } from "./EditarDadosNFeModal";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { useEmpresaId } from "@/hooks/use-empresa-id";

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
    setDadosExtraidos(dados);
    
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

      // 2. Criar ordens de serviço para cada item selecionado
      for (const item of itensSelecionados) {
        const numeroOrdem = await gerarNumeroOrdem();
        
        const recebimentoData = {
          numero_ordem: numeroOrdem,
          cliente_nome: cliente,
          cliente_cnpj: dadosNFe.cnpjEmitente,
          data_entrada: new Date().toISOString(),
          nota_fiscal: dadosNFe.numero, // Salvar sem prefixo NF-
          chave_acesso_nfe: dadosNFe.chaveAcesso,
          tipo_equipamento: item.descricao,
          descricao_nfe: item.descricao, // Descrição original da NFe (imutável)
          numero_serie: `${item.codigo}-${new Date().getFullYear()}`,
          observacoes: `Item da NFe: ${item.codigo} - ${item.descricao}${item.ncm ? ` | NCM: ${item.ncm}` : ''}`,
          urgente: false,
          na_empresa: true,
          status: 'recebido'
        };

        await criarRecebimento(recebimentoData);
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