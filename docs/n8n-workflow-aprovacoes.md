# Framework n8n - Sistema de Aprovações WhatsApp

## 📋 Visão Geral

Este workflow substitui as notificações do Telegram por mensagens do WhatsApp Business API, buscando aprovadores dinamicamente do Supabase.

---

## 🔧 Estrutura do Workflow

```
1. Webhook Trigger (recebe notificação do sistema)
   ↓
2. Set Variables (mapeia tipo → fluxo)
   ↓
3. Supabase Query (busca aprovadores ativos)
   ↓
4. Split Out (separa cada aprovador)
   ↓
5. WhatsApp Business API (envia mensagem)
```

---

## 1️⃣ Webhook Trigger

**Node Type**: `Webhook`

**Configuração**:
- HTTP Method: `POST`
- Path: `/webhook/aprovacoes`
- Response Mode: `On Received`

**Body esperado**:
```json
{
  "tipo": "ordem_retorno | ordem_finalizada | orcamento_aprovado | ordem_aprovada | ordem_faturamento_sem_retorno",
  "numero_ordem": "OS-2024-001",
  "cliente_nome": "Empresa XYZ",
  "equipamento": "Cilindro Hidráulico",
  "nota_fiscal_entrada": "12345",
  "data_finalizacao": "2024-11-09T10:30:00Z",
  "valor": 5000.00,
  "observacoes": "Urgente"
}
```

---

## 2️⃣ Set Variables - Mapeamento de Fluxos

**Node Type**: `Set`

**Configuração**:

```javascript
// Mapeia o tipo de notificação para o fluxo de aprovação
const tipoNotificacao = $json.body.tipo;

const fluxoMap = {
  'ordem_retorno': 'fiscal',
  'ordem_finalizada': 'ordem_servico',
  'orcamento_aprovado': 'orcamento',
  'ordem_aprovada': 'ordem_servico',  // ← NOVO: OS aprovada via orçamento
  'ordem_faturamento_sem_retorno': 'ordem_servico'
};

const fluxo = fluxoMap[tipoNotificacao] || 'orcamento';

// Define o ícone e título baseado no fluxo
const tituloMap = {
  'fiscal': '📄 Nota de Retorno',
  'ordem_servico': '🔧 Ordem Finalizada - Faturamento',
  'orcamento': '💰 Orçamento Aprovado'
};

const titulo = tituloMap[fluxo] || '🔔 Notificação';

return {
  fluxo_permissao: fluxo,
  titulo: titulo,
  tipo_notificacao: tipoNotificacao,
  dados: $json.body
};
```

**Output**:
```json
{
  "fluxo_permissao": "fiscal",
  "titulo": "📄 Nota de Retorno",
  "tipo_notificacao": "ordem_retorno",
  "dados": { ... }
}
```

---

## 3️⃣ Supabase Query - Buscar Aprovadores

**Node Type**: `Supabase`

**Configuração**:
- Operation: `Get All`
- Table: `aprovadores_fluxo`

**Filters**:
```javascript
// Filter 1
{
  "column": "fluxo_permissao",
  "operator": "eq",
  "value": "={{ $json.fluxo_permissao }}"
}

// Filter 2
{
  "column": "ativo",
  "operator": "eq", 
  "value": true
}
```

**Return Fields**: `id, nome, telefone, fluxo_permissao`

**Output esperado**:
```json
[
  {
    "id": "uuid-123",
    "nome": "Leonardo",
    "telefone": "+5519996449359",
    "fluxo_permissao": "fiscal"
  },
  {
    "id": "uuid-456",
    "nome": "Ana Costa",
    "telefone": "+5519988776655",
    "fluxo_permissao": "fiscal"
  }
]
```

---

## 4️⃣ Split Out - Separar Aprovadores

**Node Type**: `Split Out`

**Configuração**:
- Field to Split Out: `data`

Isso separa o array de aprovadores em itens individuais para processar um por vez.

---

## 5️⃣ WhatsApp Business API - Enviar Mensagem

**Node Type**: `HTTP Request`

**Configuração**:
- Method: `POST`
- URL: `https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages`
- Authentication: `Header Auth`
  - Name: `Authorization`
  - Value: `Bearer YOUR_ACCESS_TOKEN`

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON)**:

### 📄 Template para Fiscal - Nota de Retorno

```json
{
  "messaging_product": "whatsapp",
  "to": "={{ $json.telefone }}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "🔔 *Nova Notificação - Fiscal*\n\n📄 *Nota de Retorno*\n\n👤 Cliente: {{ $('Set Variables').item.json.dados.cliente_nome }}\n📋 Ordem: {{ $('Set Variables').item.json.dados.numero_ordem }}\n🔧 Equipamento: {{ $('Set Variables').item.json.dados.equipamento }}\n📑 NF Entrada: {{ $('Set Variables').item.json.dados.nota_fiscal_entrada }}\n📅 Data: {{ $('Set Variables').item.json.dados.data_finalizacao }}\n\n⚠️ *Ação necessária:* Emitir nota de retorno\n\n---\nSistema MecHidro"
  }
}
```

### 🔧 Template para Ordem de Serviço - Faturamento

```json
{
  "messaging_product": "whatsapp",
  "to": "={{ $json.telefone }}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "🔔 *Nova Notificação - Faturamento*\n\n🔧 *Ordem Finalizada*\n\n👤 Cliente: {{ $('Set Variables').item.json.dados.cliente_nome }}\n📋 Ordem: {{ $('Set Variables').item.json.dados.numero_ordem }}\n🔧 Equipamento: {{ $('Set Variables').item.json.dados.equipamento }}\n📅 Data Finalização: {{ $('Set Variables').item.json.dados.data_finalizacao }}\n💰 Valor: R$ {{ $('Set Variables').item.json.dados.valor }}\n\n⚠️ *Ação necessária:* Emitir nota de faturamento\n\n---\nSistema MecHidro"
  }
}
```

### 💰 Template para Orçamento Aprovado

```json
{
  "messaging_product": "whatsapp",
  "to": "={{ $json.telefone }}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "🔔 *Nova Notificação - Orçamento*\n\n💰 *Orçamento Aprovado*\n\n👤 Cliente: {{ $('Set Variables').item.json.dados.cliente_nome }}\n📋 Número: {{ $('Set Variables').item.json.dados.numero_ordem }}\n🔧 Equipamento: {{ $('Set Variables').item.json.dados.equipamento }}\n💰 Valor: R$ {{ $('Set Variables').item.json.dados.valor }}\n📅 Data Aprovação: {{ $('Set Variables').item.json.dados.data_finalizacao }}\n\n✅ *Status:* Aguardando faturamento\n\n---\nSistema MecHidro"
  }
}
```

### 🔧 Template para Ordem Aprovada (via Orçamento)

```json
{
  "messaging_product": "whatsapp",
  "to": "={{ $json.telefone }}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "🔔 *Nova Notificação - Ordem de Serviço*\n\n✅ *Ordem Aprovada*\n\n👤 Cliente: {{ $('Set Variables').item.json.dados.cliente }}\n📋 OS: {{ $('Set Variables').item.json.dados.numero_ordem }}\n🔧 Equipamento: {{ $('Set Variables').item.json.dados.equipamento }}\n💰 Valor: R$ {{ $('Set Variables').item.json.dados.valor }}\n📄 Orçamento: {{ $('Set Variables').item.json.dados.orcamento_numero }}\n📅 Data Aprovação: {{ $('Set Variables').item.json.dados.data_aprovacao }}\n\n✅ *Status:* Ordem aprovada via orçamento\n\n---\nSistema MecHidro"
  }
}
```

---

## 🔀 Alternativa: IF Node para Templates Diferentes

Se preferir mensagens diferentes por tipo, adicione um **IF Node** antes do WhatsApp:

```javascript
// Condition para cada fluxo
$json.fluxo_permissao === 'fiscal'
$json.fluxo_permissao === 'ordem_servico'
$json.fluxo_permissao === 'orcamento'
```

E conecte cada branch a um node WhatsApp específico com template customizado.

---

## 📊 Estrutura Visual no n8n

```
┌─────────────────┐
│  Webhook        │
│  /aprovacoes    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set Variables  │
│  Mapeia fluxo   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  Busca ativos   │
│  do fluxo       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Split Out      │
│  Separa array   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IF (opcional)  │
│  Escolhe        │
│  template       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp API   │
│  Envia mensagem │
└─────────────────┘
```

---

## 🔐 Configuração do WhatsApp Business API

### Pré-requisitos:
1. Conta Meta Business
2. Número de telefone verificado
3. Access Token da aplicação
4. Phone Number ID

### Obter credenciais:
1. Acesse: https://developers.facebook.com/
2. Vá em **My Apps** → Sua aplicação
3. Em **WhatsApp** → **Getting Started**:
   - `Phone Number ID`: encontrado na seção API Setup
   - `Access Token`: gerado em Access Tokens

### Testar API:
```bash
curl -X POST \
  'https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+5519996449359",
    "type": "text",
    "text": {
      "body": "Teste de mensagem do sistema"
    }
  }'
```

---

## 🧪 Teste no Sistema

### 1. Cadastrar aprovador de teste:
```sql
INSERT INTO aprovadores_fluxo (nome, telefone, fluxo_permissao, ativo) 
VALUES ('Teste', '+5519999999999', 'fiscal', true);
```

### 2. Enviar webhook de teste:
```bash
curl -X POST \
  'https://seu-n8n.com/webhook/aprovacoes' \
  -H 'Content-Type: application/json' \
  -d '{
    "tipo": "ordem_retorno",
    "numero_ordem": "OS-TEST-001",
    "cliente_nome": "Cliente Teste",
    "equipamento": "Cilindro Teste",
    "nota_fiscal_entrada": "12345",
    "data_finalizacao": "2024-11-09T10:30:00Z"
  }'
```

### 3. Verificar:
- ✅ n8n recebeu o webhook
- ✅ Mapeou corretamente para 'fiscal'
- ✅ Buscou aprovadores do Supabase
- ✅ Enviou mensagem WhatsApp

---

## 🚨 Tratamento de Erros

### Node de Error Handler (opcional):

**Node Type**: `Function`

```javascript
// Após WhatsApp API, adicionar Error Trigger
if ($json.error) {
  console.error('Erro ao enviar WhatsApp:', {
    aprovador: $json.nome,
    telefone: $json.telefone,
    erro: $json.error
  });
  
  // Opcional: registrar falha no Supabase
  // ou enviar alerta para admin
}

return $json;
```

---

## 📝 Variáveis de Ambiente no n8n

Adicione no n8n Settings → Environment Variables:

```env
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxx
SUPABASE_URL=https://fmbfkufkxvyncadunlhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use nas configurações dos nodes:
```javascript
{{ $env.WHATSAPP_ACCESS_TOKEN }}
{{ $env.WHATSAPP_PHONE_NUMBER_ID }}
```

---

## 🔄 Migração do Telegram

### Desativar notificações antigas:
1. Encontre os nodes que enviam para Telegram
2. Desative ou delete
3. Conecte ao novo workflow de WhatsApp

### Manter histórico:
- Mantenha o workflow antigo desativado como backup
- Documente a data de migração

---

## 📊 Monitoramento

### Logs importantes:
```javascript
console.log('Notificação recebida:', {
  tipo: $json.tipo,
  fluxo: $json.fluxo_permissao,
  ordem: $json.dados.numero_ordem
});

console.log('Aprovadores encontrados:', {
  fluxo: $json.fluxo_permissao,
  quantidade: $json.data.length,
  aprovadores: $json.data.map(a => a.nome)
});

console.log('Mensagem enviada:', {
  para: $json.telefone,
  nome: $json.nome,
  status: 'enviado'
});
```

---

## ✅ Checklist de Implementação

- [ ] Webhook configurado e testado
- [ ] Variáveis de ambiente adicionadas
- [ ] Credenciais WhatsApp Business API obtidas
- [ ] Node Set Variables com mapeamento correto
- [ ] Supabase node configurado com filtros
- [ ] Split Out adicionado
- [ ] WhatsApp API node configurado
- [ ] Templates de mensagem customizados
- [ ] Teste com cada tipo de notificação
- [ ] Error handling implementado
- [ ] Logs de monitoramento adicionados
- [ ] Workflow antigo (Telegram) desativado
- [ ] Documentação atualizada

---

## 🎯 Próximos Passos

1. Importar este workflow no n8n
2. Configurar credenciais do WhatsApp
3. Testar com dados reais
4. Ajustar templates de mensagem
5. Monitorar primeiras notificações
6. Coletar feedback dos aprovadores

---

**Documentação criada em:** 2024-11-09  
**Sistema:** MecHidro - Gestão de Ordens de Serviço  
**Versão:** 1.0
