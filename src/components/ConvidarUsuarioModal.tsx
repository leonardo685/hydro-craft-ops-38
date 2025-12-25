import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Copy, Trash2, UserPlus, Clock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Convite {
  id: string;
  token: string;
  email: string | null;
  role: 'admin' | 'gestor' | 'operador';
  expires_at: string;
  created_at: string;
}

interface ConvidarUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSuccess?: () => void;
}

export function ConvidarUsuarioModal({ open, onOpenChange, empresaId, onSuccess }: ConvidarUsuarioModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'gestor' | 'operador'>('operador');
  const [convites, setConvites] = useState<Convite[]>([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [loadingConvites, setLoadingConvites] = useState(false);

  useEffect(() => {
    if (open && empresaId) {
      fetchConvites();
      setGeneratedLink('');
      setEmail('');
      setRole('operador');
    }
  }, [open, empresaId]);

  const fetchConvites = async () => {
    setLoadingConvites(true);
    try {
      const { data, error } = await supabase
        .from('convites_empresa')
        .select('id, token, email, role, expires_at, created_at')
        .eq('empresa_id', empresaId)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConvites(data || []);
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
    } finally {
      setLoadingConvites(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('convites_empresa')
        .insert({
          empresa_id: empresaId,
          email: email.trim() || null,
          role: role,
          created_by: user.id
        })
        .select('token')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/convite/${data.token}`;
      setGeneratedLink(link);
      
      // Copiar automaticamente
      await navigator.clipboard.writeText(link);
      toast.success('Link gerado e copiado para a área de transferência!');
      
      // Atualizar lista de convites
      fetchConvites();
      
      // Limpar campos
      setEmail('');
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao gerar convite:', error);
      toast.error('Erro ao gerar link de convite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/convite/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleDeleteConvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('convites_empresa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Convite cancelado');
      fetchConvites();
    } catch (error) {
      console.error('Erro ao deletar convite:', error);
      toast.error('Erro ao cancelar convite');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gestor': return 'Gestor';
      case 'operador': return 'Operador';
      default: return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Gere um link de convite para adicionar um novo usuário à empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário para gerar novo convite */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="email">Email do convidado (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se informado, apenas este email poderá usar o convite
              </p>
            </div>

            <div className="space-y-2">
              <Label>Função do usuário</Label>
              <Select value={role} onValueChange={(value: 'admin' | 'gestor' | 'operador') => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador - Acesso total</SelectItem>
                  <SelectItem value="gestor">Gestor - Gerencia operações</SelectItem>
                  <SelectItem value="operador">Operador - Acesso básico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
              <Link2 className="h-4 w-4 mr-2" />
              {loading ? 'Gerando...' : 'Gerar Link de Convite'}
            </Button>
          </div>

          {/* Link gerado */}
          {generatedLink && (
            <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
              <Label className="text-primary">Link gerado:</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="text-sm"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Compartilhe este link com o usuário. Válido por 7 dias.
              </p>
            </div>
          )}

          {/* Lista de convites pendentes */}
          {convites.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Convites pendentes</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {convites.map((convite) => (
                  <div 
                    key={convite.id} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {convite.email ? (
                          <span className="text-sm truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {convite.email}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Qualquer email
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {getRoleLabel(convite.role)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        Expira em {format(new Date(convite.expires_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyLink(convite.token)}
                        title="Copiar link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteConvite(convite.id)}
                        title="Cancelar convite"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingConvites && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Carregando convites...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
