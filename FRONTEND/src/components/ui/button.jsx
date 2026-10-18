import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 shrink-0",
    "whitespace-nowrap select-none font-semibold tracking-[-0.005em]",
    "rounded-full",
    "transition-[transform,box-shadow,background-color,color,filter] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
    "active:scale-[.97]",
    "outline-none focus:outline-none focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-[var(--primary)]/45",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-grad-btn text-white " +
          "shadow-[0_8px_24px_-10px_var(--glow)] " +
          "hover:-translate-y-[2px] " +
          "hover:shadow-[0_16px_40px_-14px_var(--glow-strong)] " +
          "hover:brightness-[1.06]",
        soft:
          "bg-[var(--surface-2)] text-[var(--foreground)] " +
          "hover:bg-[var(--surface-3)] hover:-translate-y-[1px]",
        outline:
          "bg-transparent text-[var(--foreground)] border border-[var(--border-strong)] " +
          "hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/40 hover:-translate-y-[1px]",
        ghost:
          "bg-transparent text-[var(--foreground)]/75 " +
          "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        destructive:
          "bg-[var(--danger)]/12 text-[var(--danger)] " +
          "hover:bg-[var(--danger)]/20 hover:-translate-y-[1px]",
        gold:
          "bg-[var(--gold)]/12 text-[var(--gold)] " +
          "hover:bg-[var(--gold)]/20 hover:-translate-y-[1px]",
        link:
          "bg-transparent text-[var(--primary)] underline-offset-4 " +
          "hover:underline hover:text-[var(--primary-hover)] active:scale-100",
        "icon-ghost":
          "bg-transparent text-[var(--foreground)]/70 " +
          "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] active:scale-[.94]",
      },
      size: {
        sm: "h-8 px-3.5 text-[12.5px] gap-1.5 [&_svg]:size-3.5",
        default: "h-10 px-5 text-[13.5px] [&_svg]:size-4",
        lg: "h-12 px-7 text-[15px] [&_svg]:size-[18px]",
        xl: "h-14 px-8 text-[15.5px] [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-8 [&_svg]:size-4",
        "icon-lg": "size-12 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
