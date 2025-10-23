import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useContasBancarias } from "@/hooks/use-contas-bancarias";

export const ContasBancarias = () => {
  const { 
    contas,
    adicionarConta, 
    atualizarConta,
    deletarConta
  } = useContasBancarias();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
    ativo: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      return;
    }

    try {
      if (editingConta) {
        await atualizarConta(editingConta, formData);
      } else {
        await adicionarConta(formData);
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      banco: '',
      agencia: '',
      conta: '',
      saldo_inicial: 0,
      ativo: true
    });
    setEditingConta(null);
  };

  const handleEdit = (conta: any) => {
    setFormData({
      nome: conta.nome,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      saldo_inicial: conta.saldo_inicial,
      ativo: conta.ativo
    });
    setEditingConta(conta.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;
    await deletarConta(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Contas Bancárias
            </CardTitle>
            <CardDescription>
              Gerencie suas contas bancárias e saldos iniciais
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingConta ? 'Atualize as informações da conta' : 'Cadastre uma nova conta bancária'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Nome da Conta *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Conta Corrente Principal"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      value={formData.banco}
                      onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="agencia">Agência</Label>
                      <Input
                        id="agencia"
                        value={formData.agencia}
                        onChange={(e) => setFormData(prev => ({ ...prev, agencia: e.target.value }))}
                        placeholder="0001"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="conta">Conta</Label>
                      <Input
                        id="conta"
                        value={formData.conta}
                        onChange={(e) => setFormData(prev => ({ ...prev, conta: e.target.value }))}
                        placeholder="12345-6"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
                    <Input
                      id="saldo_inicial"
                      type="number"
                      step="0.01"
                      value={formData.saldo_inicial}
                      onChange={(e) => setFormData(prev => ({ ...prev, saldo_inicial: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="ativo">Conta Ativa</Label>
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingConta ? 'Atualizar' : 'Criar Conta'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma conta bancária cadastrada
                </TableCell>
              </TableRow>
            ) : (
              contas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">{conta.nome}</TableCell>
                  <TableCell>{conta.banco || '-'}</TableCell>
                  <TableCell>{conta.agencia || '-'}</TableCell>
                  <TableCell>{conta.conta || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(conta.saldo_inicial)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={conta.ativo ? "default" : "secondary"}>
                      {conta.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(conta)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(conta.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};