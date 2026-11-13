import { MailCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { commercialEmailSentAt } from '@/lib/commercial-email';

export function EmailSentBadge({ quote, language }: { quote: Parameters<typeof commercialEmailSentAt>[0]; language: string }) {
  const sentAt = commercialEmailSentAt(quote);
  if (!sentAt) return null;
  const label = language === 'en' ? 'Sent' : language === 'es' ? 'Enviado' : 'Enviado';
  const date = new Date(sentAt).toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es' : 'pt-BR');
  return <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary" title={`${label}: ${date}`}>
    <MailCheck className="h-3.5 w-3.5" />{label}
  </Badge>;
}