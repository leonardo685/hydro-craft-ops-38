import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AceitarConviteRequest {
  user_id: string;
  convite_id: string;
  empresa_id: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_id, convite_id, empresa_id, role }: AceitarConviteRequest = await req.json();

    if (!user_id || !convite_id || !empresa_id || !role) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o convite é válido
    const { data: convite, error: conviteError } = await supabaseAdmin
      .from("convites_empresa")
      .select("*")
      .eq("id", convite_id)
      .eq("used", false)
      .single();

    if (conviteError || !convite) {
      return new Response(
        JSON.stringify({ error: "Convite inválido ou já utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Vincular usuário à empresa
    const { error: vinculoError } = await supabaseAdmin
      .from("user_empresas")
      .insert({
        user_id,
        empresa_id,
        is_owner: false
      });

    if (vinculoError) {
      console.error("Erro ao vincular usuário à empresa:", vinculoError);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular usuário à empresa", details: vinculoError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Atribuir role ao usuário
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id,
        role
      });

    if (roleError) {
      console.error("Erro ao atribuir role:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao atribuir role", details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Marcar convite como usado
    const { error: updateError } = await supabaseAdmin
      .from("convites_empresa")
      .update({
        used: true,
        used_at: new Date().toISOString(),
        used_by: user_id
      })
      .eq("id", convite_id);

    if (updateError) {
      console.error("Erro ao marcar convite como usado:", updateError);
    }

    console.log(`Convite aceito com sucesso. User: ${user_id}, Empresa: ${empresa_id}, Role: ${role}`);

    return new Response(
      JSON.stringify({ success: true, message: "Convite aceito com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao aceitar convite:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
