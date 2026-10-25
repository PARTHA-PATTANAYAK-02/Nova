import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  Copy,
  Check,
  Share2,
  X,
  Sparkles,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const NEON_THEMES = [
  {
    id: "cyber",
    name: "Cyber",
    gradient: "from-cyan-500 via-blue-500 to-indigo-600",
    borderGlow: "shadow-[0_0_35px_rgba(6,182,212,0.35)]",
    dotColor: "#06b6d4",
    accentText: "text-cyan-400",
  },
  {
    id: "purple",
    name: "Nebula",
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-500",
    borderGlow: "shadow-[0_0_35px_rgba(168,85,247,0.35)]",
    dotColor: "#a855f7",
    accentText: "text-purple-400",
  },
  {
    id: "emerald",
    name: "Emerald",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    borderGlow: "shadow-[0_0_35px_rgba(16,185,129,0.35)]",
    dotColor: "#10b981",
    accentText: "text-emerald-400",
  },
  {
    id: "sunset",
    name: "Sunset",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    borderGlow: "shadow-[0_0_35px_rgba(244,63,94,0.35)]",
    dotColor: "#f43f5e",
    accentText: "text-rose-400",
  },
];

const NovaQRCodeModal = ({
  isOpen,
  onClose,
  url,
  title = "Nova",
  subtitle = "Scan to explore",
  avatar = "",
  type = "profile",
}) => {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [activeTheme, setActiveTheme] = useState(NEON_THEMES[0]);
  const [qrGenerated, setQrGenerated] = useState(false);

  // Generate QR Code onto canvas
  useEffect(() => {
    if (!isOpen || !url || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: 260,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      },
      (error) => {
        if (error) {
          console.error("QR Code generation error:", error);
        } else {
          setQrGenerated(true);
        }
      }
    );
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${title} on Nova`,
          url: url,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleDownload = () => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;

    // Render an export-quality branded 600x800 poster
    const poster = document.createElement("canvas");
    poster.width = 600;
    poster.height = 760;
    const ctx = poster.getContext("2d");
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 760);
    bgGrad.addColorStop(0, "#090b14");
    bgGrad.addColorStop(0.5, "#0e1326");
    bgGrad.addColorStop(1, "#05070e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 760);

    // Subtle neon border
    ctx.lineWidth = 4;
    ctx.strokeStyle = activeTheme.dotColor;
    ctx.strokeRect(20, 20, 560, 720);

    // Header branding
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NOVA", 300, 80);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px sans-serif";
    ctx.fillText(subtitle.toUpperCase(), 300, 110);

    // Title / Handle
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(title, 300, 155);

    // White rounded card behind QR
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(140, 200, 320, 320, 24);
    ctx.fill();

    // Draw the QR Code image
    ctx.drawImage(qrCanvas, 160, 220, 280, 280);

    // Scan CTA
    ctx.fillStyle = activeTheme.dotColor;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Scan with your phone camera", 300, 580);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "14px sans-serif";
    ctx.fillText(url, 300, 620);

    // Download file
    const link = document.createElement("a");
    link.download = `nova-qr-${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
    link.href = poster.toDataURL("image/png");
    link.click();
    toast.success("QR Code downloaded!");
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[320px] sm:max-w-[340px] rounded-3xl bg-[#0d101f] border border-white/10 p-4 sm:p-5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Compact Header: Avatar + Title + Subtitle in one sleek row */}
        <div className="flex items-center gap-3 w-full pr-8 mb-3 text-left">
          <div className={`p-[1.5px] rounded-xl bg-gradient-to-tr ${activeTheme.gradient} shrink-0 shadow-md`}>
            {avatar ? (
              <Avatar className="size-10 rounded-xl">
                <AvatarImage src={avatar} alt={title} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-zinc-900 text-white font-bold text-xs">
                  {title.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                <QrCode className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-bold text-white tracking-tight leading-tight truncate">
              {title}
            </h3>
            <p className="text-[11px] text-white/50 leading-tight truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Neon Glowing QR Card Frame */}
        <div
          className={`relative p-2.5 rounded-2xl bg-white shadow-2xl ${activeTheme.borderGlow} transition-all duration-300`}
        >
          <div
            className={`absolute -inset-1 rounded-2xl bg-gradient-to-tr ${activeTheme.gradient} opacity-40 blur-sm -z-10`}
          />
          <canvas
            ref={canvasRef}
            className="size-44 sm:size-48 rounded-xl block"
          />

          {/* Central Logo Stamp */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-8 rounded-lg bg-white/95 shadow-md flex items-center justify-center border border-zinc-200">
              <span className="text-[8px] font-black tracking-wider text-black">
                NOVA
              </span>
            </div>
          </div>
        </div>

        {/* Neon Theme Selector */}
        <div className="flex items-center gap-1.5 mt-3 p-1 rounded-full bg-white/5 border border-white/10">
          {NEON_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setActiveTheme(theme)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                activeTheme.id === theme.id
                  ? `bg-gradient-to-r ${theme.gradient} text-white shadow-md`
                  : "text-white/60 hover:text-white"
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full mt-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white transition-all cursor-pointer"
          >
            <Download className="size-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium">Save</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5 text-indigo-400" />
            )}
            <span className="text-[11px] font-medium">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white transition-all cursor-pointer"
          >
            <Share2 className="size-3.5 text-rose-400" />
            <span className="text-[11px] font-medium">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NovaQRCodeModal;
