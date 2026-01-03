import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Users, FileText, ClipboardCheck, DollarSign, Plus, Pencil, X, Check, Building2, ChevronDown, ChevronRight, UserPlus, Trash2, Crown } from 'lucide-react';
import { ConvidarUsuarioModal } from '@/components/ConvidarUsuarioModal';
import { CriarEmpresaModal } from '@/components/CriarEmpresaModal';
import { useEmpresaId } from '@/hooks/use-empresa-id';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type AppRole = 'admin' | 'gestor' | 'operador';

interface UserData {
  id: string;
  nome: string;
  email: string;
  role: AppRole | null;
}

interface MenuPermission {
  id: string;
  role: AppRole;
  menu_item: string;
  can_access: boolean;
}

type FluxoPermissao = 'fiscal' | 'ordem_servico' | 'orcamento';

interface Aprovador {
  id: string;
  nome: string;
  telefone: string;
  fluxo_permissao: FluxoPermissao;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
  user_nome: string;
  user_email: string;
  user_role: AppRole | null;
}

interface EmpresaComUsuarios extends Empresa {
  usuarios: UserEmpresa[];
}

const menuItems = [
  { id: 'recebimentos', label: 'Recebimentos' },
  { id: 'analise', label: 'Análise' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'aprovados', label: 'Aprovados' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'financeiro_dashboard', label: 'Financeiro - Dashboard' },
  { id: 'financeiro_dre', label: 'Financeiro - DRE' },
  { id: 'financeiro_dfc', label: 'Financeiro - DFC' },
  { id: 'financeiro_metas', label: 'Financeiro - Metas' },
  { id: 'cadastros', label: 'Cadastros' },
];

export default function AdminPermissions() {
  const { empresaId } = useEmpresaId();
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersEmpresaAtual, setUsersEmpresaAtual] = useState<(UserData & { userEmpresaId: string; isOwner: boolean })[]>([]);
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [aprovadores, setAprovadores] = useState<Aprovador[]>([]);
  const [empresasComUsuarios, setEmpresasComUsuarios] = useState<EmpresaComUsuarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAprovadorOpen, setDialogAprovadorOpen] = useState(false);
  const [editandoAprovador, setEditandoAprovador] = useState<Aprovador | null>(null);
  const [fluxoSelecionado, setFluxoSelecionado] = useState<FluxoPermissao>('fiscal');
  const [formAprovador, setFormAprovador] = useState({
    nome: '',
    telefone: '',
    fluxo_permissao: 'fiscal' as FluxoPermissao,
    ativo: true
  });
  const [empresasExpandidas, setEmpresasExpandidas] = useState<Record<string, boolean>>({});
  const [convidarModalOpen, setConvidarModalOpen] = useState(false);
  const [criarEmpresaModalOpen, setCriarEmpresaModalOpen] = useState(false);
  const [empresaSelecionadaParaConvite, setEmpresaSelecionadaParaConvite] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [empresaId]);

  const fetchData = async () => {
    try {
      // Buscar todos os perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email');

      if (profilesError) throw profilesError;

      // Buscar roles dos usuários
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combinar dados
      const usersWithRoles = profilesData?.map(profile => ({
        ...profile,
        role: rolesData?.find(r => r.user_id === profile.id)?.role || null,
      })) || [];

      setUsers(usersWithRoles);

      // Buscar todas as permissões
      const { data: permsData, error: permsError } = await supabase
        .from('menu_permissions')
        .select('*');

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Buscar aprovadores da empresa atual
      const { data: aprovadoresData, error: aprovadoresError } = await supabase
        .from('aprovadores_fluxo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (aprovadoresError) throw aprovadoresError;
      setAprovadores((aprovadoresData || []) as Aprovador[]);

      // Buscar empresas com usuários
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('id, nome, cnpj, ativo')
        .order('nome');

      if (empresasError) throw empresasError;

      // Buscar vínculos user_empresas
      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('user_empresas')
        .select('id, user_id, empresa_id, is_owner');

      if (userEmpresasError) throw userEmpresasError;

      // Combinar empresas com seus usuários
      const empresasComUsuariosData: EmpresaComUsuarios[] = (empresasData || []).map(empresa => ({
        ...empresa,
        usuarios: (userEmpresasData || [])
          .filter(ue => ue.empresa_id === empresa.id)
          .map(ue => {
            const profile = profilesData?.find(p => p.id === ue.user_id);
            const role = rolesData?.find(r => r.user_id === ue.user_id)?.role || null;
            return {
              ...ue,
              user_nome: profile?.nome || 'Usuário não encontrado',
              user_email: profile?.email || '',
              user_role: role
            };
          })
      }));

      setEmpresasComUsuarios(empresasComUsuariosData);

      // Filtrar usuários da empresa atual
      if (empresaId) {
        const usuariosEmpresaAtualData = (userEmpresasData || [])
          .filter(ue => ue.empresa_id === empresaId)
          .map(ue => {
            const profile = profilesData?.find(p => p.id === ue.user_id);
            const role = rolesData?.find(r => r.user_id === ue.user_id)?.role || null;
            return {
              id: ue.user_id,
              nome: profile?.nome || 'Usuário não encontrado',
              email: profile?.email || '',
              role: role,
              userEmpresaId: ue.id,
              isOwner: ue.is_owner || false
            };
          });
        setUsersEmpresaAtual(usuariosEmpresaAtualData);
      } else {
        setUsersEmpresaAtual([]);
      }

      // Expandir primeira empresa por padrão
      if (empresasComUsuariosData.length > 0 && Object.keys(empresasExpandidas).length === 0) {
        setEmpresasExpandidas({ [empresasComUsuariosData[0].id]: true });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast.success('Role atualizada com sucesso');
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast.error('Erro ao atualizar role');
    }
  };

  const updatePermission = async (role: AppRole, menuItem: string, canAccess: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_permissions')
        .update({ can_access: canAccess })
        .eq('role', role)
        .eq('menu_item', menuItem);

      if (error) throw error;

      toast.success('Permissão atualizada');
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) return <Badge variant="outline">Sem Role</Badge>;
    
    const variants = {
      admin: 'default',
      gestor: 'secondary',
      operador: 'outline',
    } as const;

    return <Badge variant={variants[role]}>{role.toUpperCase()}</Badge>;
  };

  const abrirDialogAprovador = (fluxo: FluxoPermissao) => {
    setFluxoSelecionado(fluxo);
    setFormAprovador({
      nome: '',
      telefone: '',
      fluxo_permissao: fluxo,
      ativo: true
    });
    setEditandoAprovador(null);
    setDialogAprovadorOpen(true);
  };

  const editarAprovador = (aprovador: Aprovador) => {
    setEditandoAprovador(aprovador);
    setFluxoSelecionado(aprovador.fluxo_permissao);
    setFormAprovador({
      nome: aprovador.nome,
      telefone: aprovador.telefone,
      fluxo_permissao: aprovador.fluxo_permissao,
      ativo: aprovador.ativo
    });
    setDialogAprovadorOpen(true);
  };

  const salvarAprovador = async () => {
    if (!formAprovador.nome.trim() || !formAprovador.telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const telefoneRegex = /^\+\d{12,13}$/;
    if (!telefoneRegex.test(formAprovador.telefone)) {
      toast.error('Telefone inválido. Use o formato: +5519996449359');
      return;
    }

    if (!empresaId) {
      toast.error('Selecione uma empresa antes de cadastrar aprovadores');
      return;
    }

    try {
      if (editandoAprovador) {
        const { error } = await supabase
          .from('aprovadores_fluxo')
          .update({
            nome: formAprovador.nome,
            telefone: formAprovador.telefone,
            fluxo_permissao: formAprovador.fluxo_permissao,
            ativo: formAprovador.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editandoAprovador.id);

        if (error) throw error;
        toast.success('Aprovador atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('aprovadores_fluxo')
          .insert({
            nome: formAprovador.nome,
            telefone: formAprovador.telefone,
            fluxo_permissao: formAprovador.fluxo_permissao,
            ativo: formAprovador.ativo,
            empresa_id: empresaId
          });

        if (error) throw error;
        toast.success('Aprovador cadastrado com sucesso');
      }

      setDialogAprovadorOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar aprovador:', error);
      toast.error('Erro ao salvar aprovador');
    }
  };

  const toggleAtivo = async (aprovador: Aprovador) => {
    try {
      const { error } = await supabase
        .from('aprovadores_fluxo')
        .update({ ativo: !aprovador.ativo, updated_at: new Date().toISOString() })
        .eq('id', aprovador.id);

      if (error) throw error;
      
      toast.success(aprovador.ativo ? 'Aprovador desativado' : 'Aprovador ativado');
      fetchData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const toggleEmpresaExpandida = (empresaId: string) => {
    setEmpresasExpandidas(prev => ({
      ...prev,
      [empresaId]: !prev[empresaId]
    }));
  };

  const abrirConvidarModal = (empresaId?: string) => {
    setEmpresaSelecionadaParaConvite(empresaId);
    setConvidarModalOpen(true);
  };

  const removerUsuarioEmpresa = async (userEmpresaId: string, isOwner: boolean) => {
    if (isOwner) {
      toast.error('Não é possível remover o proprietário da empresa');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_empresas')
        .delete()
        .eq('id', userEmpresaId);

      if (error) throw error;

      toast.success('Usuário removido da empresa');
      fetchData();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast.error('Erro ao remover usuário');
    }
  };

  const aprovadoresFiscal = aprovadores.filter(a => a.fluxo_permissao === 'fiscal');
  const aprovadoresOrdem = aprovadores.filter(a => a.fluxo_permissao === 'ordem_servico');
  const aprovadoresOrcamento = aprovadores.filter(a => a.fluxo_permissao === 'orcamento');

  const getFluxoLabel = (fluxo: FluxoPermissao) => {
    const labels = {
      fiscal: 'Fiscal - Nota de Retorno',
      ordem_servico: 'Ordens de Serviço - Faturamento',
      orcamento: 'Orçamentos - Aprovação'
    };
    return labels[fluxo];
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gerenciamento de Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie roles, permissões, empresas e fluxo de aprovações
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Usuários e Roles</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="permissions">Permissões de Menu</TabsTrigger>
            <TabsTrigger value="approvals">Fluxo de Aprovações</TabsTrigger>
          </TabsList>

          {/* Aba: Usuários e Roles */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuários e Roles
                  </CardTitle>
                  <CardDescription>
                    Defina o papel de cada usuário da sua empresa
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEmpresaSelecionadaParaConvite(empresaId || undefined);
                  setConvidarModalOpen(true);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar Usuário
                </Button>
              </CardHeader>
              <CardContent>
                {usersEmpresaAtual.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário vinculado a esta empresa
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role Atual</TableHead>
                        <TableHead>Alterar Role</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersEmpresaAtual.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.nome}
                              {user.isOwner && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role || ''}
                              onValueChange={(value) => updateUserRole(user.id, value as AppRole)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Selecionar role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="gestor">Gestor</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={user.isOwner}
                                  title={user.isOwner ? 'Não é possível remover o proprietário' : 'Remover usuário da empresa'}
                                >
                                  <Trash2 className={`h-4 w-4 ${user.isOwner ? 'text-muted-foreground' : 'text-destructive'}`} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{user.nome}</strong> ({user.email}) desta empresa? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removerUsuarioEmpresa(user.userEmpresaId, user.isOwner)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Empresas */}
          <TabsContent value="empresas">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Empresas e Usuários
                    </CardTitle>
                    <CardDescription>
                      Gerencie empresas e seus usuários vinculados
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => abrirConvidarModal()}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                    <Button onClick={() => setCriarEmpresaModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Empresa
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {empresasComUsuarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </div>
                ) : (
                  empresasComUsuarios.map((empresa) => (
                    <Collapsible 
                      key={empresa.id}
                      open={empresasExpandidas[empresa.id]}
                      onOpenChange={() => toggleEmpresaExpandida(empresa.id)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              {empresasExpandidas[empresa.id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{empresa.nome}</p>
                                {empresa.cnpj && (
                                  <p className="text-sm text-muted-foreground">{empresa.cnpj}</p>
                                )}
                              </div>
                              <Badge variant={empresa.ativo ? 'default' : 'secondary'} className="ml-2">
                                {empresa.ativo ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {empresa.usuarios.length} usuário(s)
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirConvidarModal(empresa.id);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {empresa.usuarios.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                      Nenhum usuário vinculado
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  empresa.usuarios.map((usuario) => (
                                    <TableRow key={usuario.id}>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          {usuario.user_nome}
                                          {usuario.is_owner && (
                                            <Crown className="h-4 w-4 text-yellow-500" />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{usuario.user_email}</TableCell>
                                      <TableCell>{getRoleBadge(usuario.user_role)}</TableCell>
                                      <TableCell>
                                        <Badge variant={usuario.is_owner ? 'default' : 'outline'}>
                                          {usuario.is_owner ? 'Proprietário' : 'Membro'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => removerUsuarioEmpresa(usuario.id, usuario.is_owner)}
                                          disabled={usuario.is_owner}
                                          title={usuario.is_owner ? 'Não é possível remover o proprietário' : 'Remover usuário da empresa'}
                                        >
                                          <Trash2 className={`h-4 w-4 ${usuario.is_owner ? 'text-muted-foreground' : 'text-destructive'}`} />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Permissões de Menu */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Permissões de Acesso por Role</CardTitle>
                <CardDescription>
                  Configure quais menus cada role pode acessar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                      <TableHead className="text-center">Gestor</TableHead>
                      <TableHead className="text-center">Operador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        {(['admin', 'gestor', 'operador'] as AppRole[]).map((role) => {
                          const permission = permissions.find(
                            (p) => p.role === role && p.menu_item === item.id
                          );
                          const isChecked = permission?.can_access ?? false;

                          return (
                            <TableCell key={role} className="text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) =>
                                  updatePermission(role, item.id, checked as boolean)
                                }
                                disabled={role === 'admin' && item.id === 'admin_permissions'}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Fluxo de Aprovações */}
          <TabsContent value="approvals" className="space-y-6">
            {/* Card 1: Fiscal - Nota de Retorno */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Fiscal - Nota de Retorno
                    </CardTitle>
                    <CardDescription>
                      Aprovadores que receberão notificações sobre notas de retorno
                    </CardDescription>
                  </div>
                  <Button onClick={() => abrirDialogAprovador('fiscal')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aprovador
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aprovadoresFiscal.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum aprovador cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      aprovadoresFiscal.map(aprovador => (
                        <TableRow key={aprovador.id}>
                          <TableCell className="font-medium">{aprovador.nome}</TableCell>
                          <TableCell>{aprovador.telefone}</TableCell>
                          <TableCell>
                            <Badge variant={aprovador.ativo ? 'default' : 'secondary'}>
                              {aprovador.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => editarAprovador(aprovador)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleAtivo(aprovador)}>
                              {aprovador.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Card 2: Ordens de Serviço - Faturamento */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Ordens de Serviço - Faturamento
                    </CardTitle>
                    <CardDescription>
                      Aprovadores que receberão notificações sobre ordens finalizadas para faturamento
                    </CardDescription>
                  </div>
                  <Button onClick={() => abrirDialogAprovador('ordem_servico')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aprovador
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aprovadoresOrdem.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum aprovador cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      aprovadoresOrdem.map(aprovador => (
                        <TableRow key={aprovador.id}>
                          <TableCell className="font-medium">{aprovador.nome}</TableCell>
                          <TableCell>{aprovador.telefone}</TableCell>
                          <TableCell>
                            <Badge variant={aprovador.ativo ? 'default' : 'secondary'}>
                              {aprovador.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => editarAprovador(aprovador)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleAtivo(aprovador)}>
                              {aprovador.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Card 3: Orçamentos - Aprovação */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Orçamentos - Aprovação
                    </CardTitle>
                    <CardDescription>
                      Aprovadores que receberão notificações sobre orçamentos aprovados
                    </CardDescription>
                  </div>
                  <Button onClick={() => abrirDialogAprovador('orcamento')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aprovador
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aprovadoresOrcamento.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum aprovador cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      aprovadoresOrcamento.map(aprovador => (
                        <TableRow key={aprovador.id}>
                          <TableCell className="font-medium">{aprovador.nome}</TableCell>
                          <TableCell>{aprovador.telefone}</TableCell>
                          <TableCell>
                            <Badge variant={aprovador.ativo ? 'default' : 'secondary'}>
                              {aprovador.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => editarAprovador(aprovador)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleAtivo(aprovador)}>
                              {aprovador.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Cadastro/Edição de Aprovador */}
        <Dialog open={dialogAprovadorOpen} onOpenChange={setDialogAprovadorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editandoAprovador ? 'Editar Aprovador' : 'Novo Aprovador'}
              </DialogTitle>
              <DialogDescription>
                {getFluxoLabel(fluxoSelecionado)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={formAprovador.nome}
                  onChange={(e) => setFormAprovador({...formAprovador, nome: e.target.value})}
                  placeholder="Ex: Leonardo"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone (WhatsApp)</Label>
                <Input 
                  value={formAprovador.telefone}
                  onChange={(e) => setFormAprovador({...formAprovador, telefone: e.target.value})}
                  placeholder="Ex: +5519996449359"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: +55 (DDD) 9XXXX-XXXX
                </p>
              </div>

              <div className="space-y-2">
                <Label>Fluxo de Permissão</Label>
                <Select 
                  value={formAprovador.fluxo_permissao}
                  onValueChange={(value) => setFormAprovador({...formAprovador, fluxo_permissao: value as FluxoPermissao})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiscal">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Fiscal - Nota de Retorno
                      </div>
                    </SelectItem>
                    <SelectItem value="ordem_servico">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Ordens de Serviço - Faturamento
                      </div>
                    </SelectItem>
                    <SelectItem value="orcamento">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Orçamentos - Aprovação
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ativo"
                  checked={formAprovador.ativo}
                  onCheckedChange={(checked) => setFormAprovador({...formAprovador, ativo: checked as boolean})}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAprovadorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarAprovador}>
                {editandoAprovador ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Convidar Usuário */}
        <ConvidarUsuarioModal 
          open={convidarModalOpen}
          onOpenChange={setConvidarModalOpen}
          empresaId={empresaSelecionadaParaConvite}
          onSuccess={fetchData}
        />

        {/* Modal de Criar Empresa */}
        <CriarEmpresaModal 
          open={criarEmpresaModalOpen}
          onOpenChange={setCriarEmpresaModalOpen}
          onSuccess={fetchData}
        />
      </div>
    </AppLayout>
  );
}
