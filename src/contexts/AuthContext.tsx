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
      console.log('[AuthContext] Fetching role and permissions for user:', userId);
      
      // Buscar role do usuário
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Erro ao buscar role:', roleError);
        setLoading(false);
        return;
      }

      const role = roleData?.role as AppRole | null;
      console.log('[AuthContext] User role:', role);
      setUserRole(role);

      if (role) {
        // Buscar permissões de menu
        const { data: permissionsData, error: permError } = await supabase
          .from('menu_permissions')
          .select('menu_item, can_access')
          .eq('role', role);

        if (permError) {
          console.error('Erro ao buscar permissões:', permError);
        } else if (permissionsData) {
          const permissions = permissionsData.reduce((acc, perm) => {
            acc[perm.menu_item] = perm.can_access;
            return acc;
          }, {} as Record<string, boolean>);
          console.log('[AuthContext] Permissions loaded:', permissions);
          setMenuPermissions(permissions);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    } finally {
      setLoading(false);
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
    if (!userRole) return false;
    if (userRole === 'admin') return true;
    return menuPermissions[menuItem] === true;
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
