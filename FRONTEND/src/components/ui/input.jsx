import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, leftIcon, rightIcon, ...props }) {
  const hasLeft = !!leftIcon;
  const hasRight = !!rightIcon;

  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl px-3.5 py-2 text-sm",
        "bg-[var(--surface)] text-[var(--foreground)]",
        "border border-[var(--border)]",
        "placeholder:text-[var(--muted-foreground)] placeholder:font-normal",
        "selection:bg-[var(--primary)]/25 selection:text-[var(--foreground)]",
        "transition-[border-color,box-shadow,background-color] duration-200",
        // outline NEVER
        "outline-none focus:outline-none focus-visible:outline-none",
        // hover
        "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40",
        // focus — soft glow ring, no harsh outline
        "focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        // invalid
        "aria-invalid:border-[var(--danger)]/50 aria-invalid:ring-2 aria-invalid:ring-[var(--danger)]/15",
        // disabled
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]",
        // file input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-[var(--foreground)]",
        hasLeft && "pl-10",
        hasRight && "pr-10",
        className,
      )}
      {...props}
    />
  );

  if (!hasLeft && !hasRight) return input;

  return (
    <div className="relative w-full">
      {hasLeft && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] [&_svg]:size-4">
          {leftIcon}
        </span>
      )}
      {input}
      {hasRight && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] [&_svg]:size-4">
          {rightIcon}
        </span>
      )}
    </div>
  );
}

export { Input };
