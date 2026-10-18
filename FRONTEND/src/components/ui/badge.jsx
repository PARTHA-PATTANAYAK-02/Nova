import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 w-fit shrink-0",
    "font-semibold tracking-tight whitespace-nowrap rounded-full",
    "transition-colors duration-200",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-grad-btn text-white shadow-[0_4px_12px_-4px_var(--glow)]",
        soft: "bg-[var(--surface-2)] text-[var(--foreground)]",
        outline:
          "bg-transparent border border-[var(--border-strong)] text-[var(--foreground)]",
        primary: "bg-[var(--primary)]/12 text-[var(--primary)]",
        success: "bg-[var(--success)]/12 text-[var(--success)]",
        warning: "bg-[var(--warning)]/12 text-[var(--warning)]",
        danger: "bg-[var(--danger)]/12 text-[var(--danger)]",
        gold: "bg-[var(--gold)]/12 text-[var(--gold)]",
      },
      size: {
        sm: "h-5 px-2 text-[10.5px]",
        default: "h-6 px-2.5 text-[11px]",
        lg: "h-7 px-3 text-[12px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
