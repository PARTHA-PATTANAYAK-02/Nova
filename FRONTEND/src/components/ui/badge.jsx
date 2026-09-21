import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold w-fit whitespace-nowrap shrink-0 overflow-hidden transition-colors duration-200",
  "[&>svg]:size-3 [&>svg]:pointer-events-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40",
  "aria-invalid:ring-2 aria-invalid:ring-rose-500/20",
  {
    variants: {
      variant: {
        /* Primary — gradient */
        default:
          "border-transparent bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(124,92,255,0.35)]",

        /* Secondary — subtle glass */
        secondary: "border-white/10 bg-white/8 text-white/80 backdrop-blur-sm",

        /* Destructive — rose glass */
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-200 backdrop-blur-sm",

        /* Outline — border only */
        outline: "border-white/15 bg-transparent text-white/75",
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
