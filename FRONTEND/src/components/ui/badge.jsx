import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold w-fit whitespace-nowrap shrink-0 overflow-hidden transition-colors duration-200",
  "[&>svg]:size-3 [&>svg]:pointer-events-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted-foreground)]",
        destructive:
          "border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]",
        outline:
          "border-[var(--border-strong)] bg-transparent text-[var(--foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
