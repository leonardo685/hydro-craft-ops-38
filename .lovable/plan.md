
# Plano: Corrigir Histórico de Manutenção Não Aparecendo no Laudo Público

## Problema Identificado

Existem **duas ordens** com o número `MH-001-26` em **empresas diferentes**:

| ID | Status | Empresa | 
|----|--------|---------|
| `76f7b0b5...` | faturado ✅ | Empresa A (correta - com laudo) |
| `2047f9f7...` | em_andamento | Empresa B (sem laudo) |

**Fluxo atual com bug:**
1. `LaudoPublico.tsx` busca TODAS as ordens e seleciona a correta (a faturada com laudo)
2. Abre o modal de histórico passando apenas `numeroOrdem="MH-001-26"`
3. `HistoricoManutencaoPublicoModal` faz uma nova busca com `.maybeSingle()` 
4. Supabase retorna a ordem ERRADA (da empresa B)
5. O modal filtra o histórico pela empresa B, onde não há registros
6. Resultado: "Nenhum histórico de manutenção encontrado"

---

## Solução

Passar o **ID da ordem correta** (já validada) para o modal de histórico, evitando uma segunda busca ambígua.

---

## Mudanças a Realizar

### 1. Arquivo: `src/components/HistoricoManutencaoPublicoModal.tsx`

**Adicionar nova prop `ordemId`:**

```tsx
interface HistoricoManutencaoPublicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroOrdem: string;
  ordemId?: string; // NOVO: ID da ordem já validada
}
```

**Modificar a busca inicial para usar o ID quando disponível:**

```tsx
const buscarHistorico = async () => {
  if (!numeroOrdem) return;
  setLoading(true);

  try {
    let ordemInicial;

    // Se temos o ID da ordem, buscar diretamente por ele
    if (ordemId) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`id, numero_ordem, cliente_nome, equipamento, 
                 data_entrada, data_finalizacao, motivo_falha, 
                 status, recebimento_id, empresa_id`)
        .eq('id', ordemId)
        .maybeSingle();
      
      if (error) throw error;
      ordemInicial = data;
    } else {
      // Fallback: buscar por numero_ordem (comportamento antigo)
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`id, numero_ordem, cliente_nome, equipamento, 
                 data_entrada, data_finalizacao, motivo_falha, 
                 status, recebimento_id, empresa_id`)
        .eq('numero_ordem', numeroOrdem)
        .maybeSingle();
      
      if (error) throw error;
      ordemInicial = data;
    }

    if (!ordemInicial) {
      setHistorico([]);
      setLoading(false);
      return;
    }
    
    // ... resto da função permanece igual
  }
};
```

### 2. Arquivo: `src/pages/LaudoPublico.tsx`

**Passar o ID da ordem ao abrir o modal de histórico:**

Atualmente:
```tsx
<HistoricoManutencaoPublicoModal
  open={historicoModalOpen}
  onOpenChange={setHistoricoModalOpen}
  numeroOrdem={ordemServico.numero_ordem}
/>
```

Alterar para:
```tsx
<HistoricoManutencaoPublicoModal
  open={historicoModalOpen}
  onOpenChange={setHistoricoModalOpen}
  numeroOrdem={ordemServico.numero_ordem}
  ordemId={ordemServico.id}  // NOVO: passar ID da ordem correta
/>
```

---

## Resultado Esperado

Após a correção:
1. Usuário acessa laudo público de MH-001-26
2. Sistema identifica a ordem correta (76f7b0b5, faturada)
3. Ao abrir histórico, passa o ID `76f7b0b5`
4. Modal busca diretamente por esse ID
5. Histórico é carregado corretamente da empresa certa

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/components/HistoricoManutencaoPublicoModal.tsx` | Adicionar prop `ordemId` e buscar por ID quando disponível |
| `src/pages/LaudoPublico.tsx` | Passar `ordemId` ao abrir o modal |
