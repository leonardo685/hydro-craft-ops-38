import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PagamentoStatusProps {
  sucesso: boolean;
}

export default function PagamentoStatus({ sucesso }: PagamentoStatusProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-10 text-center space-y-4">
          {sucesso ? (
            <>
              <CheckCircle2 className="h-14 w-14 mx-auto text-green-600" />
              <h1 className="text-2xl font-semibold text-foreground">Payment received</h1>
              <p className="text-muted-foreground">
                Thank you! Your payment was submitted successfully. Bank transfers (ACH) may take a
                few business days to clear. You will receive a receipt by e-mail.
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-14 w-14 mx-auto text-muted-foreground" />
              <h1 className="text-2xl font-semibold text-foreground">Payment canceled</h1>
              <p className="text-muted-foreground">
                No charge was made. You can reopen the payment link whenever you are ready.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
