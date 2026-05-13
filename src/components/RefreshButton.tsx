import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => Promise<unknown> | unknown;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

/**
 * Botão de atualização que recarrega dados sem alterar filtros.
 */
export function RefreshButton({
  onRefresh,
  label = "Atualizar",
  className,
  size = "sm",
  variant = "outline",
}: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      {label}
    </Button>
  );
}