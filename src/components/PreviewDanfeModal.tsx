import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, X } from "lucide-react";
import { baixarPdfDanfe } from "@/lib/danfe-pdf-utils";
import type { DadosNFe, ItemNFe } from "@/lib/nfe-utils";

interface PreviewDanfeModalProps {
  open: boolean;
  onClose: () => void;
  dados: DadosNFe | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

function formatChaveAcesso(chave: string): string {
  const limpa = chave.replace(/\D/g, '');
  return limpa.replace(/(\d{4})/g, '$1 ').trim();
}

export function PreviewDanfeModal({ open, onClose, dados }: PreviewDanfeModalProps) {
  if (!dados) return null;

  // Garantir que itens existam e tenham valores corretos (tratando snake_case e camelCase)
  const itensNormalizados: ItemNFe[] = (dados.itens || []).map((item: any) => ({
    codigo: item.codigo || '',
    descricao: item.descricao || '',
    ncm: item.ncm || '',
    quantidade: item.quantidade || 1,
    valorUnitario: item.valor_unitario || item.valorUnitario || 0,
    valorTotal: item.valor_total || item.valorTotal || 0,
    unidade: item.unidade || 'UN'
  }));

  const valorTotal = dados.valorTotal || itensNormalizados.reduce((sum, item) => sum + (item.valorTotal || 0), 0) || 0;

  const handleDownload = () => {
    baixarPdfDanfe(dados);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            DANFE - Pré-visualização
          </DialogTitle>
          <DialogDescription>
            Documento Auxiliar da Nota Fiscal Eletrônica
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-6">
            {/* Cabeçalho DANFE */}
            <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center">
              <h2 className="text-xl font-bold">DANFE</h2>
              <p className="text-sm opacity-90">Documento Auxiliar da Nota Fiscal Eletrônica</p>
            </div>

            {/* Chave de Acesso */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">CHAVE DE ACESSO</p>
              <p className="font-mono text-sm break-all">{formatChaveAcesso(dados.chaveAcesso)}</p>
            </div>

            {/* Dados da Nota */}
            <div className="grid grid-cols-4 gap-4 border rounded-lg p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Nº DA NF-e</p>
                <p className="text-lg font-bold text-primary">{dados.numero || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">SÉRIE</p>
                <p className="text-lg font-medium">{dados.serie || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">DATA EMISSÃO</p>
                <p className="text-lg font-medium">{formatDate(dados.dataEmissao)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">MODELO</p>
                <p className="text-lg font-medium">{dados.modelo || 'NFe'}</p>
              </div>
            </div>

            {/* Emitente */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <p className="text-sm font-semibold">EMITENTE / REMETENTE</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Razão Social:</span>
                  <span className="text-sm">{dados.nomeEmitente || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-muted-foreground">CNPJ:</span>
                  <span className="text-sm font-mono">{dados.cnpjEmitente || '-'}</span>
                </div>
              </div>
            </div>

            {/* Destinatário */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <p className="text-sm font-semibold">DESTINATÁRIO</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Nome/Razão Social:</span>
                  <span className="text-sm">{dados.clienteNome || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-muted-foreground">CNPJ/CPF:</span>
                  <span className="text-sm font-mono">{dados.clienteCnpj || '-'}</span>
                </div>
              </div>
            </div>

            {/* Produtos/Serviços */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <p className="text-sm font-semibold">PRODUTOS / SERVIÇOS</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">CÓDIGO</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">DESCRIÇÃO</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">QTD</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">VL. UNIT.</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">VL. TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensNormalizados.length > 0 ? (
                      itensNormalizados.map((item: ItemNFe, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="px-3 py-2 font-mono text-xs">{item.codigo || '-'}</td>
                          <td className="px-3 py-2">{item.descricao || '-'}</td>
                          <td className="px-3 py-2 text-center">{item.quantidade || 1}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.valorUnitario || 0)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.valorTotal || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground italic">
                          Nenhum item encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <p className="text-sm font-semibold">TOTAIS</p>
              </div>
              <div className="p-4 flex justify-end items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">VALOR TOTAL DA NOTA:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(valorTotal)}</span>
              </div>
            </div>

            {/* Rodapé informativo */}
            <p className="text-xs text-muted-foreground text-center italic">
              Documento gerado automaticamente pelo sistema - Não é documento fiscal válido
            </p>
          </div>
        </ScrollArea>

        <Separator />
        
        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
