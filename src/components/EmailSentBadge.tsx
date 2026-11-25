import { Mail, MailCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { commercialEmailSentAt, commercialEmailType } from '@/lib/commercial-email';

export function EmailSentBadge({ quote, language }: { quote: Parameters<typeof commercialEmailSentAt>[0]; language: string }) {
  if (!commercialEmailType(quote.status)) return null;
  const sentAt = commercialEmailSentAt(quote);
  const label = sentAt
    ? language === 'en' ? 'Email sent' : language === 'es' ? 'Email enviado' : 'E-mail enviado'
    : language === 'en' ? 'Email not sent' : language === 'es' ? 'Email no enviado' : 'E-mail não enviado';
  const date = sentAt ? new Date(sentAt).toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es' : 'pt-BR') : null;
  const Icon = sentAt ? MailCheck : Mail;
  const title = date ? `${label}: ${date}` : language === 'en'
    ? 'No recorded email send for this document.'
    : language === 'es' ? 'No hay envío de email registrado para este documento.' : 'Nenhum envio de e-mail registrado para este documento.';
  return <Badge variant="outline" className={`gap-1 whitespace-nowrap ${sentAt ? 'border-success/30 bg-success-soft text-success' : 'border-border bg-muted text-muted-foreground'}`} title={title} aria-label={title}>
    <Icon className="h-3.5 w-3.5 shrink-0" />{label}
  </Badge>;
}