import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full select-none",
  {
    variants: {
      size: {
        xs: "size-6 text-[10px]",
        sm: "size-8 text-[11px]",
        default: "size-10 text-[13px]",
        lg: "size-12 text-[15px]",
        xl: "size-16 text-lg",
        "2xl": "size-24 text-2xl",
      },
    },
    defaultVariants: { size: "default" },
  },
);

function Avatar({ className, size, ...props }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full",
        "font-semibold tracking-tight",
        "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

/* 🆕 Story ring — conic gradient, hover scale */
function AvatarRing({ children, seen = false, className, ...props }) {
  return (
    <div
      data-slot="avatar-ring"
      className={cn(
        "relative inline-flex rounded-full p-[2.5px]",
        "transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
        "hover:scale-[1.05]",
        seen ? "bg-[var(--border)]" : "bg-grad-ring",
        className,
      )}
      {...props}
    >
      <div className="rounded-full bg-[var(--background)] p-[2px]">
        {children}
      </div>
    </div>
  );
}

/* 🆕 Online status dot */
function AvatarStatus({ status = "offline", className }) {
  const colors = {
    online: "bg-[var(--success)]",
    away: "bg-[var(--warning)]",
    busy: "bg-[var(--danger)]",
    offline: "bg-[var(--muted-foreground)]",
  };
  return (
    <span
      aria-label={`Status: ${status}`}
      className={cn(
        "absolute bottom-0 right-0 size-3 rounded-full",
        "border-2 border-[var(--background)]",
        colors[status] || colors.offline,
        className,
      )}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarRing, AvatarStatus };
