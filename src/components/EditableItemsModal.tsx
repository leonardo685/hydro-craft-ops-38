import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

interface EditableItemsModalProps {
  title: string;
  type: 'pecas' | 'usinagem';
  ordemId: string;
  onUpdate: () => void;
  children: React.ReactNode;
}

interface Item {
  id: string;
  peca?: string;
  trabalho?: string;
  quantidade: number;
  valor?: number;
}

export function EditableItemsModal({ title, type, ordemId, onUpdate, children }: EditableItemsModalProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const [newForm, setNewForm] = useState<Partial<Item>>({ quantidade: 1 });

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, ordemId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const campo = type === 'pecas' ? 'pecas_necessarias' : 'usinagem_necessaria';
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(campo)
        .eq('id', ordemId)
        .single();

      if (error) throw error;

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
  };

  const renderItemCard = (item: Item) => {
    const isEditing = editingId === item.id;

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
          <>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="font-semibold">
                  {type === 'pecas' ? item.peca : item.trabalho}
                </div>
                <div className="text-sm text-muted-foreground">
                  Quantidade: {item.quantidade}
                  {type === 'pecas' && item.valor && ` • Valor: R$ ${item.valor.toFixed(2)}`}
                </div>
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
          </>
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

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
