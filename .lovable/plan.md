
# Plano: Corrigir Acesso ao Laudo com Ordens Duplicadas

## Problema Identificado

Existem **duas ordens de serviço** com o mesmo número `MH-001-26`:

| ID | Status | Tem Laudo | Tem Fotos | Nota Retorno | Criada em |
|----|--------|-----------|-----------|--------------|-----------|
| `76f7b0b5...` | faturado | ✅ Sim (1) | ✅ Sim (2) | ✅ Sim | 11:44 |
| `2047f9f7...` | em_andamento | ❌ Não | ❌ Não | ❌ Não | 12:49 |

Quando o usuário escaneia o QR code, o sistema usa `.maybeSingle()` que pode retornar a **ordem errada** (a mais recente sem laudo), causando a mensagem de erro "Esta ordem ainda não possui laudo disponível".

---

## Solução

Modificar as queries nas 3 páginas afetadas para:
1. Buscar **todas** as ordens com o mesmo número
2. **Priorizar** a ordem que está finalizada (tem laudo, fotos ou nota de retorno)
3. Se houver múltiplas finalizadas, usar a mais recente

---

## Mudanças a Realizar

### 1. Arquivo: `src/pages/OrdemPorQRCode.tsx`

**Linha ~23-27**: Alterar query de `.maybeSingle()` para buscar múltiplas e filtrar:

```tsx
// ANTES
const { data: ordemServico, error: ordemError } = await supabase
  .from("ordens_servico")
  .select("id, status, recebimento_id")
  .eq("numero_ordem", numeroOrdem)
  .maybeSingle();

// DEPOIS
const { data: ordensServico, error: ordemError } = await supabase
  .from("ordens_servico")
  .select("id, status, recebimento_id")
  .eq("numero_ordem", numeroOrdem);

// Encontrar a ordem mais adequada (priorizar finalizadas)
let ordemServico = null;
if (ordensServico && ordensServico.length > 0) {
  // Tentar encontrar uma ordem finalizada
  for (const ordem of ordensServico) {
    const temLaudo = await verificarOrdemTemLaudo(ordem);
    if (temLaudo) {
      ordemServico = ordem;
      break;
    }
  }
  // Se nenhuma tem laudo, usar a primeira
  if (!ordemServico) {
    ordemServico = ordensServico[0];
  }
}
```

### 2. Arquivo: `src/pages/AcessoOrdemPublica.tsx`

**Linhas ~134-138 e ~213-217**: Mesma alteração para buscar múltiplas ordens e priorizar a finalizada.

### 3. Arquivo: `src/pages/LaudoPublico.tsx`

**Linhas ~130-137**: Alterar query para priorizar ordem com laudo existente.

---

## Seção Técnica

### Lógica de Priorização

Criar uma função auxiliar para verificar se uma ordem está finalizada:

```tsx
const verificarOrdemFinalizada = async (ordem: { id: string, recebimento_id: number | null }) => {
  // Verificar laudo técnico
  const { data: teste } = await supabase
    .from("testes_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordem.id)
    .limit(1);
  
  if (teste && teste.length > 0) return true;

  // Verificar nota de retorno
  if (ordem.recebimento_id) {
    const { data: recebimento } = await supabase
      .from("recebimentos")
      .select("pdf_nota_retorno")
      .eq("id", ordem.recebimento_id)
      .maybeSingle();
    
    if (recebimento?.pdf_nota_retorno) return true;
  }

  // Verificar fotos
  const { data: fotos } = await supabase
    .from("fotos_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordem.id)
    .limit(1);

  return fotos && fotos.length > 0;
};
```

### Fluxo de Seleção

```text
+------------------------+
| Buscar TODAS as ordens |
| com numero_ordem       |
+------------------------+
           |
           v
+------------------------+
| Para cada ordem:       |
| - Tem teste?           |
| - Tem nota retorno?    |
| - Tem fotos?           |
+------------------------+
           |
           v
+------------------------+
| Retornar primeira      |
| ordem finalizada       |
| OU primeira da lista   |
+------------------------+
```

---

## Resultado Esperado

Após a correção:
- Usuário escaneia QR code de `MH-001-26`
- Sistema encontra 2 ordens
- Sistema identifica que `76f7b0b5` tem laudo/fotos/nota
- Redireciona para o laudo correto

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/OrdemPorQRCode.tsx` | Modificar query para buscar múltiplas ordens e priorizar finalizadas |
| `src/pages/AcessoOrdemPublica.tsx` | Mesma modificação em 2 locais |
| `src/pages/LaudoPublico.tsx` | Mesma modificação na busca inicial |
