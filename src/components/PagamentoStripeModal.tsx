import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, CreditCard, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePagamentosStripe } from '@/hooks/use-pagamentos-stripe';

interface PagamentoStripeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: {
    id: string;
    numero: string;
    cliente_nome: string;
    valor: number;
  } | null;
}

const statusLabel: Record<string, string> = {
  pendente: 'Aguardando pagamento',
  pago: 'Pago',
  falhou: 'Falhou / expirou',
  reembolsado: 'Reembolsado',
};

const statusColor: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  pago: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  falhou: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  reembolsado: 'bg-muted text-muted-foreground',
};

export function PagamentoStripeModal({ open, onOpenChange, orcamento }: PagamentoStripeModalProps) {
  const [email, setEmail] = useState('');
  const { pagamentos, loading, gerando, gerarLinkPagamento, refetch } = usePagamentosStripe(
    open ? orcamento?.id : undefined,
  );

  const copiar = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const handleGerar = async () => {
    const url = await gerarLinkPagamento(email.trim());
    if (url) window.open(url, '_blank');
  };

  const pagamentoPendente = pagamentos.find((p) => p.status === 'pendente');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento online — Proposta {orcamento?.numero}
          </DialogTitle>
          <DialogDescription>
            Gere um link seguro para o cliente pagar com cartão de crédito ou transferência
            bancária americana (ACH). A confirmação dá baixa automática no financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-4 text-sm">
            <p>
              <span className="font-medium">Cliente:</span> {orcamento?.cliente_nome}
            </p>
            <p>
              <span className="font-medium">Valor:</span> $&nbsp;
              {Number(orcamento?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-pagamento">E-mail do cliente (opcional)</Label>
            <Input
              id="email-pagamento"
              type="email"
              placeholder="cliente@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleGerar} disabled={gerando || !orcamento}>
              {gerando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Gerar link de pagamento
            </Button>
            {pagamentoPendente?.checkout_url && (
              <Button variant="outline" onClick={() => copiar(pagamentoPendente.checkout_url!)}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar último link
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={refetch} title="Atualizar">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pagamentos desta proposta</p>
            {pagamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento gerado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pagamentos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor[p.status]}>{statusLabel[p.status]}</Badge>
                        <span className="font-medium">
                          $ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleString('pt-BR')}
                        {p.paid_at && ` • pago em ${new Date(p.paid_at).toLocaleString('pt-BR')}`}
                        {p.metodo && ` • ${p.metodo === 'card' ? 'cartão' : 'transferência'}`}
                      </p>
                    </div>
                    {p.checkout_url && p.status === 'pendente' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copiar(p.checkout_url!)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(p.checkout_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
