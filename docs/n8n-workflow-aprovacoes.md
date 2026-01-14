# Framework n8n - Sistema de Aprovações WhatsApp (Unificado)

## 📋 Visão Geral

Este workflow recebe todas as notificações em um **endpoint centralizado** e faz a segregação por empresa internamente.

**URL do Webhook Centralizado:**
```
https://mechidro.app.n8n.cloud/webhook/aprovacoes
```

**IMPORTANTE**: Todas as empresas enviam para este mesmo endpoint. O campo `empresa_id` no payload é usado para segregar e aplicar configurações específicas por empresa.

---

## 🔧 Estrutura do Workflow

```
1. Webhook Trigger (recebe notificação centralizada)
   ↓
2. Set Variables (mapeia tipo → fluxo + identifica empresa)
   ↓
3. Supabase Query (busca aprovadores por empresa + fluxo)
   ↓
4. Split Out (separa cada aprovador)
   ↓
5. WhatsApp Business API (envia mensagem)
```

---

## 🏢 Segregação por Empresa

O payload recebido **sempre** inclui o campo `empresa_id`:

```json
{
  "tipo": "ordem_aprovada",
  "empresa_id": "75a36c77-793a-4f0f-b939-a2d79f5383b3",
  "numero_ordem": "MH-037-25",
  "cliente": "Cliente XYZ",
  "equipamento": "Cilindro Hidráulico",
  "empresa": "Mec Hydro Hydraulics",
  ...
}
```

### IDs das Empresas

| Empresa | empresa_id |
|---------|------------|
| Mec Hidro | `[ID da Mec Hidro]` |
| Mec Hydro Hydraulics | `75a36c77-793a-4f0f-b939-a2d79f5383b3` |

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
  "empresa_id": "uuid-da-empresa",
  "numero_ordem": "MH-037-25",
  "cliente": "Empresa XYZ",
  "equipamento": "Cilindro Hidráulico",
  "nota_fiscal_entrada": "12345",
  "data_finalizacao": "09-11-2024",
  "valor": "R$ 5.000,00",
  "empresa": "Mec Hidro"
}
```

---

## 2️⃣ Set Variables - Mapeamento de Fluxos + Empresa

**Node Type**: `Set`

**Configuração**:

```javascript
// Mapeia o tipo de notificação para o fluxo de aprovação
const tipoNotificacao = $json.body.tipo;
const empresaId = $json.body.empresa_id;

const fluxoMap = {
  'ordem_retorno': 'fiscal',
  'ordem_finalizada': 'ordem_servico',
  'orcamento_aprovado': 'orcamento',
  'ordem_aprovada': 'ordem_servico',
  'ordem_faturamento_sem_retorno': 'ordem_servico'
};

const fluxo = fluxoMap[tipoNotificacao] || 'orcamento';

// Configurações específicas por empresa (opcional)
const empresaConfig = {
  '75a36c77-793a-4f0f-b939-a2d79f5383b3': {
    nome: 'Mec Hydro Hydraulics',
    prefixo_mensagem: '🔵 Mec Hydro Hydraulics'
  },
  // Adicione outras empresas aqui
};

const configEmpresa = empresaConfig[empresaId] || { 
  nome: $json.body.empresa || 'Empresa', 
  prefixo_mensagem: '🟢' 
};

// Define o ícone e título baseado no fluxo
const tituloMap = {
  'fiscal': '📄 Nota de Retorno',
  'ordem_servico': '🔧 Ordem Finalizada - Faturamento',
  'orcamento': '💰 Orçamento Aprovado'
};

const titulo = tituloMap[fluxo] || '🔔 Notificação';

return {
  empresa_id: empresaId,
  empresa_nome: configEmpresa.nome,
  prefixo: configEmpresa.prefixo_mensagem,
  fluxo_permissao: fluxo,
  titulo: titulo,
  tipo_notificacao: tipoNotificacao,
  dados: $json.body
};
```

---

## 3️⃣ Supabase Query - Buscar Aprovadores POR EMPRESA

**Node Type**: `Supabase`

**Configuração**:
- Operation: `Get All`
- Table: `aprovadores_fluxo`

**Filters**:
```javascript
// Filter 1 - Fluxo de permissão
{
  "column": "fluxo_permissao",
  "operator": "eq",
  "value": "={{ $json.fluxo_permissao }}"
}

// Filter 2 - Ativo
{
  "column": "ativo",
  "operator": "eq", 
  "value": true
}

// Filter 3 - EMPRESA (CRÍTICO para segregação!)
{
  "column": "empresa_id",
  "operator": "eq",
  "value": "={{ $json.empresa_id }}"
}
```

**Return Fields**: `id, nome, telefone, fluxo_permissao, empresa_id`

---

## 4️⃣ Split Out - Separar Aprovadores

**Node Type**: `Split Out`

**Configuração**:
- Field to Split Out: `data`

---

## 5️⃣ WhatsApp Business API - Enviar Mensagem

**Node Type**: `HTTP Request`

### Template com Identificação da Empresa

```json
{
  "messaging_product": "whatsapp",
  "to": "={{ $json.telefone }}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "{{ $('Set Variables').item.json.prefixo }} *{{ $('Set Variables').item.json.empresa_nome }}*\n\n🔔 *{{ $('Set Variables').item.json.titulo }}*\n\n👤 Cliente: {{ $('Set Variables').item.json.dados.cliente }}\n📋 Ordem: {{ $('Set Variables').item.json.dados.numero_ordem }}\n🔧 Equipamento: {{ $('Set Variables').item.json.dados.equipamento }}\n📅 Data: {{ $('Set Variables').item.json.dados.data_aprovacao || $('Set Variables').item.json.dados.data_finalizacao }}\n\n---\nSistema Fixzys"
  }
}
```

---

## 🔀 Alternativa: Switch Node para Empresas Diferentes

Se precisar de templates completamente diferentes por empresa:

```javascript
// Switch Node
switch($json.empresa_id) {
  case '75a36c77-793a-4f0f-b939-a2d79f5383b3':
    // Branch: Mec Hydro Hydraulics
    break;
  case 'id-mec-hidro':
    // Branch: Mec Hidro
    break;
  default:
    // Branch: Padrão
}
```

---

## 📊 Estrutura Visual no n8n

```
┌─────────────────┐
│  Webhook        │ ← Centralizado
│  /aprovacoes    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set Variables  │ ← Identifica empresa
│  Mapeia fluxo   │
│  + empresa      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │ ← Filtra por empresa_id
│  Busca ativos   │
│  da empresa +   │
│  fluxo          │
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
│  Switch         │ ← Opcional: templates por empresa
│  (empresa_id)   │
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

### 1. Cadastrar aprovador de teste (com empresa_id):
```sql
INSERT INTO aprovadores_fluxo (nome, telefone, fluxo_permissao, ativo, empresa_id) 
VALUES (
  'Teste', 
  '+5519999999999', 
  'fiscal', 
  true,
  '75a36c77-793a-4f0f-b939-a2d79f5383b3'  -- Mec Hydro Hydraulics
);
```

### 2. Enviar webhook de teste:
```bash
curl -X POST \
  'https://mechidro.app.n8n.cloud/webhook/aprovacoes' \
  -H 'Content-Type: application/json' \
  -d '{
    "tipo": "ordem_aprovada",
    "empresa_id": "75a36c77-793a-4f0f-b939-a2d79f5383b3",
    "numero_ordem": "MH-037-25",
    "cliente": "Cliente Teste",
    "equipamento": "Cilindro Teste",
    "data_aprovacao": "14-01-2026",
    "empresa": "Mec Hydro Hydraulics"
  }'
```

### 3. Verificar:
- ✅ n8n recebeu o webhook
- ✅ Identificou a empresa corretamente
- ✅ Buscou aprovadores DESTA empresa
- ✅ Enviou mensagem com identificação da empresa

---

## 📝 Variáveis de Ambiente no n8n

```env
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxx
SUPABASE_URL=https://fmbfkufkxvyncadunlhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ Checklist de Implementação

- [ ] Webhook centralizado configurado
- [ ] Set Variables com identificação de empresa
- [ ] Supabase query filtrando por empresa_id
- [ ] Aprovadores cadastrados COM empresa_id
- [ ] Templates com identificação visual da empresa
- [ ] Testado com cada empresa
- [ ] Testado com cada tipo de notificação

---

**Documentação atualizada em:** 2026-01-14  
**Sistema:** Fixzys - Gestão de Ordens de Serviço  
**Versão:** 2.0 - Webhook Unificado com Segregação por Empresa
