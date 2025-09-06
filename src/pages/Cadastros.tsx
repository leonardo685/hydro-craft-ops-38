import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Building, Tag, Edit, Trash2 } from "lucide-react";
import { CategoriasFinanceiras } from "@/components/CategoriasFinanceiras";
import { CNPJInput } from "@/components/CNPJInput";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  observacoes?: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  observacoes?: string;
}

const Cadastros = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  // Formulário de cliente
  const [clienteForm, setClienteForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    cnpj_cpf: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    observacoes: ""
  });

  // Formulário de fornecedor
  const [fornecedorForm, setFornecedorForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    cnpj_cpf: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    observacoes: ""
  });

  useEffect(() => {
    loadClientes();
    loadFornecedores();
  }, []);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const resetClienteForm = () => {
    setClienteForm({
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      cnpj_cpf: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      observacoes: ""
    });
    setEditingCliente(null);
    setShowClienteForm(false);
  };

  const handleClienteCNPJDataFetch = (data: any) => {
    setClienteForm({
      ...clienteForm,
      ...data
    });
  };

  const resetFornecedorForm = () => {
    setFornecedorForm({
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      cnpj_cpf: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      observacoes: ""
    });
    setEditingFornecedor(null);
    setShowFornecedorForm(false);
  };

  const handleFornecedorCNPJDataFetch = (data: any) => {
    setFornecedorForm({
      ...fornecedorForm,
      ...data
    });
  };

  const handleSaveCliente = async () => {
    if (!clienteForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingCliente) {
        const { error } = await supabase
          .from('clientes')
          .update(clienteForm)
          .eq('id', editingCliente.id);
        
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([clienteForm]);
        
        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso');
      }
      
      resetClienteForm();
      loadClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleSaveFornecedor = async () => {
    if (!fornecedorForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingFornecedor) {
        const { error } = await supabase
          .from('fornecedores')
          .update(fornecedorForm)
          .eq('id', editingFornecedor.id);
        
        if (error) throw error;
        toast.success('Fornecedor atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('fornecedores')
          .insert([fornecedorForm]);
        
        if (error) throw error;
        toast.success('Fornecedor cadastrado com sucesso');
      }
      
      resetFornecedorForm();
      loadFornecedores();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      toast.error('Erro ao salvar fornecedor');
    }
  };

  const handleEditCliente = (cliente: Cliente) => {
    setClienteForm({
      nome: cliente.nome,
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      endereco: cliente.endereco || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      cep: cliente.cep || "",
      cnpj_cpf: cliente.cnpj_cpf || "",
      inscricao_estadual: cliente.inscricao_estadual || "",
      inscricao_municipal: cliente.inscricao_municipal || "",
      observacoes: cliente.observacoes || ""
    });
    setEditingCliente(cliente);
    setShowClienteForm(true);
  };

  const handleEditFornecedor = (fornecedor: Fornecedor) => {
    setFornecedorForm({
      nome: fornecedor.nome,
      email: fornecedor.email || "",
      telefone: fornecedor.telefone || "",
      endereco: fornecedor.endereco || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      cep: fornecedor.cep || "",
      cnpj_cpf: fornecedor.cnpj_cpf || "",
      inscricao_estadual: fornecedor.inscricao_estadual || "",
      inscricao_municipal: fornecedor.inscricao_municipal || "",
      observacoes: fornecedor.observacoes || ""
    });
    setEditingFornecedor(fornecedor);
    setShowFornecedorForm(true);
  };

  const handleDeleteCliente = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Cliente excluído com sucesso');
      loadClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleDeleteFornecedor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Fornecedor excluído com sucesso');
      loadFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast.error('Erro ao excluir fornecedor');
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie clientes, fornecedores e categorias financeiras</p>
        </div>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorias Financeiras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Clientes
                    </CardTitle>
                    <CardDescription>
                      Gerencie os dados dos seus clientes
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowClienteForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {showClienteForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="cnpj_cpf">CNPJ *</Label>
                          <CNPJInput
                            value={clienteForm.cnpj_cpf}
                            onChange={(value) => setClienteForm({ ...clienteForm, cnpj_cpf: value })}
                            onDataFetch={handleClienteCNPJDataFetch}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome">Nome *</Label>
                          <Input
                            id="nome"
                            value={clienteForm.nome}
                            onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })}
                            placeholder="Nome do cliente"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={clienteForm.email}
                            onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input
                            id="telefone"
                            value={clienteForm.telefone}
                            onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                          <Input
                            id="inscricao_estadual"
                            value={clienteForm.inscricao_estadual}
                            onChange={(e) => setClienteForm({ ...clienteForm, inscricao_estadual: e.target.value })}
                            placeholder="123.456.789.000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                          <Input
                            id="inscricao_municipal"
                            value={clienteForm.inscricao_municipal}
                            onChange={(e) => setClienteForm({ ...clienteForm, inscricao_municipal: e.target.value })}
                            placeholder="12345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="endereco">Endereço</Label>
                          <Input
                            id="endereco"
                            value={clienteForm.endereco}
                            onChange={(e) => setClienteForm({ ...clienteForm, endereco: e.target.value })}
                            placeholder="Rua, Número, Bairro"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input
                            id="cidade"
                            value={clienteForm.cidade}
                            onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })}
                            placeholder="São Paulo"
                          />
                        </div>
                        <div>
                          <Label htmlFor="estado">Estado</Label>
                          <Input
                            id="estado"
                            value={clienteForm.estado}
                            onChange={(e) => setClienteForm({ ...clienteForm, estado: e.target.value })}
                            placeholder="SP"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            value={clienteForm.cep}
                            onChange={(e) => setClienteForm({ ...clienteForm, cep: e.target.value })}
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          value={clienteForm.observacoes}
                          onChange={(e) => setClienteForm({ ...clienteForm, observacoes: e.target.value })}
                          placeholder="Observações adicionais"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveCliente}>
                          {editingCliente ? 'Atualizar' : 'Salvar'}
                        </Button>
                        <Button variant="outline" onClick={resetClienteForm}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-4">Lista de Clientes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>CNPJ/CPF</TableHead>
                        <TableHead>Inscrição Estadual</TableHead>
                        <TableHead>Inscrição Municipal</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>{cliente.nome}</TableCell>
                          <TableCell>{cliente.email || '-'}</TableCell>
                          <TableCell>{cliente.telefone || '-'}</TableCell>
                          <TableCell>{cliente.cnpj_cpf || '-'}</TableCell>
                          <TableCell>{cliente.inscricao_estadual || '-'}</TableCell>
                          <TableCell>{cliente.inscricao_municipal || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCliente(cliente)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteCliente(cliente.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {clientes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum cliente cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fornecedores" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Fornecedores
                    </CardTitle>
                    <CardDescription>
                      Gerencie os dados dos seus fornecedores
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowFornecedorForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Fornecedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {showFornecedorForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="fornecedor-cnpj_cpf">CNPJ *</Label>
                          <CNPJInput
                            value={fornecedorForm.cnpj_cpf}
                            onChange={(value) => setFornecedorForm({ ...fornecedorForm, cnpj_cpf: value })}
                            onDataFetch={handleFornecedorCNPJDataFetch}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-nome">Nome *</Label>
                          <Input
                            id="fornecedor-nome"
                            value={fornecedorForm.nome}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                            placeholder="Nome do fornecedor"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-email">Email</Label>
                          <Input
                            id="fornecedor-email"
                            type="email"
                            value={fornecedorForm.email}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, email: e.target.value })}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-telefone">Telefone</Label>
                          <Input
                            id="fornecedor-telefone"
                            value={fornecedorForm.telefone}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-inscricao_estadual">Inscrição Estadual</Label>
                          <Input
                            id="fornecedor-inscricao_estadual"
                            value={fornecedorForm.inscricao_estadual}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, inscricao_estadual: e.target.value })}
                            placeholder="123.456.789.000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-inscricao_municipal">Inscrição Municipal</Label>
                          <Input
                            id="fornecedor-inscricao_municipal"
                            value={fornecedorForm.inscricao_municipal}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, inscricao_municipal: e.target.value })}
                            placeholder="12345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-endereco">Endereço</Label>
                          <Input
                            id="fornecedor-endereco"
                            value={fornecedorForm.endereco}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })}
                            placeholder="Rua, Número, Bairro"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-cidade">Cidade</Label>
                          <Input
                            id="fornecedor-cidade"
                            value={fornecedorForm.cidade}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, cidade: e.target.value })}
                            placeholder="São Paulo"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-estado">Estado</Label>
                          <Input
                            id="fornecedor-estado"
                            value={fornecedorForm.estado}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, estado: e.target.value })}
                            placeholder="SP"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-cep">CEP</Label>
                          <Input
                            id="fornecedor-cep"
                            value={fornecedorForm.cep}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, cep: e.target.value })}
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="fornecedor-observacoes">Observações</Label>
                        <Textarea
                          id="fornecedor-observacoes"
                          value={fornecedorForm.observacoes}
                          onChange={(e) => setFornecedorForm({ ...fornecedorForm, observacoes: e.target.value })}
                          placeholder="Observações adicionais"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveFornecedor}>
                          {editingFornecedor ? 'Atualizar' : 'Salvar'}
                        </Button>
                        <Button variant="outline" onClick={resetFornecedorForm}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-4">Lista de Fornecedores</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>CNPJ/CPF</TableHead>
                        <TableHead>Inscrição Estadual</TableHead>
                        <TableHead>Inscrição Municipal</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fornecedores.map((fornecedor) => (
                        <TableRow key={fornecedor.id}>
                          <TableCell>{fornecedor.nome}</TableCell>
                          <TableCell>{fornecedor.email || '-'}</TableCell>
                          <TableCell>{fornecedor.telefone || '-'}</TableCell>
                          <TableCell>{fornecedor.cnpj_cpf || '-'}</TableCell>
                          <TableCell>{fornecedor.inscricao_estadual || '-'}</TableCell>
                          <TableCell>{fornecedor.inscricao_municipal || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditFornecedor(fornecedor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteFornecedor(fornecedor.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {fornecedores.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum fornecedor cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias" className="mt-6">
            <CategoriasFinanceiras />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Cadastros;