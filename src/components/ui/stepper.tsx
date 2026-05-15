import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number;
}

const StepperContext = React.createContext<{ activeStep: number }>({
  activeStep: 0,
});

export function Stepper({ activeStep, className, children, ...props }: StepperProps) {
  return (
    <StepperContext.Provider value={{ activeStep }}>
      <div className={cn("flex items-center justify-between", className)} {...props}>
        {children}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
  title: string;
}

export function Step({ step, title, className, ...props }: StepProps) {
  const { activeStep } = React.useContext(StepperContext);
  const isCompleted = activeStep > step;
  const isActive = activeStep === step;

  return (
    <div className={cn("flex flex-col items-center gap-2 relative z-10", className)} {...props}>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
          isActive
            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            : isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted bg-background text-muted-foreground"
        )}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : step}
      </div>
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          isActive ? "text-foreground" : isCompleted ? "text-foreground/80" : "text-muted-foreground"
        )}
      >
        {title}
      </span>
    </div>
  );
}

export function StepperSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("flex-1 h-0.5 mx-2 bg-muted relative -top-3", className)}>
      <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style={{ width: "100%" }} />
    </div>
  );
}
