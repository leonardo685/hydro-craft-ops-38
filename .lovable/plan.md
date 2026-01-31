

## Exibir o Campo "Motivo da Falha" no Laudo Público

### Problema Identificado
O campo "Motivo da Falha" é preenchido durante a criação da Ordem de Serviço (na página Nova Análise ou Nova Ordem Direta), porém não está sendo exibido na página de laudo público acessada via QR code. Atualmente, ele só aparece dentro do modal de histórico de manutenções.

### Solução
Adicionar o campo `motivo_falha` à interface da ordem de serviço no laudo público e exibi-lo de forma destacada na página, junto às informações do equipamento.

---

### Alterações no Arquivo: `src/pages/LaudoPublico.tsx`

**1. Atualizar a Interface `OrdemServico`**

Adicionar o campo `motivo_falha` à interface para que ele seja reconhecido no TypeScript:

```typescript
interface OrdemServico {
  // ... campos existentes
  motivo_falha: string | null;  // ADICIONAR
}
```

**2. Incluir o campo na query de busca**

A query atual já usa `*` (select all), então o campo já está sendo buscado. Basta adicioná-lo à interface.

**3. Exibir o "Motivo da Falha" na UI**

Adicionar uma seção visualmente destacada após as informações básicas da ordem, exibindo o motivo da falha quando preenchido:

```tsx
{/* Card de Motivo da Falha - após o card de informações da ordem */}
{ordemServico.motivo_falha && (
  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-5 h-5" />
        Motivo da Falha / Diagnóstico
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-foreground whitespace-pre-wrap">
        {ordemServico.motivo_falha}
      </p>
    </CardContent>
  </Card>
)}
```

**4. Importar o ícone necessário**

Adicionar `AlertTriangle` aos imports do Lucide React (já está importado, conforme verificado no código).

---

### Resultado Esperado

Quando o usuário acessar o laudo público via QR code, verá uma seção destacada em cor âmbar/amarela mostrando o "Motivo da Falha" diagnosticado durante a análise técnica. Esta informação só aparecerá quando o campo estiver preenchido na ordem de serviço.

### Benefício
O cliente terá acesso imediato à causa raiz da falha do equipamento diretamente na página do laudo, sem precisar abrir o modal de histórico de manutenções.

