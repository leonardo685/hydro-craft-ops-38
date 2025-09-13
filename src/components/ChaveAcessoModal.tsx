import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileText, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatarChaveAcesso, validarChaveAcesso, extrairDadosNFe, buscarClientePorCNPJ, type DadosNFe, type ItemNFe } from "@/lib/nfe-utils";
import { ItensNFeModal } from "./ItensNFeModal";

interface ChaveAcessoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dadosNFe: DadosNFe, itensSelecionados: ItemNFe[], cliente: string) => void;
}

export function ChaveAcessoModal({ open, onClose, onConfirm }: ChaveAcessoModalProps) {
  const navigate = useNavigate();
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosNFe | null>(null);
  const [cliente, setCliente] = useState("");
  const [erro, setErro] = useState("");
  const [mostrarItens, setMostrarItens] = useState(false);

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

  const handleValidar = () => {
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

    const dados = extrairDadosNFe(chaveAcesso);
    setDadosExtraidos(dados);
    
    // Buscar cliente pelo CNPJ
    const clienteEncontrado = buscarClientePorCNPJ(dados.cnpjEmitente);
    setCliente(clienteEncontrado);
    
    if (!clienteEncontrado) {
      setErro("Cliente não encontrado no cadastro. Os dados serão preenchidos, mas você precisará selecionar o cliente manualmente.");
    }
  };

  const handleProsseguir = () => {
    if (!dadosExtraidos) return;
    setMostrarItens(true);
  };

  const handleConfirmarItens = (dadosNFe: DadosNFe, itensSelecionados: ItemNFe[]) => {
    onConfirm(dadosNFe, itensSelecionados, cliente);
    handleFechar();
  };

  const handleCadastrarCliente = () => {
    if (!dadosExtraidos) return;
    
    // Navegar para página de cadastro com dados pré-preenchidos
    navigate('/cadastros', { 
      state: { 
        cnpj: dadosExtraidos.cnpjEmitente,
        activeTab: 'clientes'
      } 
    });
    handleFechar();
  };

  const handleFechar = () => {
    setChaveAcesso("");
    setDadosExtraidos(null);
    setCliente("");
    setErro("");
    setMostrarItens(false);
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
                    {cliente && <p><strong>Cliente:</strong> {cliente}</p>}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
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

        {dadosExtraidos && (
          <ItensNFeModal
            open={mostrarItens}
            onClose={() => setMostrarItens(false)}
            onConfirm={handleConfirmarItens}
            dadosNFe={dadosExtraidos}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}