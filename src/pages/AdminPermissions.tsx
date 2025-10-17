import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Users } from 'lucide-react';

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
  const [users, setUsers] = useState<UserData[]>([]);
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      // Verificar se já existe uma role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Atualizar role existente
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Inserir nova role
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
            Gerencie roles e permissões de acesso dos usuários
          </p>
        </div>

        {/* Gerenciamento de Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários e Roles
            </CardTitle>
            <CardDescription>
              Defina o papel de cada usuário no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role Atual</TableHead>
                  <TableHead>Alterar Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Permissões por Role */}
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
      </div>
    </AppLayout>
  );
}
