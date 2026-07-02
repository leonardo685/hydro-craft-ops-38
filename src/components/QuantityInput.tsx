import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [display, setDisplay] = useState<string>(String(value ?? min));

  useEffect(() => {
    setDisplay(String(value ?? min));
  }, [value]);

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
    setDisplay(inputValue);
    if (inputValue === '') return;
    const newValue = parseInt(inputValue);
    if (isNaN(newValue)) return;
    if (max && newValue > max) return;
    onChange(newValue);
  };

  const handleBlur = () => {
    const parsed = parseInt(display);
    if (display === '' || isNaN(parsed) || parsed < min) {
      onChange(min);
      setDisplay(String(min));
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
        value={display}
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
