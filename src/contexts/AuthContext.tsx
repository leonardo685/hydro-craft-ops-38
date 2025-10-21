import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type AppRole = 'admin' | 'gestor' | 'operador';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (menuItem: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const fetchUserRoleAndPermissions = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] 🔍 Iniciando busca de role e permissões para userId:', userId);
      
      // Buscar role do usuário - CONVERSÃO EXPLÍCITA PARA TEXT
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role::text')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('[AuthContext] 📦 Raw roleData retornado:', roleData);
      console.log('[AuthContext] ❌ roleError:', roleError);

      if (roleError) {
        console.error('[AuthContext] ❌ ERRO ao buscar role:', roleError);
        setUserRole(null);
        setMenuPermissions({});
        setLoading(false);
        return;
      }

      if (!roleData || !roleData.role) {
        console.warn('[AuthContext] ⚠️ Nenhum role encontrado na tabela user_roles para userId:', userId);
        setUserRole(null);
        setMenuPermissions({});
        setLoading(false);
        return;
      }

      // Converter o role - com validação rigorosa
      const rawRole = String(roleData.role).toLowerCase().trim();
      console.log('[AuthContext] 🔄 Role processado:', {
        rawRole,
        tipo: typeof rawRole,
        tamanho: rawRole.length,
        bytes: Array.from(rawRole).map(c => c.charCodeAt(0))
      });
      
      const validRoles: AppRole[] = ['admin', 'gestor', 'operador'];
      const role = validRoles.includes(rawRole as AppRole) ? (rawRole as AppRole) : null;
      
      if (!role) {
        console.error('[AuthContext] ❌ Role inválido ou não reconhecido:', rawRole, 'Roles válidos:', validRoles);
        setUserRole(null);
        setMenuPermissions({});
        setLoading(false);
        return;
      }

      console.log('[AuthContext] ✅ Role validado e definido:', role);
      setUserRole(role);

      // Admin sempre tem todas as permissões - não precisa buscar
      if (role === 'admin') {
        console.log('[AuthContext] 👑 Usuário é ADMIN - acesso total concedido');
        setMenuPermissions({});
        setLoading(false);
        return;
      }

      // Buscar permissões de menu
      console.log('[AuthContext] 🔍 Buscando permissões para role:', role);
      const { data: permissionsData, error: permError } = await supabase
        .from('menu_permissions')
        .select('menu_item, can_access')
        .eq('role', role) as { data: Array<{ menu_item: string; can_access: boolean }> | null; error: any };

      console.log('[AuthContext] 📦 Permissions raw data:', permissionsData);
      console.log('[AuthContext] ❌ Permissions error:', permError);

      if (permError) {
        console.error('[AuthContext] ❌ ERRO ao buscar permissões:', permError);
        setMenuPermissions({});
      } else if (permissionsData && permissionsData.length > 0) {
        const permissions = permissionsData.reduce((acc, perm) => {
          acc[perm.menu_item] = perm.can_access;
          return acc;
        }, {} as Record<string, boolean>);
        console.log('[AuthContext] ✅ Permissões carregadas:', {
          totalPermissoes: Object.keys(permissions).length,
          permissoes: permissions,
          permissoesAtivas: Object.entries(permissions).filter(([_, v]) => v).map(([k]) => k)
        });
        setMenuPermissions(permissions);
      } else {
        console.warn('[AuthContext] ⚠️ Nenhuma permissão encontrada para role:', role);
        setMenuPermissions({});
      }
    } catch (error) {
      console.error('[AuthContext] ❌ EXCEÇÃO ao buscar dados do usuário:', error);
      setUserRole(null);
      setMenuPermissions({});
    } finally {
      setLoading(false);
      console.log('[AuthContext] 🏁 Fetch finalizado. Loading:', false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoleAndPermissions(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setMenuPermissions({});
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndPermissions(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoleAndPermissions]);

  // Set up real-time subscription for permission changes
  useEffect(() => {
    if (!user || !userRole) return;

    console.log('[AuthContext] Setting up realtime subscription for role:', userRole);

    const permissionsSubscription = supabase
      .channel('menu_permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_permissions',
          filter: `role=eq.${userRole}`
        },
        (payload) => {
          console.log('[AuthContext] Permission change detected:', payload);
          // Refetch permissions when they change
          fetchUserRoleAndPermissions(user.id);
        }
      )
      .subscribe();

    return () => {
      console.log('[AuthContext] Cleaning up realtime subscription');
      permissionsSubscription.unsubscribe();
    };
  }, [user, userRole, fetchUserRoleAndPermissions]);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nome
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setMenuPermissions({});
    navigate('/auth');
  };

  const hasPermission = useCallback((menuItem: string): boolean => {
    if (!userRole) {
      console.log('[AuthContext] 🚫 hasPermission negado: usuário sem role para item:', menuItem);
      return false;
    }
    
    if (userRole === 'admin') {
      console.log('[AuthContext] ✅ hasPermission concedido: ADMIN tem acesso total ao item:', menuItem);
      return true;
    }
    
    const hasAccess = menuPermissions[menuItem] === true;
    console.log('[AuthContext]', hasAccess ? '✅' : '🚫', 'hasPermission para', menuItem, '- Role:', userRole, '- Tem acesso:', hasAccess);
    
    return hasAccess;
  }, [userRole, menuPermissions]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
