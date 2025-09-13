import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer relative h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-muted-foreground/30 bg-background transition-all duration-300",
      "before:absolute before:left-1/2 before:top-[45%] before:h-[10px] before:w-[6px]",
      "before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:scale-0",
      "before:border-b-2 before:border-r-2 before:border-solid before:border-b-primary-foreground before:border-r-primary-foreground",
      "before:opacity-0 before:transition-all before:delay-100 before:duration-200 before:ease-in before:content-['']",
      "after:absolute after:inset-0 after:rounded-md after:opacity-0",
      "after:shadow-[0_0_0_10px_hsl(var(--primary)/0.1)] after:transition-all after:duration-300 after:ease-in after:content-['']",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
      "data-[state=checked]:before:scale-110 data-[state=checked]:before:opacity-100",
      "hover:border-primary/60 hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      "[&:active:not([data-state=checked])]:after:opacity-100 [&:active:not([data-state=checked])]:after:shadow-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-primary-foreground opacity-0 data-[state=checked]:opacity-100 transition-opacity duration-200")}
    >
      <Check className="h-3 w-3 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
