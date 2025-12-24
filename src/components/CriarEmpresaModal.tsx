import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
}

interface CriarEmpresaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CriarEmpresaModal({ open, onOpenChange, onSuccess }: CriarEmpresaModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    razao_social: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    owner_id: ''
  });

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .order('nome');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error('O nome da empresa é obrigatório');
      return;
    }

    if (!form.owner_id) {
      toast.error('Selecione o proprietário da empresa');
      return;
    }

    setLoading(true);
    try {
      // Criar a empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: form.nome,
          razao_social: form.razao_social || null,
          cnpj: form.cnpj || null,
          email: form.email || null,
          telefone: form.telefone || null,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
          cep: form.cep || null,
          ativo: true
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // Vincular o owner à empresa
      const { error: vinculoError } = await supabase
        .from('user_empresas')
        .insert({
          user_id: form.owner_id,
          empresa_id: empresaData.id,
          is_owner: true
        });

      if (vinculoError) throw vinculoError;

      toast.success('Empresa criada com sucesso');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      toast.error('Erro ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      nome: '',
      razao_social: '',
      cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      owner_id: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nova Empresa
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da nova empresa
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Nome da Empresa *</Label>
            <Input 
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome fantasia"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Razão Social</Label>
            <Input 
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              placeholder="Razão social completa"
            />
          </div>

          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input 
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input 
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>CEP</Label>
            <Input 
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
              placeholder="00000-000"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Endereço</Label>
            <Input 
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input 
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Cidade"
            />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Input 
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              placeholder="UF"
              maxLength={2}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Proprietário (Owner) *</Label>
            <Select value={form.owner_id} onValueChange={(value) => setForm({ ...form, owner_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o proprietário" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex flex-col">
                      <span>{profile.nome}</span>
                      <span className="text-xs text-muted-foreground">{profile.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O proprietário terá acesso total à empresa e poderá gerenciar usuários.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Empresa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
