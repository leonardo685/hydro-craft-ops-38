import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
}

interface Empresa {
  id: string;
  nome: string;
}

interface ConvidarUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId?: string;
  onSuccess?: () => void;
}

export function ConvidarUsuarioModal({ open, onOpenChange, empresaId, onSuccess }: ConvidarUsuarioModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(empresaId || '');
  const [isOwner, setIsOwner] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, selectedEmpresaId]);

  useEffect(() => {
    if (empresaId) {
      setSelectedEmpresaId(empresaId);
    }
  }, [empresaId]);

  const fetchData = async () => {
    try {
      // Buscar todos os perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .order('nome');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Buscar empresas (para admins)
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (empresasError) throw empresasError;
      setEmpresas(empresasData || []);

      // Buscar usuários já vinculados à empresa selecionada
      if (selectedEmpresaId) {
        const { data: userEmpresasData, error: userEmpresasError } = await supabase
          .from('user_empresas')
          .select('user_id')
          .eq('empresa_id', selectedEmpresaId);

        if (userEmpresasError) throw userEmpresasError;
        setExistingUsers(userEmpresasData?.map(ue => ue.user_id) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedEmpresaId) {
      toast.error('Selecione o usuário e a empresa');
      return;
    }

    // Verificar se já existe vínculo
    if (existingUsers.includes(selectedUserId)) {
      toast.error('Este usuário já está vinculado a esta empresa');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_empresas')
        .insert({
          user_id: selectedUserId,
          empresa_id: selectedEmpresaId,
          is_owner: isOwner
        });

      if (error) throw error;

      toast.success('Usuário adicionado à empresa com sucesso');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao convidar usuário:', error);
      if (error.code === '23505') {
        toast.error('Este usuário já está vinculado a esta empresa');
      } else {
        toast.error('Erro ao adicionar usuário');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedEmpresaId(empresaId || '');
    setIsOwner(false);
  };

  // Filtrar usuários que não estão na empresa selecionada
  const availableProfiles = profiles.filter(p => !existingUsers.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Usuário à Empresa
          </DialogTitle>
          <DialogDescription>
            Selecione um usuário para vincular à empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!empresaId && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select 
                value={selectedEmpresaId} 
                onValueChange={(value) => {
                  setSelectedEmpresaId(value);
                  setSelectedUserId(''); // Reset user selection when company changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
              disabled={!selectedEmpresaId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Todos os usuários já estão vinculados
                  </div>
                ) : (
                  availableProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex flex-col">
                        <span>{profile.nome}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isOwner"
              checked={isOwner}
              onCheckedChange={(checked) => setIsOwner(checked as boolean)}
            />
            <Label htmlFor="isOwner" className="cursor-pointer">
              Definir como proprietário (Owner)
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            Proprietários podem editar as configurações da empresa e gerenciar usuários.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedUserId || !selectedEmpresaId}>
            {loading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
