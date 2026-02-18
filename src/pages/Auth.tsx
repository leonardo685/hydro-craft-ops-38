import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import fixzysLogo from '@/assets/hydrofix-logo.png';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Building2, Loader2, CheckCircle2, Ticket, ArrowLeft, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});


interface ConviteData {
  id: string;
  empresa_id: string;
  role: string;
  email: string | null;
  empresa: {
    nome: string;
  };
}

export default function Auth() {
  const { signIn, signUp, user, refetchUserRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Estados para recuperação de senha
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Estados para fluxo de convite
  const [tokenInput, setTokenInput] = useState('');
  const [verificandoConvite, setVerificandoConvite] = useState(false);
  const [convite, setConvite] = useState<ConviteData | null>(null);
  const [conviteSuccess, setConviteSuccess] = useState(false);
  const [conviteForm, setConviteForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  
  const redirectTo = (location.state as { from?: string })?.from || '/';

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  // Verificar se há token na URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setTokenInput(tokenFromUrl);
      setActiveTab('convite');
      verificarConvite(tokenFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  const verificarConvite = async (token: string) => {
    if (!token.trim()) {
      toast.error('Por favor, insira o código do convite');
      return;
    }

    setVerificandoConvite(true);
    setConvite(null);

    try {
      const { data, error } = await supabase
        .from('convites_empresa')
        .select(`
          id,
          empresa_id,
          role,
          email,
          empresa:empresas(nome)
        `)
        .eq('token', token.trim())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error('Convite inválido, expirado ou já utilizado.');
        return;
      }

      const conviteData: ConviteData = {
        ...data,
        empresa: Array.isArray(data.empresa) ? data.empresa[0] : data.empresa
      };

      setConvite(conviteData);
      
      if (conviteData.email) {
        setConviteForm(prev => ({ ...prev, email: conviteData.email! }));
      }

      toast.success('Convite válido! Preencha seus dados.');
    } catch (err) {
      console.error('Erro ao verificar convite:', err);
      toast.error('Erro ao verificar convite. Tente novamente.');
    } finally {
      setVerificandoConvite(false);
    }
  };

  const handleConviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!convite) return;

    if (conviteForm.senha !== conviteForm.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (conviteForm.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: conviteForm.email,
        password: conviteForm.senha,
        options: {
          data: {
            nome: conviteForm.nome
          },
          emailRedirectTo: `${window.location.origin}/`
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

      // 2. Chamar edge function para vincular usuário (usa service_role para bypass RLS)
      const { data: aceitarData, error: aceitarError } = await supabase.functions.invoke('aceitar-convite', {
        body: {
          user_id: authData.user.id,
          convite_id: convite.id,
          empresa_id: convite.empresa_id,
          role: convite.role
        }
      });

      if (aceitarError) {
        console.error('Erro ao aceitar convite:', aceitarError);
        toast.error('Erro ao vincular conta. Entre em contato com o administrador.');
        return;
      }

      if (aceitarData?.error) {
        console.error('Erro retornado pela edge function:', aceitarData.error);
        toast.error(aceitarData.error);
        return;
      }

      // 3. Recarregar a role do usuário após vincular
      await refetchUserRole();

      setConviteSuccess(true);
      toast.success('Conta criada com sucesso!');

    } catch (err) {
      console.error('Erro ao criar conta:', err);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    const { error } = await signIn(values.email, values.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
      toast.error('Erro ao fazer login: ' + error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate(redirectTo);
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Por favor, insira seu email');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Erro ao enviar email: ' + error.message);
        return;
      }

      setResetSuccess(true);
      toast.success('Email de recuperação enviado!');
    } catch (err) {
      console.error('Erro ao enviar email de recuperação:', err);
      toast.error('Erro ao enviar email. Tente novamente.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetPasswordOpen(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  const resetConvite = () => {
    setConvite(null);
    setConviteSuccess(false);
    setTokenInput('');
    setConviteForm({ nome: '', email: '', senha: '', confirmarSenha: '' });
  };

  // Tela de sucesso do convite
  if (conviteSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md shadow-elegant">
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
              onClick={() => {
                resetConvite();
                setActiveTab('login');
              }}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={fixzysLogo} alt="FixZys Logo" className="h-16 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl">FixZys</CardTitle>
            <CardDescription>Sistema de Gestão</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="convite" className="flex items-center gap-1">
                <Ticket className="h-3 w-3" />
                Convite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>


            <TabsContent value="convite">
              {!convite ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token">Código do Convite</Label>
                    <Input
                      id="token"
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Cole o código do convite aqui"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole o token do convite que você recebeu
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => verificarConvite(tokenInput)}
                    disabled={verificandoConvite || !tokenInput.trim()}
                  >
                    {verificandoConvite ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar Convite'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg border">
                    <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Você foi convidado para fazer parte de
                    </p>
                    <p className="font-semibold text-foreground">
                      {convite.empresa?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Função: {convite.role}
                    </p>
                  </div>

                  <form onSubmit={handleConviteSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="convite-nome">Nome completo</Label>
                      <Input
                        id="convite-nome"
                        type="text"
                        required
                        value={conviteForm.nome}
                        onChange={(e) => setConviteForm({ ...conviteForm, nome: e.target.value })}
                        placeholder="Seu nome"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="convite-email">Email</Label>
                      <Input
                        id="convite-email"
                        type="email"
                        required
                        value={conviteForm.email}
                        onChange={(e) => setConviteForm({ ...conviteForm, email: e.target.value })}
                        placeholder="seu@email.com"
                        disabled={!!convite.email}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="convite-senha">Senha</Label>
                      <Input
                        id="convite-senha"
                        type="password"
                        required
                        value={conviteForm.senha}
                        onChange={(e) => setConviteForm({ ...conviteForm, senha: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="convite-confirmar">Confirmar senha</Label>
                      <Input
                        id="convite-confirmar"
                        type="password"
                        required
                        value={conviteForm.confirmarSenha}
                        onChange={(e) => setConviteForm({ ...conviteForm, confirmarSenha: e.target.value })}
                        placeholder="Repita a senha"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar conta'
                      )}
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full"
                      onClick={resetConvite}
                    >
                      Usar outro convite
                    </Button>
                  </form>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Recuperação de Senha */}
      <Dialog open={resetPasswordOpen} onOpenChange={closeResetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recuperar Senha
            </DialogTitle>
            <DialogDescription>
              {resetSuccess 
                ? 'Verifique sua caixa de entrada para redefinir sua senha.'
                : 'Digite seu email para receber um link de recuperação de senha.'
              }
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Enviamos um email para <strong>{resetEmail}</strong> com instruções para redefinir sua senha.
              </p>
              <Button className="w-full" onClick={closeResetModal}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeResetModal}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={resetLoading}>
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}