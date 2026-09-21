import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "flex h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white",
        // Placeholder
        "placeholder:text-white/30 placeholder:font-normal",
        // Selection
        "selection:bg-violet-500/40 selection:text-white",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-white/80",
        // Transition
        "transition-[color,box-shadow,border-color,background-color] duration-200 outline-none",
        // Focus
        "focus-visible:border-violet-400/50 focus-visible:bg-white/8 focus-visible:ring-2 focus-visible:ring-violet-400/20",
        // Invalid
        "aria-invalid:border-rose-500/50 aria-invalid:ring-2 aria-invalid:ring-rose-500/20",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Autofill override
        "autofill:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
