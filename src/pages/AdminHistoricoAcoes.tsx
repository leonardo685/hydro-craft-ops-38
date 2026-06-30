import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History, RotateCcw, ShieldAlert } from "lucide-react";

interface Acao {
  id: string;
  tipo: string;
  descricao: string;
  user_nome: string | null;
  user_email: string | null;
  entidade_principal_tipo: string | null;
  entidade_principal_id: string | null;
  estado_anterior: any;
  estado_novo: any;
  desfeita: boolean;
  desfeita_em: string | null;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  orcamento_aprovado: "Orçamento aprovado",
};

export default function AdminHistoricoAcoes() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("pendentes");
  const [acaoSelecionada, setAcaoSelecionada] = useState<Acao | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  const isAdmin = userRole === "admin";

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("acoes_reversiveis")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível carregar o histórico", variant: "destructive" });
    } else {
      setAcoes((data || []) as Acao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) carregar();
    else setLoading(false);
  }, [isAdmin]);

  const desfazer = async (acao: Acao) => {
    setDesfazendo(true);
    try {
      if (acao.tipo === "orcamento_aprovado") {
        const prev = acao.estado_anterior || {};
        const orcPrev = prev.orcamento || {};
        const osPrev = prev.ordem_servico;

        const { error: errOrc } = await supabase
          .from("orcamentos")
          .update({
            status: orcPrev.status ?? "pendente",
            data_aprovacao: orcPrev.data_aprovacao ?? null,
            valor: orcPrev.valor ?? undefined,
            prazo_pagamento: orcPrev.prazo_pagamento ?? null,
            data_vencimento: orcPrev.data_vencimento ?? null,
            numero_pedido: orcPrev.numero_pedido ?? null,
            descricao: orcPrev.descricao ?? null,
          })
          .eq("id", acao.entidade_principal_id!);
        if (errOrc) throw errOrc;

        if (osPrev?.id) {
          const { error: errOs } = await supabase
            .from("ordens_servico")
            .update({
              status: osPrev.status ?? "pendente",
              orcamento_id: osPrev.orcamento_id ?? null,
              valor_estimado: osPrev.valor_estimado ?? null,
            })
            .eq("id", osPrev.id);
          if (errOs) throw errOs;
        }
      } else {
        throw new Error(`Tipo de ação não suportado para desfazer: ${acao.tipo}`);
      }

      const { data: userRes } = await supabase.auth.getUser();
      const { error: errMark } = await supabase
        .from("acoes_reversiveis")
        .update({
          desfeita: true,
          desfeita_em: new Date().toISOString(),
          desfeita_por: userRes?.user?.id ?? null,
        })
        .eq("id", acao.id);
      if (errMark) throw errMark;

      toast({ title: "Ação desfeita", description: acao.descricao });
      setAcaoSelecionada(null);
      carregar();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao desfazer",
        description: e.message || "Falha ao reverter a ação",
        variant: "destructive",
      });
    } finally {
      setDesfazendo(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="p-8 text-center space-y-4">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground">
            Apenas administradores podem visualizar o histórico de ações.
          </p>
        </Card>
      </div>
    );
  }

  const filtradas = acoes.filter((a) => {
    if (filtroStatus === "pendentes" && a.desfeita) return false;
    if (filtroStatus === "desfeitas" && !a.desfeita) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const hay = `${a.descricao} ${a.user_nome || ""} ${a.user_email || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Histórico de Ações</h1>
          <p className="text-sm text-muted-foreground">
            Visualize e desfaça ações realizadas por usuários (apenas admin).
          </p>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Buscar por descrição, usuário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="pendentes">Não desfeitas</SelectItem>
            <SelectItem value="desfeitas">Desfeitas</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : filtradas.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ação encontrada.</TableCell></TableRow>
            ) : (
              filtradas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_LABEL[a.tipo] || a.tipo}</Badge>
                  </TableCell>
                  <TableCell>{a.descricao}</TableCell>
                  <TableCell className="text-sm">
                    {a.user_nome || a.user_email || "—"}
                  </TableCell>
                  <TableCell>
                    {a.desfeita ? (
                      <Badge variant="secondary">Desfeita</Badge>
                    ) : (
                      <Badge>Ativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!a.desfeita && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAcaoSelecionada(a)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Desfazer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!acaoSelecionada} onOpenChange={(o) => !o && setAcaoSelecionada(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação restaurará o estado anterior. Para "Orçamento aprovado",
              o orçamento voltará para <strong>aguardando aprovação</strong> e a OS
              vinculada (se houver) voltará ao status anterior.
              <br /><br />
              <strong>{acaoSelecionada?.descricao}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={desfazendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={desfazendo}
              onClick={(e) => {
                e.preventDefault();
                if (acaoSelecionada) desfazer(acaoSelecionada);
              }}
            >
              {desfazendo ? "Desfazendo..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}