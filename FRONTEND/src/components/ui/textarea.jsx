import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full field-sizing-content rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)]",
        "placeholder:text-[var(--muted-foreground)] placeholder:font-normal",
        "selection:bg-[var(--primary)]/25 selection:text-[var(--foreground)]",
        "transition-colors duration-200 outline-none resize-y",
        "hover:border-[var(--border-strong)]",
        "focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/15",
        "aria-invalid:border-[var(--danger)]/50 aria-invalid:ring-2 aria-invalid:ring-[var(--danger)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
