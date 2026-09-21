import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base
        "flex min-h-20 w-full field-sizing-content rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white",
        // Placeholder
        "placeholder:text-white/30 placeholder:font-normal",
        // Selection
        "selection:bg-violet-500/40 selection:text-white",
        // Transition
        "transition-[color,box-shadow,border-color,background-color] duration-200 outline-none resize-y",
        // Focus
        "focus-visible:border-violet-400/50 focus-visible:bg-white/8 focus-visible:ring-2 focus-visible:ring-violet-400/20",
        // Invalid
        "aria-invalid:border-rose-500/50 aria-invalid:ring-2 aria-invalid:ring-rose-500/20",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
