import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet({ ...props }) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/75 backdrop-blur-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({ className, children, side = "right", ...props }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          // Base
          "fixed z-50 flex flex-col gap-4",
          "bg-[#0d0d18]/95 backdrop-blur-2xl text-white",
          "shadow-[0_20px_60px_rgba(0,0,0,0.65)]",
          "transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",

          // Right
          side === "right" && [
            "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm",
            "border-l border-white/10 rounded-l-[28px]",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          ],

          // Left
          side === "left" && [
            "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm",
            "border-r border-white/10 rounded-r-[28px]",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          ],

          // Top
          side === "top" && [
            "inset-x-0 top-0 h-auto",
            "border-b border-white/10 rounded-b-[28px]",
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          ],

          // Bottom
          side === "bottom" && [
            "inset-x-0 bottom-0 h-auto",
            "border-t border-white/10 rounded-t-[28px]",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          ],

          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            "absolute top-4 right-4 z-10",
            "w-8 h-8 rounded-full flex items-center justify-center",
            "text-white/50 hover:text-white hover:bg-white/10",
            "transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40",
            "disabled:pointer-events-none",
          )}
        >
          <XIcon className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display font-semibold text-white", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-white/50 text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
