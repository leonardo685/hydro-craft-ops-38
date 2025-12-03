export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      aprovadores_fluxo: {
        Row: {
          ativo: boolean
          created_at: string
          fluxo_permissao: string
          id: string
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fluxo_permissao: string
          id?: string
          nome: string
          telefone: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fluxo_permissao?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      atividades_sistema: {
        Row: {
          created_at: string
          descricao: string
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          metadados: Json | null
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          metadados?: Json | null
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          metadados?: Json | null
          tipo?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          categoria_mae_id: string | null
          classificacao: string | null
          codigo: string
          cor: string | null
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria_mae_id?: string | null
          classificacao?: string | null
          codigo: string
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          categoria_mae_id?: string | null
          classificacao?: string | null
          codigo?: string
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_categoria_mae_id_fkey"
            columns: ["categoria_mae_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes_marketing: {
        Row: {
          created_at: string
          data_acesso: string
          empresa: string
          id: string
          ip_acesso: string | null
          nome: string
          numero_ordem: string
          ordem_servico_id: string
          telefone: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          data_acesso?: string
          empresa: string
          id?: string
          ip_acesso?: string | null
          nome: string
          numero_ordem: string
          ordem_servico_id: string
          telefone: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          data_acesso?: string
          empresa?: string
          id?: string
          ip_acesso?: string | null
          nome?: string
          numero_ordem?: string
          ordem_servico_id?: string
          telefone?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_marketing_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          created_at: string
          data_compra: string | null
          data_cotacao: string | null
          fornecedor: string | null
          id: string
          numero_pedido: string | null
          observacoes: string | null
          ordem_servico_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_compra?: string | null
          data_cotacao?: string | null
          fornecedor?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          ordem_servico_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_compra?: string | null
          data_cotacao?: string | null
          fornecedor?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          ordem_servico_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          conta: string | null
          created_at: string
          id: string
          nome: string
          saldo_inicial: number
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          id?: string
          nome: string
          saldo_inicial?: number
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          updated_at?: string
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          cliente_nome: string
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string
          id: string
          numero_nf: string
          observacoes: string | null
          orcamento_id: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          cliente_nome: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento: string
          id?: string
          numero_nf: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string
          id?: string
          numero_nf?: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_ordem: {
        Row: {
          arquivo_url: string
          created_at: string | null
          id: string
          nome_arquivo: string
          ordem_servico_id: string | null
          tamanho_bytes: number | null
          tipo_arquivo: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          id?: string
          nome_arquivo: string
          ordem_servico_id?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          ordem_servico_id?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_ordem_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_nfe: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          razao_social: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          razao_social: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          razao_social?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fotos_equipamentos: {
        Row: {
          apresentar_orcamento: boolean | null
          arquivo_url: string
          created_at: string
          id: string
          legenda: string | null
          nome_arquivo: string
          ordem_servico_id: string | null
          recebimento_id: number | null
        }
        Insert: {
          apresentar_orcamento?: boolean | null
          arquivo_url: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo: string
          ordem_servico_id?: string | null
          recebimento_id?: number | null
        }
        Update: {
          apresentar_orcamento?: boolean | null
          arquivo_url?: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo?: string
          ordem_servico_id?: string | null
          recebimento_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_equipamentos_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_equipamentos_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_orcamento: {
        Row: {
          apresentar_orcamento: boolean
          arquivo_url: string
          created_at: string
          id: string
          legenda: string | null
          nome_arquivo: string
          orcamento_id: string
          tipo: string | null
        }
        Insert: {
          apresentar_orcamento?: boolean
          arquivo_url: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo: string
          orcamento_id: string
          tipo?: string | null
        }
        Update: {
          apresentar_orcamento?: boolean
          arquivo_url?: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo?: string
          orcamento_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_itens_orcamento: {
        Row: {
          codigo: string | null
          created_at: string | null
          descricao: string
          detalhes: Json | null
          historico_orcamento_id: string
          id: string
          quantidade: number
          tipo: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          descricao: string
          detalhes?: Json | null
          historico_orcamento_id: string
          id?: string
          quantidade?: number
          tipo: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          descricao?: string
          detalhes?: Json | null
          historico_orcamento_id?: string
          id?: string
          quantidade?: number
          tipo?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_itens_orcamento_historico_orcamento_id_fkey"
            columns: ["historico_orcamento_id"]
            isOneToOne: false
            referencedRelation: "historico_orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_lancamentos: {
        Row: {
          campo_alterado: string | null
          created_at: string
          id: string
          lancamento_id: string
          metadados: Json | null
          tipo_acao: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          created_at?: string
          id?: string
          lancamento_id: string
          metadados?: Json | null
          tipo_acao: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          created_at?: string
          id?: string
          lancamento_id?: string
          metadados?: Json | null
          tipo_acao?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      historico_orcamentos: {
        Row: {
          assunto_proposta: string | null
          cliente_id: string | null
          cliente_nome: string
          comissao_percentual: number | null
          comissao_valor: number | null
          condicao_pagamento: string | null
          created_at: string | null
          custos_variaveis: Json | null
          data_revisao: string | null
          desconto_percentual: number | null
          descricao: string | null
          equipamento: string
          frete: string | null
          garantia: string | null
          id: string
          impostos_percentual: number | null
          impostos_valor: number | null
          margem_contribuicao: number | null
          numero: string
          numero_revisao: number
          observacoes: string | null
          observacoes_nota: string | null
          orcamento_id: string
          percentuais_customizados: Json | null
          percentual_margem: number | null
          prazo_entrega: string | null
          prazo_pagamento: number | null
          preco_desejado: number | null
          status: string
          total_custos_variaveis: number | null
          validade_proposta: string | null
          valor: number
        }
        Insert: {
          assunto_proposta?: string | null
          cliente_id?: string | null
          cliente_nome: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string | null
          custos_variaveis?: Json | null
          data_revisao?: string | null
          desconto_percentual?: number | null
          descricao?: string | null
          equipamento: string
          frete?: string | null
          garantia?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero: string
          numero_revisao: number
          observacoes?: string | null
          observacoes_nota?: string | null
          orcamento_id: string
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: number | null
          preco_desejado?: number | null
          status: string
          total_custos_variaveis?: number | null
          validade_proposta?: string | null
          valor?: number
        }
        Update: {
          assunto_proposta?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string | null
          custos_variaveis?: Json | null
          data_revisao?: string | null
          desconto_percentual?: number | null
          descricao?: string | null
          equipamento?: string
          frete?: string | null
          garantia?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero?: string
          numero_revisao?: number
          observacoes?: string | null
          observacoes_nota?: string | null
          orcamento_id?: string
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: number | null
          preco_desejado?: number | null
          status?: string
          total_custos_variaveis?: number | null
          validade_proposta?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_orcamentos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_precificacao: {
        Row: {
          comissao_percentual: number | null
          comissao_valor: number | null
          created_at: string | null
          custos_variaveis: Json | null
          desconto_percentual: number | null
          id: string
          impostos_percentual: number | null
          impostos_valor: number | null
          margem_contribuicao: number | null
          numero_revisao: number
          orcamento_id: string
          percentuais_customizados: Json | null
          percentual_margem: number | null
          preco_desejado: number
          total_custos_variaveis: number | null
          updated_at: string | null
        }
        Insert: {
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          custos_variaveis?: Json | null
          desconto_percentual?: number | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero_revisao: number
          orcamento_id: string
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          preco_desejado?: number
          total_custos_variaveis?: number | null
          updated_at?: string | null
        }
        Update: {
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          custos_variaveis?: Json | null
          desconto_percentual?: number | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero_revisao?: number
          orcamento_id?: string
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          preco_desejado?: number
          total_custos_variaveis?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precificacao_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_nfe: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          ncm: string | null
          nota_fiscal_id: string | null
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          ncm?: string | null
          nota_fiscal_id?: string | null
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          ncm?: string | null
          nota_fiscal_id?: string | null
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nfe_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_orcamento: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string
          detalhes: Json | null
          id: string
          orcamento_id: string
          quantidade: number
          tipo: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao: string
          detalhes?: Json | null
          id?: string
          orcamento_id: string
          quantidade?: number
          tipo: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          id?: string
          orcamento_id?: string
          quantidade?: number
          tipo?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          categoria_id: string | null
          conta_bancaria: string
          conta_destino: string | null
          created_at: string
          data_emissao: string
          data_esperada: string
          data_realizada: string | null
          descricao: string
          forma_pagamento: string | null
          fornecedor_cliente: string | null
          frequencia_repeticao: string | null
          id: string
          lancamento_pai_id: string | null
          meses_recorrencia: number | null
          numero_parcelas: number | null
          pago: boolean
          parcela_numero: number | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          conta_bancaria: string
          conta_destino?: string | null
          created_at?: string
          data_emissao?: string
          data_esperada: string
          data_realizada?: string | null
          descricao: string
          forma_pagamento?: string | null
          fornecedor_cliente?: string | null
          frequencia_repeticao?: string | null
          id?: string
          lancamento_pai_id?: string | null
          meses_recorrencia?: number | null
          numero_parcelas?: number | null
          pago?: boolean
          parcela_numero?: number | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          conta_bancaria?: string
          conta_destino?: string | null
          created_at?: string
          data_emissao?: string
          data_esperada?: string
          data_realizada?: string | null
          descricao?: string
          forma_pagamento?: string | null
          fornecedor_cliente?: string | null
          frequencia_repeticao?: string | null
          id?: string
          lancamento_pai_id?: string | null
          meses_recorrencia?: number | null
          numero_parcelas?: number | null
          pago?: boolean
          parcela_numero?: number | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_lancamento_pai_id_fkey"
            columns: ["lancamento_pai_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          menu_item: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          menu_item: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          menu_item?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      metas_gastos: {
        Row: {
          categoria_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          modelo_gestao: string
          observacoes: string | null
          periodo: string
          updated_at: string
          valor_meta: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          modelo_gestao?: string
          observacoes?: string | null
          periodo: string
          updated_at?: string
          valor_meta: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          modelo_gestao?: string
          observacoes?: string | null
          periodo?: string
          updated_at?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave_acesso: string
          cliente_cnpj: string | null
          cliente_nome: string
          cnpj_emitente: string
          created_at: string
          data_emissao: string
          id: string
          modelo: string | null
          numero: string
          serie: string
          status: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          chave_acesso: string
          cliente_cnpj?: string | null
          cliente_nome: string
          cnpj_emitente: string
          created_at?: string
          data_emissao: string
          id?: string
          modelo?: string | null
          numero: string
          serie: string
          status?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string
          cliente_cnpj?: string | null
          cliente_nome?: string
          cnpj_emitente?: string
          created_at?: string
          data_emissao?: string
          id?: string
          modelo?: string | null
          numero?: string
          serie?: string
          status?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          aprovado_por_gestor: boolean | null
          assunto_proposta: string | null
          cliente_id: string | null
          cliente_nome: string
          comissao_percentual: number | null
          comissao_valor: number | null
          condicao_pagamento: string | null
          created_at: string
          custos_variaveis: Json | null
          data_aprovacao: string | null
          data_aprovacao_gestor: string | null
          data_criacao: string
          data_negociacao: string | null
          data_vencimento: string | null
          desconto_percentual: number | null
          descricao: string | null
          equipamento: string
          forma_pagamento: string | null
          frete: string | null
          garantia: string | null
          id: string
          impostos_percentual: number | null
          impostos_valor: number | null
          margem_contribuicao: number | null
          numero: string
          numero_nf: string | null
          numero_nota_entrada: string | null
          observacoes: string | null
          observacoes_nota: string | null
          ordem_referencia: string | null
          ordem_servico_id: string | null
          pdf_nota_fiscal: string | null
          percentuais_customizados: Json | null
          percentual_margem: number | null
          prazo_entrega: string | null
          prazo_pagamento: number | null
          preco_desejado: number | null
          status: string
          status_negociacao: string | null
          total_custos_variaveis: number | null
          updated_at: string
          validade_proposta: string | null
          valor: number
        }
        Insert: {
          aprovado_por_gestor?: boolean | null
          assunto_proposta?: string | null
          cliente_id?: string | null
          cliente_nome: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string
          custos_variaveis?: Json | null
          data_aprovacao?: string | null
          data_aprovacao_gestor?: string | null
          data_criacao?: string
          data_negociacao?: string | null
          data_vencimento?: string | null
          desconto_percentual?: number | null
          descricao?: string | null
          equipamento: string
          forma_pagamento?: string | null
          frete?: string | null
          garantia?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero: string
          numero_nf?: string | null
          numero_nota_entrada?: string | null
          observacoes?: string | null
          observacoes_nota?: string | null
          ordem_referencia?: string | null
          ordem_servico_id?: string | null
          pdf_nota_fiscal?: string | null
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: number | null
          preco_desejado?: number | null
          status?: string
          status_negociacao?: string | null
          total_custos_variaveis?: number | null
          updated_at?: string
          validade_proposta?: string | null
          valor?: number
        }
        Update: {
          aprovado_por_gestor?: boolean | null
          assunto_proposta?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string
          custos_variaveis?: Json | null
          data_aprovacao?: string | null
          data_aprovacao_gestor?: string | null
          data_criacao?: string
          data_negociacao?: string | null
          data_vencimento?: string | null
          desconto_percentual?: number | null
          descricao?: string | null
          equipamento?: string
          forma_pagamento?: string | null
          frete?: string | null
          garantia?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          margem_contribuicao?: number | null
          numero?: string
          numero_nf?: string | null
          numero_nota_entrada?: string | null
          observacoes?: string | null
          observacoes_nota?: string | null
          ordem_referencia?: string | null
          ordem_servico_id?: string | null
          pdf_nota_fiscal?: string | null
          percentuais_customizados?: Json | null
          percentual_margem?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: number | null
          preco_desejado?: number | null
          status?: string
          status_negociacao?: string | null
          total_custos_variaveis?: number | null
          updated_at?: string
          validade_proposta?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          cliente_nome: string
          created_at: string
          data_analise: string | null
          data_entrada: string
          descricao_problema: string | null
          equipamento: string
          id: string
          numero_ordem: string
          observacoes_tecnicas: string | null
          orcamento_id: string | null
          pdf_nota_fiscal: string | null
          pecas_necessarias: Json | null
          prioridade: string
          recebimento_id: number | null
          servicos_necessarios: Json | null
          solucao_proposta: string | null
          status: string
          tecnico: string | null
          tempo_estimado: string | null
          tipo_problema: string | null
          updated_at: string
          usinagem_necessaria: Json | null
          valor_estimado: number | null
        }
        Insert: {
          cliente_nome: string
          created_at?: string
          data_analise?: string | null
          data_entrada: string
          descricao_problema?: string | null
          equipamento: string
          id?: string
          numero_ordem: string
          observacoes_tecnicas?: string | null
          orcamento_id?: string | null
          pdf_nota_fiscal?: string | null
          pecas_necessarias?: Json | null
          prioridade?: string
          recebimento_id?: number | null
          servicos_necessarios?: Json | null
          solucao_proposta?: string | null
          status?: string
          tecnico?: string | null
          tempo_estimado?: string | null
          tipo_problema?: string | null
          updated_at?: string
          usinagem_necessaria?: Json | null
          valor_estimado?: number | null
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          data_analise?: string | null
          data_entrada?: string
          descricao_problema?: string | null
          equipamento?: string
          id?: string
          numero_ordem?: string
          observacoes_tecnicas?: string | null
          orcamento_id?: string | null
          pdf_nota_fiscal?: string | null
          pecas_necessarias?: Json | null
          prioridade?: string
          recebimento_id?: number | null
          servicos_necessarios?: Json | null
          solucao_proposta?: string | null
          status?: string
          tecnico?: string | null
          tempo_estimado?: string | null
          tipo_problema?: string | null
          updated_at?: string
          usinagem_necessaria?: Json | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_nfe: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          ncm: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          ncm?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          ncm?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      recebimentos: {
        Row: {
          ambiente_trabalho: string | null
          camisa: string | null
          categoria_equipamento: string | null
          chave_acesso_nfe: string | null
          cliente_cnpj: string | null
          cliente_id: string | null
          cliente_nome: string
          conexao_a: string | null
          conexao_b: string | null
          created_at: string
          curso: string | null
          data_analise: string | null
          data_entrada: string
          data_nota_retorno: string | null
          fluido_trabalho: string | null
          haste_comprimento: string | null
          id: number
          local_instalacao: string | null
          na_empresa: boolean | null
          nota_fiscal: string | null
          nota_fiscal_id: string | null
          numero_ordem: string
          numero_serie: string | null
          observacoes: string | null
          pdf_nota_retorno: string | null
          potencia: string | null
          pressao_trabalho: string | null
          status: string | null
          temperatura_trabalho: string | null
          tipo_equipamento: string
          updated_at: string
          urgente: boolean | null
        }
        Insert: {
          ambiente_trabalho?: string | null
          camisa?: string | null
          categoria_equipamento?: string | null
          chave_acesso_nfe?: string | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome: string
          conexao_a?: string | null
          conexao_b?: string | null
          created_at?: string
          curso?: string | null
          data_analise?: string | null
          data_entrada?: string
          data_nota_retorno?: string | null
          fluido_trabalho?: string | null
          haste_comprimento?: string | null
          id?: number
          local_instalacao?: string | null
          na_empresa?: boolean | null
          nota_fiscal?: string | null
          nota_fiscal_id?: string | null
          numero_ordem: string
          numero_serie?: string | null
          observacoes?: string | null
          pdf_nota_retorno?: string | null
          potencia?: string | null
          pressao_trabalho?: string | null
          status?: string | null
          temperatura_trabalho?: string | null
          tipo_equipamento: string
          updated_at?: string
          urgente?: boolean | null
        }
        Update: {
          ambiente_trabalho?: string | null
          camisa?: string | null
          categoria_equipamento?: string | null
          chave_acesso_nfe?: string | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          conexao_a?: string | null
          conexao_b?: string | null
          created_at?: string
          curso?: string | null
          data_analise?: string | null
          data_entrada?: string
          data_nota_retorno?: string | null
          fluido_trabalho?: string | null
          haste_comprimento?: string | null
          id?: number
          local_instalacao?: string | null
          na_empresa?: boolean | null
          nota_fiscal?: string | null
          nota_fiscal_id?: string | null
          numero_ordem?: string
          numero_serie?: string | null
          observacoes?: string | null
          pdf_nota_retorno?: string | null
          potencia?: string | null
          pressao_trabalho?: string | null
          status?: string | null
          temperatura_trabalho?: string | null
          tipo_equipamento?: string
          updated_at?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      testes_equipamentos: {
        Row: {
          check_ok: boolean | null
          check_vazamento_haste: boolean | null
          check_vazamento_pistao: boolean | null
          check_vazamento_vedacoes_estaticas: boolean | null
          created_at: string
          curso: string | null
          data_hora_teste: string
          espessura_camada: string | null
          id: string
          observacao: string | null
          observacoes_teste: string | null
          ordem_servico_id: string
          pressao_avanco: string | null
          pressao_maxima_trabalho: string | null
          pressao_retorno: string | null
          pressao_teste: string | null
          qtd_ciclos: string | null
          resultado_teste: string
          temperatura_operacao: string | null
          tempo_minutos: string | null
          teste_performance_pr004: string | null
          tipo_teste: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          check_ok?: boolean | null
          check_vazamento_haste?: boolean | null
          check_vazamento_pistao?: boolean | null
          check_vazamento_vedacoes_estaticas?: boolean | null
          created_at?: string
          curso?: string | null
          data_hora_teste: string
          espessura_camada?: string | null
          id?: string
          observacao?: string | null
          observacoes_teste?: string | null
          ordem_servico_id: string
          pressao_avanco?: string | null
          pressao_maxima_trabalho?: string | null
          pressao_retorno?: string | null
          pressao_teste?: string | null
          qtd_ciclos?: string | null
          resultado_teste: string
          temperatura_operacao?: string | null
          tempo_minutos?: string | null
          teste_performance_pr004?: string | null
          tipo_teste: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          check_ok?: boolean | null
          check_vazamento_haste?: boolean | null
          check_vazamento_pistao?: boolean | null
          check_vazamento_vedacoes_estaticas?: boolean | null
          created_at?: string
          curso?: string | null
          data_hora_teste?: string
          espessura_camada?: string | null
          id?: string
          observacao?: string | null
          observacoes_teste?: string | null
          ordem_servico_id?: string
          pressao_avanco?: string | null
          pressao_maxima_trabalho?: string | null
          pressao_retorno?: string | null
          pressao_teste?: string | null
          qtd_ciclos?: string | null
          resultado_teste?: string
          temperatura_operacao?: string | null
          tempo_minutos?: string | null
          teste_performance_pr004?: string | null
          tipo_teste?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testes_equipamentos_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_nota_fiscal: {
        Args: { nota_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_atividade: {
        Args: {
          p_descricao: string
          p_entidade_id?: string
          p_entidade_tipo?: string
          p_metadados?: Json
          p_tipo: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "operador"],
    },
  },
} as const
