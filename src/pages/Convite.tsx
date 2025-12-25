import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConviteData {
  id: string;
  empresa_id: string;
  role: string;
  email: string | null;
  expires_at: string;
  empresa: {
    nome: string;
  };
}

export default function Convite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [convite, setConvite] = useState<ConviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });

  useEffect(() => {
    if (token) {
      verificarConvite();
    }
  }, [token]);

  const verificarConvite = async () => {
    try {
      const { data, error } = await supabase
        .from('convites_empresa')
        .select(`
          id,
          empresa_id,
          role,
          email,
          expires_at,
          empresa:empresas(nome)
        `)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Convite inválido, expirado ou já utilizado.');
        return;
      }

      const conviteData: ConviteData = {
        ...data,
        empresa: Array.isArray(data.empresa) ? data.empresa[0] : data.empresa
      };

      setConvite(conviteData);
      
      // Se o convite tem email específico, preencher
      if (conviteData.email) {
        setForm(prev => ({ ...prev, email: conviteData.email! }));
      }
    } catch (err) {
      console.error('Erro ao verificar convite:', err);
      setError('Erro ao verificar convite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!convite) return;

    if (form.senha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (form.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: {
            nome: form.nome
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado. Faça login na sua conta.');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário');
        return;
      }

      // 2. Vincular usuário à empresa
      const { error: vinculoError } = await supabase
        .from('user_empresas')
        .insert({
          user_id: authData.user.id,
          empresa_id: convite.empresa_id,
          is_owner: false
        });

      if (vinculoError) {
        console.error('Erro ao vincular usuário à empresa:', vinculoError);
        // Não impede o sucesso, o trigger handle_new_user pode ter criado
      }

      // 3. Atribuir role ao usuário
      const roleToInsert: { user_id: string; role: 'admin' | 'gestor' | 'operador' } = {
        user_id: authData.user.id,
        role: convite.role as 'admin' | 'gestor' | 'operador'
      };
      
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert(roleToInsert);

      if (roleError) {
        console.error('Erro ao atribuir role:', roleError);
      }

      // 4. Marcar convite como usado
      const { error: updateError } = await supabase
        .from('convites_empresa')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by: authData.user.id
        })
        .eq('id', convite.id);

      if (updateError) {
        console.error('Erro ao marcar convite como usado:', updateError);
      }

      setSuccess(true);
      toast.success('Conta criada com sucesso!');

      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        navigate('/auth');
      }, 3000);

    } catch (err) {
      console.error('Erro ao criar conta:', err);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Conta Criada!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Verifique seu email para confirmar o cadastro e depois faça login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>
            Você foi convidado para fazer parte de{' '}
            <span className="font-semibold text-foreground">
              {convite?.empresa?.nome}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                disabled={!!convite?.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                required
                value={form.confirmarSenha}
                onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
                placeholder="Repita a senha"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => navigate('/auth')}
              >
                Faça login
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
