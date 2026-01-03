/**
 * Envia um webhook com retry automático
 * @param webhookUrl URL do webhook
 * @param payload Dados a serem enviados
 * @param maxTentativas Número máximo de tentativas (padrão: 3)
 * @param intervaloRetry Intervalo entre tentativas em ms (padrão: 2000)
 * @returns true se enviado com sucesso, false caso contrário
 */
export const enviarWebhook = async (
  webhookUrl: string | null,
  payload: Record<string, any>,
  maxTentativas = 3,
  intervaloRetry = 2000
): Promise<boolean> => {
  if (!webhookUrl) {
    console.warn('⚠️ Webhook não configurado para esta empresa');
    return false;
  }

  // Sanitizar payload - substituir campos vazios/null/undefined por "."
  const sanitizePayload = (obj: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = (value === null || value === undefined || value === '') 
        ? '.' 
        : value;
    }
    return sanitized;
  };

  const payloadSanitizado = sanitizePayload(payload);
  
  console.log('📤 Payload para envio:', payloadSanitizado);

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      console.log(`📤 Tentativa ${tentativa}/${maxTentativas} de envio da notificação...`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadSanitizado)
      });

      if (response.ok) {
        console.log(`✅ Webhook enviado com sucesso na tentativa ${tentativa}`);
        return true;
      } else {
        console.error(`❌ Tentativa ${tentativa} falhou com status:`, response.status);
        if (tentativa < maxTentativas) {
          console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, intervaloRetry));
        }
      }
    } catch (error) {
      console.error(`❌ Erro na tentativa ${tentativa}:`, error);
      if (tentativa < maxTentativas) {
        console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, intervaloRetry));
      }
    }
  }

  console.error(`❌ Falha ao enviar webhook após ${maxTentativas} tentativas`);
  return false;
};
