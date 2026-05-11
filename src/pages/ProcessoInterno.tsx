import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Package, FileText, Wrench, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Atividade = {
  id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  metadados: any;
  entidade_tipo: string | null;
  entidade_id: string | null;
};

type StatusInfo = {
  area: string;
  status: string;
  detalhes?: string;
  link?: string;
  icon: typeof Package;
  variant?: "default" | "secondary" | "outline" | "destructive";
};

export default function ProcessoInterno() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [statusList, setStatusList] = useState<StatusInfo[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [resumo, setResumo] = useState<{ cliente?: string; equipamento?: string }>({});

  useEffect(() => {
    if (!numeroOrdem) return;
    const carregar = async () => {
      setLoading(true);
      try {
        const numero = numeroOrdem.toUpperCase();
        const ids: string[] = [];
        const list: StatusInfo[] = [];

        // Recebimento
        const { data: recs } = await supabase
          .from("recebimentos")
          .select("id, status, na_empresa, cliente_nome, tipo_equipamento, created_at, pdf_nota_retorno")
          .eq("numero_ordem", numero);
        if (recs && recs.length > 0) {
          const r = recs[0];
          setResumo((p) => ({ ...p, cliente: r.cliente_nome, equipamento: r.tipo_equipamento || p.equipamento }));
          ids.push(String(r.id));
          list.push({
            area: "Recebimento",
            status: r.status || (r.na_empresa ? "Na empresa" : "Retornado"),
            detalhes: `Entrada: ${format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
            link: `/recebimentos/${r.id}`,
            icon: Package,
            variant: "secondary",
          });
        }

        // Ordem de serviço
        const { data: ordens } = await supabase
          .from("ordens_servico")
          .select("id, status, cliente_nome, equipamento, data_entrada, tecnico, prioridade, descricao_problema")
          .eq("numero_ordem", numero);
        const ordem = ordens && ordens[0];
        if (ordem) {
          setResumo((p) => ({ cliente: ordem.cliente_nome || p.cliente, equipamento: ordem.equipamento || p.equipamento }));
          ids.push(ordem.id);
          list.push({
            area: "Ordem de Serviço",
            status: ordem.status,
            detalhes: ordem.tecnico ? `Técnico: ${ordem.tecnico}` : "Sem técnico atribuído",
            link: `/visualizar-ordem-servico/${ordem.id}`,
            icon: Wrench,
            variant: ordem.status === "finalizado" ? "default" : "secondary",
          });

          // Teste / Laudo
          const { data: testes } = await supabase
            .from("testes_equipamentos")
            .select("id, created_at")
            .eq("ordem_servico_id", ordem.id)
            .limit(1);
          list.push({
            area: "Laudo Técnico",
            status: testes && testes.length > 0 ? "Emitido" : "Pendente",
            icon: FileText,
            variant: testes && testes.length > 0 ? "default" : "outline",
          });

          // Compra
          const { data: compras } = await supabase
            .from("compras")
            .select("id, status, fornecedor")
            .eq("ordem_servico_id", ordem.id);
          if (compras && compras.length > 0) {
            list.push({
              area: "Compras",
              status: compras[0].status,
              detalhes: compras[0].fornecedor || undefined,
              icon: Package,
              variant: "secondary",
            });
          }
        }

        // Orçamento
        const { data: orcs } = await supabase
          .from("orcamentos")
          .select("id, numero, status, valor, cliente_nome, equipamento, ordem_referencia")
          .or(`ordem_referencia.eq.${numero},numero.eq.${numero}`);
        if (orcs && orcs.length > 0) {
          const o = orcs[0];
          setResumo((p) => ({ cliente: o.cliente_nome || p.cliente, equipamento: o.equipamento || p.equipamento }));
          ids.push(o.id);
          list.push({
            area: "Orçamento",
            status: o.status,
            detalhes: `Nº ${o.numero} • R$ ${Number(o.valor || 0).toFixed(2)}`,
            link: `/orcamentos`,
            icon: FileText,
            variant: o.status === "aprovado" ? "default" : "secondary",
          });
        }

        if (list.length === 0) {
          setNaoEncontrado(true);
        } else {
          setStatusList(list);
        }

        // Histórico de atividades
        if (ids.length > 0) {
          const { data: atvs } = await supabase
            .from("atividades_sistema")
            .select("id, tipo, descricao, created_at, metadados, entidade_tipo, entidade_id")
            .in("entidade_id", ids)
            .order("created_at", { ascending: false })
            .limit(50);
          setAtividades(atvs || []);
        }
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [numeroOrdem]);

  const statusIcon = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes("final") || lower.includes("aprov") || lower.includes("emit")) return CheckCircle2;
    if (lower.includes("cancel") || lower.includes("rejeit")) return XCircle;
    return Clock;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Processo Interno</h1>
            <p className="text-sm text-muted-foreground">Ordem {numeroOrdem}</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && naoEncontrado && (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Não localizamos a ordem {numeroOrdem} em nenhuma área do sistema.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !naoEncontrado && (
          <>
            {(resumo.cliente || resumo.equipamento) && (
              <Card>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {resumo.cliente && (
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{resumo.cliente}</p>
                    </div>
                  )}
                  {resumo.equipamento && (
                    <div>
                      <p className="text-muted-foreground">Equipamento</p>
                      <p className="font-medium">{resumo.equipamento}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status atual por área</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusList.map((s, i) => {
                  const Icon = s.icon;
                  const SIcon = statusIcon(s.status);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{s.area}</p>
                          <Badge variant={s.variant || "secondary"} className="gap-1">
                            <SIcon className="w-3 h-3" />
                            {s.status}
                          </Badge>
                        </div>
                        {s.detalhes && (
                          <p className="text-xs text-muted-foreground mt-1">{s.detalhes}</p>
                        )}
                      </div>
                      {s.link && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(s.link!)}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico do processo</CardTitle>
              </CardHeader>
              <CardContent>
                {atividades.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhuma atividade registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {atividades.map((a) => (
                      <div key={a.id} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{a.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                            {" • "}
                            {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}