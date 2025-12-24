import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Json } from '@/integrations/supabase/types';

export interface Empresa {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  logo_url: string | null;
  configuracoes: Json;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
  created_at: string;
  empresa?: Empresa;
}

interface EmpresaContextType {
  empresaAtual: Empresa | null;
  empresas: Empresa[];
  userEmpresas: UserEmpresa[];
  loading: boolean;
  isOwner: boolean;
  trocarEmpresa: (empresaId: string) => Promise<void>;
  recarregarEmpresas: () => Promise<void>;
  getEmpresaId: () => string | null;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

const EMPRESA_STORAGE_KEY = 'empresa_atual_id';

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [userEmpresas, setUserEmpresas] = useState<UserEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const carregarEmpresas = useCallback(async () => {
    if (!user) {
      console.log('[EmpresaContext] Sem usuário, limpando dados');
      setEmpresas([]);
      setUserEmpresas([]);
      setEmpresaAtual(null);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    try {
      console.log('[EmpresaContext] 🔍 Carregando empresas do usuário:', user.id);
      setLoading(true);

      // Buscar vínculos do usuário com empresas
      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('user_empresas')
        .select('*')
        .eq('user_id', user.id);

      if (userEmpresasError) {
        console.error('[EmpresaContext] ❌ Erro ao buscar user_empresas:', userEmpresasError);
        setLoading(false);
        return;
      }

      console.log('[EmpresaContext] 📦 Vínculos encontrados:', userEmpresasData?.length || 0);

      if (!userEmpresasData || userEmpresasData.length === 0) {
        console.warn('[EmpresaContext] ⚠️ Usuário sem vínculo com empresas');
        setEmpresas([]);
        setUserEmpresas([]);
        setEmpresaAtual(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      // Buscar detalhes das empresas
      const empresaIds = userEmpresasData.map(ue => ue.empresa_id);
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*')
        .in('id', empresaIds)
        .eq('ativo', true);

      if (empresasError) {
        console.error('[EmpresaContext] ❌ Erro ao buscar empresas:', empresasError);
        setLoading(false);
        return;
      }

      console.log('[EmpresaContext] ✅ Empresas carregadas:', empresasData?.length || 0);

      // Mapear userEmpresas com dados da empresa
      const userEmpresasComDados: UserEmpresa[] = userEmpresasData.map(ue => ({
        id: ue.id,
        user_id: ue.user_id,
        empresa_id: ue.empresa_id,
        is_owner: ue.is_owner,
        created_at: ue.created_at,
        empresa: empresasData?.find(e => e.id === ue.empresa_id) as Empresa | undefined
      }));

      setEmpresas((empresasData || []) as Empresa[]);
      setUserEmpresas(userEmpresasComDados);

      // Determinar empresa atual
      const empresaIdSalvo = localStorage.getItem(EMPRESA_STORAGE_KEY);
      let empresaSelecionada: Empresa | null = null;

      if (empresaIdSalvo && empresasData?.find(e => e.id === empresaIdSalvo)) {
        empresaSelecionada = empresasData.find(e => e.id === empresaIdSalvo) as Empresa || null;
        console.log('[EmpresaContext] 📌 Usando empresa salva:', empresaSelecionada?.nome);
      } else if (empresasData && empresasData.length > 0) {
        empresaSelecionada = empresasData[0] as Empresa;
        localStorage.setItem(EMPRESA_STORAGE_KEY, empresaSelecionada.id);
        console.log('[EmpresaContext] 📌 Usando primeira empresa:', empresaSelecionada?.nome);
      }

      setEmpresaAtual(empresaSelecionada);

      // Verificar se é owner
      if (empresaSelecionada) {
        const userEmpresa = userEmpresasData.find(ue => ue.empresa_id === empresaSelecionada!.id);
        setIsOwner(userEmpresa?.is_owner || false);
        console.log('[EmpresaContext] 👤 É owner:', userEmpresa?.is_owner || false);
      }

    } catch (error) {
      console.error('[EmpresaContext] ❌ Exceção ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carregar empresas quando usuário mudar
  useEffect(() => {
    if (!authLoading) {
      carregarEmpresas();
    }
  }, [user, authLoading, carregarEmpresas]);

  const trocarEmpresa = useCallback(async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) {
      console.error('[EmpresaContext] ❌ Empresa não encontrada:', empresaId);
      return;
    }

    console.log('[EmpresaContext] 🔄 Trocando para empresa:', empresa.nome);
    
    localStorage.setItem(EMPRESA_STORAGE_KEY, empresaId);
    setEmpresaAtual(empresa);

    // Atualizar status de owner
    const userEmpresa = userEmpresas.find(ue => ue.empresa_id === empresaId);
    setIsOwner(userEmpresa?.is_owner || false);

    // Recarregar a página para atualizar todos os dados
    window.location.reload();
  }, [empresas, userEmpresas]);

  const getEmpresaId = useCallback((): string | null => {
    return empresaAtual?.id || null;
  }, [empresaAtual]);

  const recarregarEmpresas = useCallback(async () => {
    await carregarEmpresas();
  }, [carregarEmpresas]);

  return (
    <EmpresaContext.Provider
      value={{
        empresaAtual,
        empresas,
        userEmpresas,
        loading,
        isOwner,
        trocarEmpresa,
        recarregarEmpresas,
        getEmpresaId,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
}
