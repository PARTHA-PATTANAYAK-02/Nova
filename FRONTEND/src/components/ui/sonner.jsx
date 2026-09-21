import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border-white/10 !bg-[#0d0d18]/95 !backdrop-blur-2xl !text-white !shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
          title: "!text-sm !font-semibold !text-white",
          description: "!text-xs !text-white/60",
          actionButton:
            "!bg-gradient-to-r !from-violet-500 !to-cyan-500 !text-white !rounded-full !text-xs !font-semibold",
          cancelButton: "!bg-white/8 !text-white/70 !rounded-full !text-xs",
          success: "!border-emerald-500/25 [&_[data-icon]]:!text-emerald-300",
          error: "!border-rose-500/30 [&_[data-icon]]:!text-rose-300",
          info: "!border-cyan-500/30 [&_[data-icon]]:!text-cyan-300",
          warning: "!border-amber-500/30 [&_[data-icon]]:!text-amber-300",
          loading: "!border-violet-500/30 [&_[data-icon]]:!text-violet-300",
        },
      }}
      style={{
        "--normal-bg": "#0d0d18",
        "--normal-text": "#ffffff",
        "--normal-border": "rgba(255, 255, 255, 0.1)",
        "--success-bg": "#0d0d18",
        "--success-text": "#ffffff",
        "--success-border": "rgba(16, 185, 129, 0.25)",
        "--error-bg": "#0d0d18",
        "--error-text": "#ffffff",
        "--error-border": "rgba(244, 63, 94, 0.3)",
        "--info-bg": "#0d0d18",
        "--info-text": "#ffffff",
        "--info-border": "rgba(6, 182, 212, 0.3)",
        "--warning-bg": "#0d0d18",
        "--warning-text": "#ffffff",
        "--warning-border": "rgba(245, 158, 11, 0.3)",
      }}
      {...props}
    />
  );
};

export { Toaster };
