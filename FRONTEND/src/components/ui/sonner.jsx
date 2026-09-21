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
            "group toast !rounded-xl !border-[var(--border)] !bg-[var(--surface)] !text-[var(--foreground)] !shadow-[var(--shadow-lg)]",
          title: "!text-sm !font-semibold !text-[var(--foreground)]",
          description: "!text-xs !text-[var(--muted-foreground)]",
          actionButton:
            "!bg-[var(--primary)] !text-[var(--primary-foreground)] !rounded-full !text-xs !font-semibold",
          cancelButton:
            "!bg-[var(--surface-2)] !text-[var(--foreground)] !rounded-full !text-xs",
          success: "!border-emerald-500/25 [&_[data-icon]]:!text-emerald-500",
          error:
            "!border-[var(--danger)]/30 [&_[data-icon]]:!text-[var(--danger)]",
          info: "!border-[var(--primary)]/30 [&_[data-icon]]:!text-[var(--primary)]",
          warning: "!border-amber-500/30 [&_[data-icon]]:!text-amber-500",
          loading:
            "!border-[var(--primary)]/30 [&_[data-icon]]:!text-[var(--primary)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
