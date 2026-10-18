import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full field-sizing-content rounded-xl px-3.5 py-2.5 text-sm",
        "bg-[var(--surface)] text-[var(--foreground)]",
        "border border-[var(--border)]",
        "placeholder:text-[var(--muted-foreground)] placeholder:font-normal",
        "selection:bg-[var(--primary)]/25 selection:text-[var(--foreground)]",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "outline-none focus:outline-none focus-visible:outline-none",
        "resize-y",
        "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40",
        "focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "aria-invalid:border-[var(--danger)]/50 aria-invalid:ring-2 aria-invalid:ring-[var(--danger)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
