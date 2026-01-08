import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";
import { DadosNFe, ItemNFe } from "@/lib/nfe-utils";

interface EditarDadosNFeModalProps {
  open: boolean;
  onClose: () => void;
  dados: DadosNFe;
  onSalvar: (dados: DadosNFe) => void;
}

export function EditarDadosNFeModal({ open, onClose, dados, onSalvar }: EditarDadosNFeModalProps) {
  const [dadosEditados, setDadosEditados] = useState<DadosNFe>(dados);

  const handleChange = (campo: keyof DadosNFe, valor: string) => {
    setDadosEditados(prev => ({ ...prev, [campo]: valor }));
  };

  const handleItemChange = (index: number, campo: keyof ItemNFe, valor: string | number) => {
    setDadosEditados(prev => ({
      ...prev,
      itens: (prev.itens || []).map((item, i) => 
        i === index ? { ...item, [campo]: valor } : item
      )
    }));
  };

  const adicionarItem = () => {
    setDadosEditados(prev => ({
      ...prev,
      itens: [...(prev.itens || []), {
        codigo: '',
        descricao: '',
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        ncm: '',
        unidade: 'UN'
      } as ItemNFe]
    }));
  };

  const removerItem = (index: number) => {
    setDadosEditados(prev => ({
      ...prev,
      itens: (prev.itens || []).filter((_, i) => i !== index)
    }));
  };

  const handleSalvar = () => {
    // Recalcular valor total de cada item
    const itensAtualizados = (dadosEditados.itens || []).map(item => ({
      ...item,
      valorTotal: item.quantidade * item.valorUnitario
    }));
    
    onSalvar({ ...dadosEditados, itens: itensAtualizados });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados da NFe</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dados do Emitente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Emitente</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nomeEmitente">Nome/Razão Social</Label>
                <Input
                  id="nomeEmitente"
                  value={dadosEditados.nomeEmitente || ''}
                  onChange={(e) => handleChange('nomeEmitente', e.target.value)}
                  placeholder="Nome do emitente"
                />
              </div>
              <div>
                <Label htmlFor="cnpjEmitente">CNPJ Emitente</Label>
                <Input
                  id="cnpjEmitente"
                  value={dadosEditados.cnpjEmitente || ''}
                  onChange={(e) => handleChange('cnpjEmitente', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          </div>

          {/* Dados do Destinatário */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Destinatário</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="clienteNome">Nome/Razão Social</Label>
                <Input
                  id="clienteNome"
                  value={dadosEditados.clienteNome || ''}
                  onChange={(e) => handleChange('clienteNome', e.target.value)}
                  placeholder="Nome do destinatário"
                />
              </div>
              <div>
                <Label htmlFor="clienteCnpj">CNPJ Destinatário</Label>
                <Input
                  id="clienteCnpj"
                  value={dadosEditados.clienteCnpj || ''}
                  onChange={(e) => handleChange('clienteCnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          </div>

          {/* Dados da Nota */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Dados da Nota</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={dadosEditados.numero || ''}
                  onChange={(e) => handleChange('numero', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="serie">Série</Label>
                <Input
                  id="serie"
                  value={dadosEditados.serie || ''}
                  onChange={(e) => handleChange('serie', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dataEmissao">Data Emissão</Label>
                <Input
                  id="dataEmissao"
                  type="date"
                  value={dadosEditados.dataEmissao || ''}
                  onChange={(e) => handleChange('dataEmissao', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="valorTotal">Valor Total</Label>
                <Input
                  id="valorTotal"
                  type="number"
                  step="0.01"
                  value={dadosEditados.valorTotal || 0}
                  onChange={(e) => handleChange('valorTotal', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Itens da Nota</h3>
              <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {(dadosEditados.itens || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item. Clique em "Adicionar Item" para incluir.
                </p>
              )}
              {(dadosEditados.itens || []).map((item, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {(dadosEditados.itens || []).length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Código</Label>
                      <Input
                        value={item.codigo || ''}
                        onChange={(e) => handleItemChange(index, 'codigo', e.target.value)}
                        placeholder="Código do produto"
                      />
                    </div>
                    <div>
                      <Label>NCM</Label>
                      <Input
                        value={item.ncm || ''}
                        onChange={(e) => handleItemChange(index, 'ncm', e.target.value)}
                        placeholder="NCM"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={item.descricao || ''}
                      onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                      placeholder="Descrição completa do produto"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        value={item.quantidade || 0}
                        onChange={(e) => handleItemChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Valor Unitário</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.valorUnitario || 0}
                        onChange={(e) => handleItemChange(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(item.quantidade || 0) * (item.valorUnitario || 0)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
