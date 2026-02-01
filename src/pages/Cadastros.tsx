import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui/table";
import { Plus, Users, Building, Tag, Edit, Trash2, AlertTriangle } from "lucide-react";
import { CategoriasFinanceiras } from "@/components/CategoriasFinanceiras";
import { ContasBancarias } from "@/components/ContasBancarias";
import { IdentificacaoInput, TipoIdentificacao, getLabels, formatTelefoneBR, formatTelefoneUS, formatCEP, formatZIPCode } from "@/components/IdentificacaoInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useEmpresa } from "@/contexts/EmpresaContext";

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
  tipo_identificacao?: string;
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
  tipo_identificacao?: string;
}

const Cadastros = () => {
  const location = useLocation();
  const { limparTodosLancamentos } = useLancamentosFinanceiros();
  const { empresaAtual } = useEmpresa();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmDeleteOrdensOpen, setIsConfirmDeleteOrdensOpen] = useState(false);

  // Tipo de identificação para os formulários
  const [clienteTipoId, setClienteTipoId] = useState<TipoIdentificacao>('cnpj');
  const [fornecedorTipoId, setFornecedorTipoId] = useState<TipoIdentificacao>('cnpj');

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
    
    if (location.state?.autoFill && location.state?.clienteData) {
      const clienteData = location.state.clienteData;
      setClienteForm(prev => ({
        ...prev,
        cnpj_cpf: clienteData.cnpj_cpf || '',
        nome: clienteData.nome || ''
      }));
      setShowClienteForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadClientes = async () => {
    if (!empresaAtual?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaAtual.id)
        .order('nome');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadFornecedores = async () => {
    if (!empresaAtual?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', empresaAtual.id)
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
    setClienteTipoId('cnpj');
    setEditingCliente(null);
    setShowClienteForm(false);
  };

  const handleClienteDataFetch = (data: any) => {
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
    setFornecedorTipoId('cnpj');
    setEditingFornecedor(null);
    setShowFornecedorForm(false);
  };

  const handleFornecedorDataFetch = (data: any) => {
    setFornecedorForm({
      ...fornecedorForm,
      ...data
    });
  };

  // Handlers para formatação dinâmica
  const handleClienteTelefoneChange = (value: string) => {
    const formatted = clienteTipoId === 'cnpj' ? formatTelefoneBR(value) : formatTelefoneUS(value);
    setClienteForm({ ...clienteForm, telefone: formatted });
  };

  const handleClienteCepChange = (value: string) => {
    const formatted = clienteTipoId === 'cnpj' ? formatCEP(value) : formatZIPCode(value);
    setClienteForm({ ...clienteForm, cep: formatted });
  };

  const handleFornecedorTelefoneChange = (value: string) => {
    const formatted = fornecedorTipoId === 'cnpj' ? formatTelefoneBR(value) : formatTelefoneUS(value);
    setFornecedorForm({ ...fornecedorForm, telefone: formatted });
  };

  const handleFornecedorCepChange = (value: string) => {
    const formatted = fornecedorTipoId === 'cnpj' ? formatCEP(value) : formatZIPCode(value);
    setFornecedorForm({ ...fornecedorForm, cep: formatted });
  };

  const limparTodasOrdens = async () => {
    try {
      const { error: fotosOrcError } = await supabase
        .from('fotos_orcamento')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (fotosOrcError) throw fotosOrcError;

      const { error: itensOrcError } = await supabase
        .from('itens_orcamento')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (itensOrcError) throw itensOrcError;

      const { error: contasRecError } = await supabase
        .from('contas_receber')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (contasRecError) throw contasRecError;

      const { error: orcamentosError } = await supabase
        .from('orcamentos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (orcamentosError) throw orcamentosError;

      const { error: testesError } = await supabase
        .from('testes_equipamentos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (testesError) throw testesError;

      const { error: ordensError } = await supabase
        .from('ordens_servico')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (ordensError) throw ordensError;

      const { error: fotosError } = await supabase
        .from('fotos_equipamentos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (fotosError) throw fotosError;

      const { error: itensNFeError } = await supabase
        .from('itens_nfe')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (itensNFeError) throw itensNFeError;

      const { error: recebimentosError } = await supabase
        .from('recebimentos')
        .delete()
        .neq('id', 0);
      if (recebimentosError) throw recebimentosError;

      const { error: notasError } = await supabase
        .from('notas_fiscais')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (notasError) throw notasError;

      const anoAbreviado = new Date().getFullYear().toString().slice(-2);
      const { error: placeholderError } = await supabase
        .from('recebimentos')
        .insert([{
          numero_ordem: `MH-011-${anoAbreviado}`,
          cliente_nome: 'PLACEHOLDER - NÃO USAR',
          tipo_equipamento: 'PLACEHOLDER',
          data_entrada: new Date().toISOString(),
          urgente: false,
          na_empresa: false,
          status: 'placeholder',
          empresa_id: empresaAtual?.id
        }]);
      if (placeholderError) throw placeholderError;

      toast.success("Todos os dados de ordens foram removidos. Próxima ordem: MH-012-25");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Erro ao limpar ordens:', error);
      toast.error("Erro ao limpar dados de ordens");
    }
  };

  const handleSaveCliente = async () => {
    if (!clienteForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const dataToSave = {
        ...clienteForm,
        tipo_identificacao: clienteTipoId
      };

      if (editingCliente) {
        const { error } = await supabase
          .from('clientes')
          .update(dataToSave as any)
          .eq('id', editingCliente.id);
        
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([{ ...dataToSave, empresa_id: empresaAtual?.id } as any]);
        
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
      const dataToSave = {
        ...fornecedorForm,
        tipo_identificacao: fornecedorTipoId
      };

      if (editingFornecedor) {
        const { error } = await supabase
          .from('fornecedores')
          .update(dataToSave as any)
          .eq('id', editingFornecedor.id);
        
        if (error) throw error;
        toast.success('Fornecedor atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('fornecedores')
          .insert([{ ...dataToSave, empresa_id: empresaAtual?.id } as any]);
        
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
    setClienteTipoId((cliente.tipo_identificacao as TipoIdentificacao) || 'cnpj');
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
    setFornecedorTipoId((fornecedor.tipo_identificacao as TipoIdentificacao) || 'cnpj');
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

  // Labels dinâmicos
  const clienteLabels = getLabels(clienteTipoId);
  const fornecedorLabels = getLabels(fornecedorTipoId);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie clientes, fornecedores e categorias financeiras</p>
        </div>

        <Tabs defaultValue={location.state?.activeTab || "clientes"} className="w-full">
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
              Financeiro
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
                      {/* Componente de Identificação com seletor Brasil/EUA */}
                      <IdentificacaoInput
                        tipoIdentificacao={clienteTipoId}
                        onTipoChange={(tipo) => {
                          setClienteTipoId(tipo);
                          // Limpa campos que mudam de formato
                          setClienteForm({
                            ...clienteForm,
                            cnpj_cpf: '',
                            telefone: '',
                            cep: ''
                          });
                        }}
                        value={clienteForm.cnpj_cpf}
                        onChange={(value) => setClienteForm({ ...clienteForm, cnpj_cpf: value })}
                        onDataFetch={handleClienteDataFetch}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            onChange={(e) => handleClienteTelefoneChange(e.target.value)}
                            placeholder={clienteLabels.placeholderTelefone}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inscricao_estadual">{clienteLabels.inscricaoEstadual}</Label>
                          <Input
                            id="inscricao_estadual"
                            value={clienteForm.inscricao_estadual}
                            onChange={(e) => setClienteForm({ ...clienteForm, inscricao_estadual: e.target.value })}
                            placeholder={clienteTipoId === 'cnpj' ? "123.456.789.000" : "State Tax ID"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inscricao_municipal">{clienteLabels.inscricaoMunicipal}</Label>
                          <Input
                            id="inscricao_municipal"
                            value={clienteForm.inscricao_municipal}
                            onChange={(e) => setClienteForm({ ...clienteForm, inscricao_municipal: e.target.value })}
                            placeholder={clienteTipoId === 'cnpj' ? "12345678" : "City Tax ID"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endereco">{clienteLabels.endereco}</Label>
                          <Input
                            id="endereco"
                            value={clienteForm.endereco}
                            onChange={(e) => setClienteForm({ ...clienteForm, endereco: e.target.value })}
                            placeholder={clienteLabels.placeholderEndereco}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cidade">{clienteLabels.cidade}</Label>
                          <Input
                            id="cidade"
                            value={clienteForm.cidade}
                            onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })}
                            placeholder={clienteTipoId === 'cnpj' ? "São Paulo" : "New York"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="estado">{clienteLabels.estado}</Label>
                          <Input
                            id="estado"
                            value={clienteForm.estado}
                            onChange={(e) => setClienteForm({ ...clienteForm, estado: e.target.value.toUpperCase().slice(0, 2) })}
                            placeholder={clienteLabels.placeholderEstado}
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cep">{clienteLabels.codigoPostal}</Label>
                          <Input
                            id="cep"
                            value={clienteForm.cep}
                            onChange={(e) => handleClienteCepChange(e.target.value)}
                            placeholder={clienteLabels.placeholderCodigoPostal}
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
                        <TableHead>CNPJ/EIN</TableHead>
                        <TableHead>País</TableHead>
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
                          <TableCell>
                            {cliente.tipo_identificacao === 'ein' ? '🇺🇸 EUA' : '🇧🇷 Brasil'}
                          </TableCell>
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                      {/* Componente de Identificação com seletor Brasil/EUA */}
                      <IdentificacaoInput
                        tipoIdentificacao={fornecedorTipoId}
                        onTipoChange={(tipo) => {
                          setFornecedorTipoId(tipo);
                          setFornecedorForm({
                            ...fornecedorForm,
                            cnpj_cpf: '',
                            telefone: '',
                            cep: ''
                          });
                        }}
                        value={fornecedorForm.cnpj_cpf}
                        onChange={(value) => setFornecedorForm({ ...fornecedorForm, cnpj_cpf: value })}
                        onDataFetch={handleFornecedorDataFetch}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            onChange={(e) => handleFornecedorTelefoneChange(e.target.value)}
                            placeholder={fornecedorLabels.placeholderTelefone}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-inscricao_estadual">{fornecedorLabels.inscricaoEstadual}</Label>
                          <Input
                            id="fornecedor-inscricao_estadual"
                            value={fornecedorForm.inscricao_estadual}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, inscricao_estadual: e.target.value })}
                            placeholder={fornecedorTipoId === 'cnpj' ? "123.456.789.000" : "State Tax ID"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-inscricao_municipal">{fornecedorLabels.inscricaoMunicipal}</Label>
                          <Input
                            id="fornecedor-inscricao_municipal"
                            value={fornecedorForm.inscricao_municipal}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, inscricao_municipal: e.target.value })}
                            placeholder={fornecedorTipoId === 'cnpj' ? "12345678" : "City Tax ID"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-endereco">{fornecedorLabels.endereco}</Label>
                          <Input
                            id="fornecedor-endereco"
                            value={fornecedorForm.endereco}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })}
                            placeholder={fornecedorLabels.placeholderEndereco}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-cidade">{fornecedorLabels.cidade}</Label>
                          <Input
                            id="fornecedor-cidade"
                            value={fornecedorForm.cidade}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, cidade: e.target.value })}
                            placeholder={fornecedorTipoId === 'cnpj' ? "São Paulo" : "New York"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-estado">{fornecedorLabels.estado}</Label>
                          <Input
                            id="fornecedor-estado"
                            value={fornecedorForm.estado}
                            onChange={(e) => setFornecedorForm({ ...fornecedorForm, estado: e.target.value.toUpperCase().slice(0, 2) })}
                            placeholder={fornecedorLabels.placeholderEstado}
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fornecedor-cep">{fornecedorLabels.codigoPostal}</Label>
                          <Input
                            id="fornecedor-cep"
                            value={fornecedorForm.cep}
                            onChange={(e) => handleFornecedorCepChange(e.target.value)}
                            placeholder={fornecedorLabels.placeholderCodigoPostal}
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
                        <TableHead>CNPJ/EIN</TableHead>
                        <TableHead>País</TableHead>
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
                          <TableCell>
                            {fornecedor.tipo_identificacao === 'ein' ? '🇺🇸 EUA' : '🇧🇷 Brasil'}
                          </TableCell>
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
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

          <TabsContent value="categorias" className="mt-6 space-y-6">
            <CategoriasFinanceiras />
            <ContasBancarias />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis que afetam todos os dados financeiros
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="destructive" 
                  onClick={() => setIsConfirmDeleteOpen(true)}
                >
                  Limpar Todos os Lançamentos Financeiros
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsConfirmDeleteOrdensOpen(true)}
                  className="w-full"
                >
                  Limpar Todas as Ordens e Notas Fiscais
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmação - Lançamentos */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão de Todos os Lançamentos</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja limpar TODOS os lançamentos financeiros? 
                Esta ação é irreversível e todos os dados de entrada, saída, despesas e receitas serão permanentemente removidos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  limparTodosLancamentos();
                  setIsConfirmDeleteOpen(false);
                }}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação - Ordens */}
        <Dialog open={isConfirmDeleteOrdensOpen} onOpenChange={setIsConfirmDeleteOrdensOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão de Todas as Ordens</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja limpar TODAS as ordens de serviço, recebimentos, notas fiscais, análises, orçamentos e faturamentos? 
                Esta ação é irreversível e todos os dados serão permanentemente removidos.
                <br /><br />
                A próxima ordem será iniciada em <strong>MH-012-25</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsConfirmDeleteOrdensOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  limparTodasOrdens();
                  setIsConfirmDeleteOrdensOpen(false);
                }}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Cadastros;
