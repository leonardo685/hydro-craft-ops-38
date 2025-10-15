import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";

export const CategoriasFinanceiras = () => {
  const { 
    categorias,
    categoriasMae, 
    gerarProximoCodigo, 
    adicionarCategoria, 
    deletarCategoria,
    getNomeCategoriaMae 
  } = useCategoriasFinanceiras();
  
  const [expandedCategorias, setExpandedCategorias] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: 'mae' as 'mae' | 'filha',
    categoriaMaeId: '',
    classificacao: 'entrada' as 'entrada' | 'saida'
  });
  
  const { toast } = useToast();


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (formData.tipo === 'filha' && !formData.categoriaMaeId) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria mãe",
        variant: "destructive"
      });
      return;
    }

    adicionarCategoria({
      nome: formData.nome.trim(),
      tipo: formData.tipo,
      classificacao: formData.classificacao,
      ...(formData.tipo === 'filha' && { categoriaMaeId: formData.categoriaMaeId })
    });
    
    toast({
      title: "Sucesso",
      description: "Categoria criada com sucesso"
    });
    
    setFormData({
      codigo: '',
      nome: '',
      tipo: 'mae',
      categoriaMaeId: '',
      classificacao: 'entrada'
    });
    
    setIsDialogOpen(false);
  };

  const handleTipoChange = (tipo: 'mae' | 'filha') => {
    setFormData(prev => ({
      ...prev,
      tipo,
      categoriaMaeId: tipo === 'mae' ? '' : prev.categoriaMaeId
    }));
  };

  const toggleCategoria = (categoriaId: string) => {
    setExpandedCategorias(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  };

  const getCategoriasFilhas = (categoriaMaeId: string) => {
    return categorias.filter(cat => cat.tipo === 'filha' && cat.categoriaMaeId === categoriaMaeId);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Categorias Financeiras
            </CardTitle>
            <CardDescription>
              Organize suas transações por categorias com contas mães e filhas
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nova Categoria Financeira</DialogTitle>
                  <DialogDescription>
                    Crie uma nova categoria para organizar suas transações
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Plano de Contas</Label>
                    <Select value={formData.tipo} onValueChange={handleTipoChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mae">Conta Mãe</SelectItem>
                        <SelectItem value="filha">Conta Filha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="classificacao">Tipo</Label>
                    <Select value={formData.classificacao} onValueChange={(value: 'entrada' | 'saida') => setFormData(prev => ({ ...prev, classificacao: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.tipo === 'filha' && (
                    <div className="grid gap-2">
                      <Label htmlFor="categoriaMae">Categoria Mãe</Label>
                      <Select value={formData.categoriaMaeId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoriaMaeId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria mãe" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasMae.map(categoria => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.codigo} - {categoria.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={gerarProximoCodigo(formData.tipo, formData.categoriaMaeId)}
                      disabled
                      placeholder="Código será gerado automaticamente"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Nome da Categoria</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Receita de Reforma de Cilindros"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Criar Categoria</Button>
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
              <TableHead className="w-12"></TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoriasMae.map((categoriaMae) => {
              const categoriasFilhas = getCategoriasFilhas(categoriaMae.id);
              const isExpanded = expandedCategorias.has(categoriaMae.id);
              const hasFilhas = categoriasFilhas.length > 0;

              return (
                <>
                  {/* Conta Mãe */}
                  <TableRow key={categoriaMae.id} className="font-medium">
                    <TableCell>
                      {hasFilhas && (
                        <button
                          onClick={() => toggleCategoria(categoriaMae.id)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-bold">{categoriaMae.codigo}</TableCell>
                    <TableCell className="font-semibold">{categoriaMae.nome}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{
                          backgroundColor: categoriaMae.classificacao === 'entrada' 
                            ? 'hsl(142 76% 36%)' 
                            : 'hsl(0 84% 60%)',
                          color: 'white',
                          borderColor: categoriaMae.classificacao === 'entrada' 
                            ? 'hsl(142 76% 36%)' 
                            : 'hsl(0 84% 60%)'
                        }}
                      >
                        {categoriaMae.classificacao === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletarCategoria(categoriaMae.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Contas Filhas */}
                  {isExpanded && categoriasFilhas.map((categoriaFilha) => (
                    <TableRow key={categoriaFilha.id} className="bg-muted/30">
                      <TableCell> </TableCell>
                      <TableCell className="font-mono pl-8">{categoriaFilha.codigo}</TableCell>
                      <TableCell className="pl-8">{categoriaFilha.nome}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{
                            backgroundColor: categoriaFilha.classificacao === 'entrada' 
                              ? 'hsl(142 76% 36% / 0.7)' 
                              : 'hsl(0 84% 60% / 0.7)',
                            color: 'white',
                            borderColor: categoriaFilha.classificacao === 'entrada' 
                              ? 'hsl(142 76% 36%)' 
                              : 'hsl(0 84% 60%)'
                          }}
                        >
                          {categoriaFilha.classificacao === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletarCategoria(categoriaFilha.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};