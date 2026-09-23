const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY = 'https://ai.gateway.lovable.dev';
const MAX_BYTES = 13 * 1024 * 1024; // abaixo do limite de 14MB do modelo de transcrição

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const instrucoes = (idioma: string) => {
  const lang =
    idioma === 'pt-BR' ? 'português do Brasil' : idioma === 'es' ? 'espanhol' : 'inglês';
  return `Você é um engenheiro de manutenção hidráulica que redige laudos técnicos.
Receberá a fala livre de um técnico (possivelmente com gírias, repetições e erros de transcrição).
Reescreva como laudo técnico formal, em ${lang}, organizado em tópicos numerados por componente.

Formato obrigatório de saída (texto puro, sem markdown, sem asteriscos):
1. Nome do Componente
Descrição objetiva e formal do problema encontrado, causa provável quando mencionada.

2. Nome do Componente
...

Regras:
- Use apenas informação presente na fala; não invente medidas, causas ou componentes.
- Preserve números, medidas, unidades, materiais e códigos exatamente como ditos (ex.: Ø25,4 mm (1")).
- Uma linha em branco entre tópicos. Sem introdução nem conclusão.
- Se a fala não trouxer conteúdo técnico, devolva o texto corrigido em uma única frase.`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'LOVABLE_API_KEY não configurada' }, 500);

  try {
    const declarado = Number(req.headers.get('content-length') || '0');
    if (declarado > MAX_BYTES + 1024 * 1024) {
      return json({ error: 'Áudio muito longo. Grave trechos menores.' }, 413);
    }

    const form = await req.formData();
    const file = form.get('file');
    const idioma = String(form.get('language') || 'pt-BR');
    const textoAtual = String(form.get('current') || '');

    if (!(file instanceof File) || file.size < 2048) {
      return json({ error: 'Gravação vazia. Grave novamente.' }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: 'Áudio muito longo. Grave trechos menores.' }, 413);
    }
    const nome = file.name || 'recording.wav';
    const tipoValido =
      file.type.startsWith('audio/') ||
      file.type === 'application/octet-stream' ||
      /\.(wav|mp3|m4a|webm|ogg|flac)$/i.test(nome);
    if (!tipoValido) {
      return json({ error: 'Formato de áudio não suportado.' }, 400);
    }

    // 1) Transcrição — o modelo exige MIME audio/*
    const extensao = (nome.split('.').pop() || 'wav').toLowerCase();
    const mime = file.type.startsWith('audio/') ? file.type : `audio/${extensao === 'm4a' ? 'mp4' : extensao}`;
    const audioFile = new File([await file.arrayBuffer()], nome, { type: mime });

    const upstreamForm = new FormData();
    upstreamForm.append('model', 'google/gemini-3.5-transcribe');
    upstreamForm.append('file', audioFile, nome);
    upstreamForm.append('response_format', 'json');
    upstreamForm.append('language', idioma);


    const trRes = await fetch(`${GATEWAY}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'fetch' },
      body: upstreamForm,
    });

    if (!trRes.ok) {
      const detalhe = await trRes.text();
      console.error('Falha na transcrição:', trRes.status, detalhe);
      return json({ error: 'Não foi possível transcrever o áudio.', status: trRes.status }, trRes.status);
    }

    const trJson = await trRes.json();
    const transcript = String(trJson?.text ?? '').trim();
    if (!transcript) {
      return json({ error: 'Nenhuma fala reconhecida. Grave novamente.' }, 400);
    }

    // 2) Organização em tópicos formais (streaming consumido no servidor)
    const partes = [
      textoAtual.trim()
        ? `Laudo já existente (mantenha e complemente, renumerando os tópicos):\n${textoAtual.trim()}\n\n`
        : '',
      `Fala do técnico:\n${transcript}`,
    ].join('');

    const aiRes = await fetch(`${GATEWAY}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        instructions: instrucoes(idioma),
        input: partes,
        stream: true,
        reasoning: { effort: 'low', summary: 'auto' },
        include: ['reasoning.encrypted_content'],
        store: false,
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const detalhe = await aiRes.text();
      console.error('Falha na organização do laudo:', aiRes.status, detalhe);
      return json({ error: 'Não foi possível organizar o laudo.', transcript }, aiRes.status || 500);
    }

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let texto = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const linhas = buffer.split('\n');
      buffer = linhas.pop() ?? '';
      for (const linha of linhas) {
        if (!linha.startsWith('data:')) continue;
        const dados = linha.slice(5).trim();
        if (!dados || dados === '[DONE]') continue;
        try {
          const evento = JSON.parse(dados);
          if (evento.type === 'response.output_text.delta' && typeof evento.delta === 'string') {
            texto += evento.delta;
          } else if (evento.type === 'response.completed' && !texto) {
            texto = String(evento?.response?.output_text ?? '');
          }
        } catch {
          // ignora fragmentos não-JSON
        }
      }
    }

    const laudo = texto.trim() || transcript;
    return json({ transcript, laudo });
  } catch (error) {
    console.error('Erro em laudo-tecnico-voz:', error);
    return json({ error: (error as Error).message || 'Erro inesperado' }, 500);
  }
});
