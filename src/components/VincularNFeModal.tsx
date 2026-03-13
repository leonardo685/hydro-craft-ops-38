import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Check, Loader2, AlertCircle } from "lucide-react";
import { validarChaveAcesso, extrairDadosNFe, limparChaveAcesso, formatarChaveAcesso } from "@/lib/nfe-utils";
import type { DadosNFe, ItemNFe } from "@/lib/nfe-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresaId } from "@/hooks/use-empresa-id";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface VincularNFeModalProps {
  open: boolean;
  onClose: () => void;
  recebimentoId: number;
  numeroOrdem: string;
  onSuccess: () => void;
}

export function VincularNFeModal({ open, onClose, recebimentoId, numeroOrdem, onSuccess }: VincularNFeModalProps) {
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [dadosNFe, setDadosNFe] = useState<DadosNFe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<number>(0);
  const [vinculando, setVinculando] = useState(false);
  const { toast } = useToast();
  const { empresaId } = useEmpresaId();

  const handleConsultar = async () => {
    const chaveLimpa = limparChaveAcesso(chaveAcesso);
    
    if (chaveLimpa.length !== 44) {
      setErro("A chave de acesso deve ter 44 dígitos.");
      return;
    }

    if (!validarChaveAcesso(chaveLimpa)) {
      setErro("Chave de acesso inválida (dígito verificador incorreto).");
      return;
    }

    setConsultando(true);
    setErro(null);
    setDadosNFe(null);

    try {
      const dados = await extrairDadosNFe(chaveLimpa);
      if (!dados.valida) {
        setErro("Não foi possível validar a chave de acesso.");
        return;
      }
      setDadosNFe(dados);
      setItemSelecionado(0);
    } catch (error) {
      console.error("Erro ao consultar NFe:", error);
      setErro("Erro ao consultar a nota fiscal. Tente novamente.");
    } finally {
      setConsultando(false);
    }
  };

  const handleVincular = async () => {
    if (!dadosNFe || !empresaId) return;

    setVinculando(true);
    try {
      const chaveLimpa = limparChaveAcesso(chaveAcesso);

      // 1. Check if nota already exists
      const { data: notaExistente } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('chave_acesso', chaveLimpa)
        .maybeSingle();

      let notaFiscalId: string;

      if (notaExistente) {
        notaFiscalId = notaExistente.id;
      } else {
        // Create notas_fiscais record
        const { data: novaNota, error: notaError } = await supabase
          .from('notas_fiscais')
          .insert({
            chave_acesso: chaveLimpa,
            cnpj_emitente: dadosNFe.cnpjEmitente,
            nome_emitente: dadosNFe.nomeEmitente || null,
            numero: dadosNFe.numero,
            serie: dadosNFe.serie,
            modelo: dadosNFe.modelo || 'NFe',
            data_emissao: dadosNFe.dataEmissao,
            cliente_nome: dadosNFe.clienteNome || '',
            cliente_cnpj: dadosNFe.clienteCnpj || null,
            valor_total: dadosNFe.valorTotal || null,
            status: 'processada',
            empresa_id: empresaId,
          })
          .select('id')
          .single();

        if (notaError) throw notaError;
        notaFiscalId = novaNota.id;

        // Insert items
        if (dadosNFe.itens && dadosNFe.itens.length > 0) {
          const itensParaInserir = dadosNFe.itens.map(item => ({
            nota_fiscal_id: notaFiscalId,
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: item.ncm || null,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            valor_total: item.valorTotal,
            empresa_id: empresaId,
          }));

          await supabase.from('itens_nfe').insert(itensParaInserir);
        }
      }

      // 2. Update recebimento with NFe data
      const selectedItem = dadosNFe.itens && dadosNFe.itens.length > 0 
        ? dadosNFe.itens[itemSelecionado] 
        : null;

      const updateData: Record<string, any> = {
        nota_fiscal: dadosNFe.numero,
        nota_fiscal_id: notaFiscalId,
        chave_acesso_nfe: chaveLimpa,
      };

      if (selectedItem) {
        updateData.descricao_nfe = selectedItem.descricao;
        updateData.observacoes = `Item da NFe: ${selectedItem.codigo} | Valor: ${selectedItem.valorUnitario}`;
      }

      const { error: updateError } = await supabase
        .from('recebimentos')
        .update(updateData)
        .eq('id', recebimentoId);

      if (updateError) throw updateError;

      toast({
        title: "NFe vinculada",
        description: `Nota fiscal ${dadosNFe.numero} vinculada à ordem ${numeroOrdem}`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erro ao vincular NFe:", error);
      toast({
        title: "Erro",
        description: "Erro ao vincular nota fiscal",
        variant: "destructive",
      });
    } finally {
      setVinculando(false);
    }
  };

  const handleClose = () => {
    setChaveAcesso("");
    setDadosNFe(null);
    setErro(null);
    setItemSelecionado(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Vincular Nota Fiscal
          </DialogTitle>
          <DialogDescription>
            Vincule uma nota fiscal à ordem <strong>{numeroOrdem}</strong> informando a chave de acesso (44 dígitos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input da chave */}
          <div className="space-y-2">
            <Label>Chave de Acesso NFe</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Informe os 44 dígitos da chave de acesso"
                value={chaveAcesso}
                onChange={(e) => {
                  setChaveAcesso(e.target.value);
                  setErro(null);
                  setDadosNFe(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
                className="flex-1 font-mono text-xs"
              />
              <Button onClick={handleConsultar} disabled={consultando}>
                {consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{erro}</p>
            </div>
          )}

          {/* Dados da NFe */}
          {dadosNFe && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nota Fiscal</span>
                  <span className="font-semibold">{dadosNFe.numero}</span>
                </div>
                {dadosNFe.nomeEmitente && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Emitente</span>
                    <span className="text-sm font-medium">{dadosNFe.nomeEmitente}</span>
                  </div>
                )}
                {dadosNFe.clienteNome && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Destinatário</span>
                    <span className="text-sm font-medium">{dadosNFe.clienteNome}</span>
                  </div>
                )}
                {dadosNFe.valorTotal && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <span className="font-semibold">
                      {dadosNFe.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Seleção de item */}
              {dadosNFe.itens && dadosNFe.itens.length > 0 && (
                <div className="space-y-2">
                  <Label>Selecione o item correspondente a esta ordem:</Label>
                  <RadioGroup
                    value={String(itemSelecionado)}
                    onValueChange={(v) => setItemSelecionado(Number(v))}
                    className="space-y-2 max-h-[200px] overflow-y-auto"
                  >
                    {dadosNFe.itens.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          itemSelecionado === idx ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setItemSelecionado(idx)}
                      >
                        <RadioGroupItem value={String(idx)} id={`item-${idx}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            Cód: {item.codigo} | Valor: {item.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Botão vincular */}
              <Button onClick={handleVincular} disabled={vinculando} className="w-full">
                {vinculando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Vincular Nota Fiscal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
