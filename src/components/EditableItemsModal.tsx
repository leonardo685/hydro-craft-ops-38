import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X, Download } from "lucide-react";
import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { useEmpresa } from "@/contexts/EmpresaContext";

interface EditableItemsModalProps {
  title: string;
  type: 'pecas' | 'usinagem';
  ordemId: string;
  onUpdate: () => void;
  children: React.ReactNode;
  compraStatus?: 'aprovado' | 'cotando' | 'comprado';
}

interface Item {
  id: string;
  peca?: string;
  trabalho?: string;
  quantidade: number;
  valor?: number;
  comprado?: boolean;
}

interface OrdemData {
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  recebimentos?: {
    numero_ordem: string;
    cliente_nome: string;
  } | null;
}

export function EditableItemsModal({ title, type, ordemId, onUpdate, children, compraStatus }: EditableItemsModalProps) {
  const { empresaAtual } = useEmpresa();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [ordemData, setOrdemData] = useState<OrdemData | null>(null);

  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const [newForm, setNewForm] = useState<Partial<Item>>({ quantidade: 1 });

  useEffect(() => {
    if (open) {
      loadItems();
      setSelectedItems([]);
    }
  }, [open, ordemId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const campo = type === 'pecas' ? 'pecas_necessarias' : 'usinagem_necessaria';
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          ${campo},
          numero_ordem,
          cliente_nome,
          equipamento,
          recebimentos (
            numero_ordem,
            cliente_nome
          )
        `)
        .eq('id', ordemId)
        .single();

      if (error) throw error;

      // Armazenar dados da ordem
      setOrdemData({
        numero_ordem: data.numero_ordem,
        cliente_nome: data.cliente_nome,
        equipamento: data.equipamento,
        recebimentos: data.recebimentos
      });

      const itemsData = data[campo] || [];
      // Adicionar IDs únicos se não existirem
      const itemsWithIds = itemsData.map((item: any, index: number) => ({
        ...item,
        id: item.id || `item-${index}-${Date.now()}`
      }));
      setItems(itemsWithIds);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const saveItems = async (updatedItems: Item[]) => {
    setLoading(true);
    try {
      const campo = type === 'pecas' ? 'pecas_necessarias' : 'usinagem_necessaria';
      
      // Remover IDs temporários antes de salvar
      const itemsToSave = updatedItems.map(({ id, ...item }) => item);
      
      const { error } = await supabase
        .from('ordens_servico')
        .update({ [campo]: itemsToSave })
        .eq('id', ordemId);

      if (error) throw error;

      toast.success('Itens atualizados com sucesso');
      onUpdate();
      loadItems();
    } catch (error) {
      console.error('Erro ao salvar itens:', error);
      toast.error('Erro ao salvar itens');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const newItem: Item = {
      id: `new-${Date.now()}`,
      quantidade: newForm.quantidade || 1,
      ...(type === 'pecas' 
        ? { peca: newForm.peca || '', valor: newForm.valor || 0 }
        : { trabalho: newForm.trabalho || '' }
      )
    };

    if (type === 'pecas' && !newItem.peca) {
      toast.error('Preencha a descrição da peça');
      return;
    }
    if (type === 'usinagem' && !newItem.trabalho) {
      toast.error('Preencha a descrição do trabalho');
      return;
    }

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    saveItems(updatedItems);
    setNewForm({ quantidade: 1 });
    setIsAdding(false);
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = () => {
    const updatedItems = items.map(item => 
      item.id === editingId ? { ...item, ...editForm } : item
    );
    setItems(updatedItems);
    saveItems(updatedItems);
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    saveItems(updatedItems);
    // Remover da seleção se estiver selecionado
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleToggleComprado = async (itemId: string) => {
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, comprado: !item.comprado }
        : item
    );
    setItems(updatedItems);
    await saveItems(updatedItems);
  };

  const generatePDF = async () => {
    const tipoIdentificacao = empresaAtual?.tipo_identificacao || 'cnpj';
    const labelIdentificacao = tipoIdentificacao === 'ein' ? 'EIN' : tipoIdentificacao === 'ssn' ? 'SSN' : 'CNPJ';
    
    const EMPRESA_INFO = {
      nome: empresaAtual?.razao_social || empresaAtual?.nome || "N/A",
      cnpj: empresaAtual?.cnpj || "",
      telefone: empresaAtual?.telefone || "",
      email: empresaAtual?.email || "",
      labelIdentificacao
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 10;

    // Usar o número da ordem do recebimento (MH-XXX-XX) ou da ordem de serviço
    const numeroOrdemCorreto = ordemData?.recebimentos?.numero_ordem || ordemData?.numero_ordem || 'ordem';

    const selectedData = items.filter(item => selectedItems.includes(item.id));

    // Função para adicionar detalhes decorativos (triângulos vermelhos e pretos)
    const adicionarDetalheDecorativo = () => {
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 30, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
      doc.setFillColor(0, 0, 0);
      doc.triangle(pageWidth - 15, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
    };

    // Função para adicionar rodapé
    const adicionarRodape = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        adicionarDetalheDecorativo();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
      }
    };

    // Adicionar logo dinâmico
    await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);

    // Cabeçalho com informações da empresa
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
    doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
    doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
    
    // Linha separadora vermelha
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
    
    // Triângulo decorativo vermelho no canto superior direito
    doc.setFillColor(220, 38, 38);
    doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
    
    yPosition = 48;
    
    // Título em vermelho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPosition = 65;

    // Informações da Ordem
    if (ordemData) {
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Informações da Ordem de Serviço", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Primeira linha: Nº Ordem + Data
      const colWidth = (pageWidth - 40) / 2;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      doc.text(`Nº Ordem: ${numeroOrdemCorreto}`, 22, yPosition + 5.5);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 22 + colWidth, yPosition + 5.5);
      yPosition += 8;

      yPosition += 10;
    }

    // Título da seção de itens
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
    const sectionTitle = type === 'pecas' ? 'PEÇAS SELECIONADAS' : 'USINAGEM SELECIONADA';
    doc.text(sectionTitle, pageWidth / 2, yPosition + 7, { align: 'center' });
    yPosition += 15;

    // Conteúdo dos itens
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    selectedData.forEach((item, index) => {
      if (yPosition > pageHeight - 40) {
        adicionarRodape();
        doc.addPage();
        yPosition = 30;
      }
      
      // Box para cada item
      const boxHeight = type === 'pecas' ? 25 : 20;
      
      doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
      doc.rect(20, yPosition, pageWidth - 40, boxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, boxHeight);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, 25, yPosition + 7);
      
      if (type === 'pecas') {
        doc.text(`Peça: ${item.peca || 'N/A'}`, 35, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantidade: ${item.quantidade || 'N/A'}`, 35, yPosition + 14);
        doc.text(`Valor: R$ ${item.valor?.toFixed(2) || '0,00'}`, 35, yPosition + 21);
      } else {
        doc.text(`Operação: ${item.trabalho || 'N/A'}`, 35, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantidade: ${item.quantidade || 'N/A'}`, 35, yPosition + 14);
      }
      
      yPosition += boxHeight + 5;
    });

    // Adicionar rodapé em todas as páginas
    adicionarRodape();
    
    // Save the PDF com nome MH-XXX-XX
    const tipoNome = type === 'pecas' ? 'pecas' : 'usinagem';
    doc.save(`${numeroOrdemCorreto}_${tipoNome}_${new Date().getTime()}.pdf`);
    toast.success('PDF gerado com sucesso');
  };

  const renderItemCard = (item: Item) => {
    const isEditing = editingId === item.id;
    const isSelected = selectedItems.includes(item.id);

    return (
      <Card key={item.id} className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            {type === 'pecas' ? (
              <>
                <div>
                  <Label>Peça / Descrição</Label>
                  <Input
                    value={editForm.peca || ''}
                    onChange={(e) => setEditForm({ ...editForm, peca: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={editForm.quantidade || 0}
                      onChange={(e) => setEditForm({ ...editForm, quantidade: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.valor || 0}
                      onChange={(e) => setEditForm({ ...editForm, valor: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Trabalho / Operação</Label>
                  <Input
                    value={editForm.trabalho || ''}
                    onChange={(e) => setEditForm({ ...editForm, trabalho: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={editForm.quantidade || 0}
                    onChange={(e) => setEditForm({ ...editForm, quantidade: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              id={item.id}
              checked={isSelected}
              onCheckedChange={() => handleItemToggle(item.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold">
                    {type === 'pecas' ? item.peca : item.trabalho}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Quantidade: {item.quantidade}
                    {type === 'pecas' && item.valor && ` • Valor: R$ ${item.valor.toFixed(2)}`}
                  </div>
                  {compraStatus === 'cotando' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox
                        id={`comprado-${item.id}`}
                        checked={item.comprado || false}
                        onCheckedChange={() => handleToggleComprado(item.id)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <label 
                        htmlFor={`comprado-${item.id}`}
                        className={`text-sm cursor-pointer ${item.comprado ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                      >
                        Já comprado
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDelete(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : items.length === 0 && !isAdding ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item cadastrado
            </div>
          ) : (
            items.map(renderItemCard)
          )}

          {isAdding ? (
            <Card className="p-4">
              <div className="space-y-3">
                {type === 'pecas' ? (
                  <>
                    <div>
                      <Label>Peça / Descrição</Label>
                      <Input
                        value={newForm.peca || ''}
                        onChange={(e) => setNewForm({ ...newForm, peca: e.target.value })}
                        placeholder="Ex: Retentor 40x52x7"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={newForm.quantidade || 1}
                          onChange={(e) => setNewForm({ ...newForm, quantidade: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newForm.valor || 0}
                          onChange={(e) => setNewForm({ ...newForm, valor: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Trabalho / Operação</Label>
                      <Input
                        value={newForm.trabalho || ''}
                        onChange={(e) => setNewForm({ ...newForm, trabalho: e.target.value })}
                        placeholder="Ex: Retífica de camisa"
                      />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        value={newForm.quantidade || 1}
                        onChange={(e) => setNewForm({ ...newForm, quantidade: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={loading}>
                    <Save className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsAdding(false);
                      setNewForm({ quantidade: 1 });
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setIsAdding(true)}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedItems.length} item(s) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={generatePDF}
              disabled={selectedItems.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Gerar PDF
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
