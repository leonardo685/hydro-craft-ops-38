import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteQuoteButtonProps {
  language: string;
  onClick: () => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export function DeleteQuoteButton({ language, onClick, disabled = false, showLabel = false }: DeleteQuoteButtonProps) {
  const label = language === 'en' ? 'Delete quote' : language === 'es' ? 'Eliminar presupuesto' : 'Apagar orçamento';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Trash2 className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
      {showLabel && label}
    </Button>
  );
}
