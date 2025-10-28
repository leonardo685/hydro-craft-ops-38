import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const QuantityInput = ({ 
  value, 
  onChange, 
  min = 1, 
  max, 
  className 
}: QuantityInputProps) => {
  const handleIncrement = () => {
    const newValue = value + 1;
    if (!max || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - 1;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permite campo vazio temporariamente
    if (inputValue === '') {
      return;
    }
    
    const newValue = parseInt(inputValue);
    
    // Se não for um número válido, ignora
    if (isNaN(newValue)) {
      return;
    }
    
    // Se estiver dentro dos limites, atualiza
    if (newValue >= min && (!max || newValue <= max)) {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    // Quando sair do campo, se estiver abaixo do mínimo, força o mínimo
    if (value < min || isNaN(value)) {
      onChange(min);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleIncrement}
        disabled={max ? value >= max : false}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};
