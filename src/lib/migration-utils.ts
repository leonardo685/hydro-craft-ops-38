import { supabase } from '@/integrations/supabase/client';

// Utilitário para migrar dados do localStorage para Supabase
export const migrarDadosLocalStorage = async () => {
  try {
    console.log('Iniciando migração de dados do localStorage...');

    // Migrar recebimentos
    const recebimentosLocal = localStorage.getItem('recebimentos');
    if (recebimentosLocal) {
      const recebimentos = JSON.parse(recebimentosLocal);
      
      for (const rec of recebimentos) {
        // Buscar cliente por CNPJ se existir
        let cliente_id = null;
        if (rec.clienteCnpj) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('id')
            .eq('cnpj_cpf', rec.clienteCnpj)
            .single();
          
          cliente_id = clienteData?.id || null;
        }

        const recebimentoData = {
          numero_ordem: rec.numeroOrdem,
          cliente_id,
          cliente_nome: rec.clienteNome,
          cliente_cnpj: rec.clienteCnpj,
          data_entrada: rec.dataEntrada,
          nota_fiscal: rec.notaFiscal,
          chave_acesso_nfe: rec.chaveAcessoNfe,
          tipo_equipamento: rec.tipoEquipamento,
          numero_serie: rec.numeroSerie,
          pressao_trabalho: rec.pressaoTrabalho,
          temperatura_trabalho: rec.temperaturaTrabalho,
          fluido_trabalho: rec.fluidoTrabalho,
          local_instalacao: rec.localInstalacao,
          potencia: rec.potencia,
          observacoes: rec.observacoes,
          urgente: rec.urgente || false,
          na_empresa: rec.naEmpresa !== false,
          status: rec.status || 'recebido',
          data_analise: rec.dataAnalise
        };

        const { data: recebimentoCriado, error } = await supabase
          .from('recebimentos')
          .insert([recebimentoData])
          .select()
          .single();

        if (error) {
          console.error('Erro ao migrar recebimento:', error);
          continue;
        }

        // Migrar fotos se existirem
        if (rec.fotos && Array.isArray(rec.fotos)) {
          for (const foto of rec.fotos) {
            if (foto.base64) {
              try {
                // Converter base64 para blob
                const response = await fetch(foto.base64);
                const blob = await response.blob();
                
                const nomeArquivo = `${recebimentoCriado.id}/${Date.now()}_${foto.nome || 'foto.jpg'}`;
                
                // Upload para Supabase Storage
                const { error: uploadError } = await supabase.storage
                  .from('equipamentos')
                  .upload(nomeArquivo, blob);

                if (uploadError) {
                  console.error('Erro ao fazer upload da foto:', uploadError);
                  continue;
                }

                const { data: urlData } = supabase.storage
                  .from('equipamentos')
                  .getPublicUrl(nomeArquivo);

                // Salvar referência no banco
                await supabase
                  .from('fotos_equipamentos')
                  .insert([{
                    recebimento_id: recebimentoCriado.id,
                    arquivo_url: urlData.publicUrl,
                    nome_arquivo: foto.nome || 'foto.jpg',
                    apresentar_orcamento: foto.apresentarOrcamento || false
                  }]);
              } catch (fotoError) {
                console.error('Erro ao processar foto:', fotoError);
              }
            }
          }
        }
      }
      
      console.log(`Migrados ${recebimentos.length} recebimentos`);
    }

    // Migrar notas fiscais
    const notasFiscaisLocal = localStorage.getItem('notasFiscais');
    if (notasFiscaisLocal) {
      const notasFiscais = JSON.parse(notasFiscaisLocal);
      
      for (const nota of notasFiscais) {
        // Obter empresa_id do usuário atual
        const { data: userData } = await supabase.rpc('get_user_empresa_id');
        const empresaId = userData || null;
        
        if (!empresaId) {
          console.error('Erro: empresa_id não encontrado para migrar nota fiscal');
          continue;
        }

        const notaData = {
          chave_acesso: nota.chaveAcesso,
          cnpj_emitente: nota.cnpjEmitente,
          numero: nota.numero,
          serie: nota.serie,
          modelo: nota.modelo || '55',
          data_emissao: nota.dataEmissao,
          cliente_nome: nota.clienteNome,
          cliente_cnpj: nota.clienteCnpj,
          valor_total: nota.valorTotal,
          status: nota.status || 'processada',
          empresa_id: empresaId
        };

        const { data: notaCriada, error } = await supabase
          .from('notas_fiscais')
          .insert([notaData])
          .select()
          .single();

        if (error) {
          console.error('Erro ao migrar nota fiscal:', error);
          continue;
        }

        // Migrar itens da nota fiscal
        if (nota.itens && Array.isArray(nota.itens)) {
          const itensData = nota.itens.map((item: any) => ({
            nota_fiscal_id: notaCriada.id,
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: item.ncm,
            quantidade: parseFloat(item.quantidade),
            valor_unitario: parseFloat(item.valorUnitario),
            valor_total: parseFloat(item.valorTotal),
            empresa_id: empresaId
          }));

          await supabase
            .from('itens_nfe')
            .insert(itensData);
        }
      }
      
      console.log(`Migradas ${notasFiscais.length} notas fiscais`);
    }

    console.log('Migração concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro durante a migração:', error);
    throw error;
  }
};

// Função para limpar dados do localStorage após migração bem-sucedida
export const limparLocalStorageAposMigracao = () => {
  const chavesParaRemover = [
    'recebimentos',
    'notasFiscais',
    'lastRecebimentoId'
  ];
  
  chavesParaRemover.forEach(chave => {
    localStorage.removeItem(chave);
  });
  
  console.log('Dados do localStorage removidos após migração');
};