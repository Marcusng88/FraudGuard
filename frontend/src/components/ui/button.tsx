import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 cyber-glow hover:shadow-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-fraud",
        outline: "border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-accent/20 hover:text-accent-foreground hover:border-accent/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-secondary-foreground hover:shadow-[0_0_20px_hsl(var(--secondary)/0.3)]",
        ghost: "hover:bg-accent/20 hover:text-accent-foreground backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline neon-text",
        cyber: "bg-gradient-cyber text-primary-foreground hover:shadow-glow hover:scale-105 neon-text border border-primary/30",
        glass: "bg-card/20 backdrop-blur-md border border-border/30 text-foreground hover:bg-card/40 hover:text-foreground hover:shadow-glass",
        glow: "bg-accent text-accent-foreground hover:shadow-[0_0_30px_hsl(var(--accent)/0.6)] hover:scale-105 neon-text",
        fraud: "bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 hover:text-destructive fraud-alert animate-pulse-glow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
