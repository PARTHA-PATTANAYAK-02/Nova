import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a18] aria-invalid:ring-rose-500/30 aria-invalid:border-rose-500/50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        /* Primary — gradient + glow */
        default:
          "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.35)] hover:opacity-95 hover:shadow-[0_0_28px_rgba(124,92,255,0.5)]",

        /* Destructive — rose */
        destructive:
          "bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50 focus-visible:ring-rose-400/40",

        /* Outline — glass with visible border */
        outline:
          "bg-white/5 text-white/90 border border-white/12 hover:bg-white/10 hover:border-white/25 hover:text-white",

        /* Secondary — subtle glass fill */
        secondary:
          "bg-white/8 text-white/90 border border-white/8 hover:bg-white/12 hover:border-white/15",

        /* Ghost — hover reveal */
        ghost: "text-white/70 hover:text-white hover:bg-white/8",

        /* Link — violet underlined */
        link: "text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-7 text-base has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
