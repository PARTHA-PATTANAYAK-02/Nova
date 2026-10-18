import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-[var(--border)] " +
            "!bg-[var(--surface)]/95 !backdrop-blur-xl !text-[var(--foreground)] " +
            "!shadow-[0_24px_64px_-16px_rgba(0,0,0,.28),0_8px_24px_-12px_var(--glow)]",
          title:
            "!text-sm !font-semibold !text-[var(--foreground)] !tracking-tight",
          description: "!text-xs !text-[var(--muted-foreground)]",
          actionButton:
            "!bg-grad-btn !text-white !rounded-full !text-xs !font-semibold " +
            "!shadow-[0_4px_12px_-4px_var(--glow)] hover:!brightness-105",
          cancelButton:
            "!bg-[var(--surface-2)] !text-[var(--foreground)] !rounded-full !text-xs !font-medium",
          success:
            "!border-[var(--success)]/30 [&_[data-icon]]:!text-[var(--success)]",
          error:
            "!border-[var(--danger)]/30 [&_[data-icon]]:!text-[var(--danger)]",
          info: "!border-[var(--primary)]/30 [&_[data-icon]]:!text-[var(--primary)]",
          warning:
            "!border-[var(--warning)]/30 [&_[data-icon]]:!text-[var(--warning)]",
          loading:
            "!border-[var(--primary)]/30 [&_[data-icon]]:!text-[var(--primary)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
