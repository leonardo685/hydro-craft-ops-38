import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Trophy, Users, Mail, MessageCircle } from "lucide-react";

export function CotacoesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cotações & RFQ</CardTitle>
            <Badge variant="secondary">Em breve — Fase 2</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Estrutura do processo de cotação que será habilitada na próxima fase, reaproveitando
            os fornecedores já cadastrados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: FileText,
                titulo: "1. Criar cotação",
                texto: "Selecione itens de uma ou mais ordens aprovadas e monte a RFQ.",
              },
              {
                icon: Users,
                titulo: "2. Escolher fornecedores",
                texto: "Multi-seleção a partir da base já cadastrada, com sugestão por categoria e histórico.",
              },
              {
                icon: Send,
                titulo: "3. Envio automático",
                texto: "Disparo via n8n para e-mail e WhatsApp com link público sem login.",
              },
              {
                icon: MessageCircle,
                titulo: "4. Resposta do fornecedor",
                texto: "Fornecedor preenche preço, prazo de entrega e validade direto pelo link.",
              },
              {
                icon: Trophy,
                titulo: "5. Comparativo",
                texto: "Matriz item × fornecedor com melhor preço destacado e aprovação por item.",
              },
              {
                icon: Mail,
                titulo: "6. Pedido de compra",
                texto: "Gera pedido com prazo 28 DDL (ou negociado) e move o Kanban para Comprado.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.titulo} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">{step.titulo}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.texto}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novos campos disponíveis em Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>WhatsApp</strong> e <strong>e-mail de cotação</strong> dedicados</li>
            <li><strong>Prazo de pagamento padrão</strong> (em dias, default 28 DDL) — usado no DPO do dashboard</li>
            <li><strong>Rating</strong> de 1 a 5 para priorização</li>
            <li><strong>Categorias</strong> de atuação (peças, usinagem, serviços...)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Edite cada fornecedor em Cadastros para preencher esses campos. Eles serão usados
            automaticamente quando o módulo de cotações for liberado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}