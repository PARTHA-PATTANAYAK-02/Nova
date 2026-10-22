import { useEffect, useRef, useState, useCallback } from "react";
import {
  ImagePlus,
  Loader2,
  X,
  Upload,
  Sparkles,
  Check,
  Smile,
  Plus,
  Minus,
  Trash2,
  Tag,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

const POPULAR_EMOJIS = [
  "🔥", "❤️", "😍", "😂", "✨", "💯", "👑", "🚀",
  "⚡", "🤩", "🏖️", "🍕", "🎵", "🌸", "🦋", "🍦",
  "🥂", "📸", "💖", "🌈", "🥳", "☕", "🍉", "🎸",
];

const POPULAR_BADGES = [
  { text: "VIBES", bg: "#7C5CFF" },
  { text: "MOOD", bg: "#EC4899" },
  { text: "NEW POST", bg: "#EF4444" },
  { text: "LIT 🔥", bg: "#F59E0B" },
  { text: "CHILL", bg: "#10B981" },
  { text: "WEEKEND", bg: "#6366F1" },
  { text: "TODAY", bg: "#06B6D4" },
  { text: "LOVE", bg: "#F43F5E" },
];

const CreateStoryDialog = ({ open, onOpenChange, onCreated }) => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");
  const previewBoxRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("followers");
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Resize, Fit Mode & Zoom State
  const [fitMode, setFitMode] = useState("fit"); // 'fit' (uncropped + ambient blur) | 'fill' (9:16 full bleed)
  const [imageScale, setImageScale] = useState(1); // 0.6 to 1.6

  // Instagram Stickers & Emojis State
  const [stickers, setStickers] = useState([]);
  const [activeStickerId, setActiveStickerId] = useState(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [customStickerText, setCustomStickerText] = useState("");
  const [activeTab, setActiveTab] = useState("emojis"); // 'emojis' | 'badges' | 'custom'

  const clearFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setFile(null);
    setPreview("");
    setVideoDuration(0);
    setStickers([]);
    setActiveStickerId(null);
    setImageScale(1);
    setFitMode("fit");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    clearFile();
    setCaption("");
    setAudience("followers");
    setVideoDuration(0);
    setUploading(false);
    setShowStickerModal(false);
    setStickers([]);
    setImageScale(1);
    setFitMode("fit");
  };

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;
    const isVideo = selectedFile.type.startsWith("video/");
    const isImage = selectedFile.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("Choose a photo or video for your story.");
      return;
    }
    if (
      (isVideo && selectedFile.size > 20 * 1024 * 1024) ||
      (isImage && selectedFile.size > 10 * 1024 * 1024)
    ) {
      toast.error(
        isVideo
          ? "Story videos must be 20 MB or smaller."
          : "Images must be 10 MB or smaller.",
      );
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setFile(null);
    setPreview("");
    setStickers([]);
    setActiveStickerId(null);
    setImageScale(1);
    setFitMode("fit");

    const objectUrl = URL.createObjectURL(selectedFile);

    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          toast.error("Story videos must be 30 seconds or shorter.");
          return;
        }
        setVideoDuration(video.duration);
        previewUrlRef.current = objectUrl;
        setFile(selectedFile);
        setPreview(objectUrl);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        URL.revokeObjectURL(objectUrl);
        toast.error("Unable to read this video.");
      };
      video.src = objectUrl;
      return;
    }
    previewUrlRef.current = objectUrl;
    setFile(selectedFile);
    setPreview(objectUrl);
  };

  const close = () => {
    if (uploading) return;
    onOpenChange(false);
    reset();
  };

  /* ---------- STICKER MANIPULATION ---------- */
  const addSticker = (content, type = "emoji", bg = null) => {
    const newSticker = {
      id: `${Date.now()}-${Math.random()}`,
      text: content,
      type,
      bg,
      x: 50, // center (%)
      y: 45, // center-ish (%)
      scale: 1,
    };
    setStickers((prev) => [...prev, newSticker]);
    setActiveStickerId(newSticker.id);
    setShowStickerModal(false);
    toast.success("Sticker added! Drag to position.", { duration: 1800 });
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (activeStickerId === id) setActiveStickerId(null);
  };

  const adjustStickerScale = (id, delta) => {
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextScale = Math.min(Math.max((s.scale || 1) + delta, 0.6), 2.0);
        return { ...s, scale: nextScale };
      }),
    );
  };

  // Dragging sticker inside preview box
  const handleStickerPointerDown = (e, id) => {
    e.stopPropagation();
    setActiveStickerId(id);
    const box = previewBoxRef.current?.getBoundingClientRect();
    if (!box) return;

    const onPointerMove = (moveEvent) => {
      const currentBox = previewBoxRef.current?.getBoundingClientRect();
      if (!currentBox) return;
      const xPercent = Math.min(
        Math.max(((moveEvent.clientX - currentBox.left) / currentBox.width) * 100, 5),
        95,
      );
      const yPercent = Math.min(
        Math.max(((moveEvent.clientY - currentBox.top) / currentBox.height) * 100, 5),
        95,
      );
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, x: xPercent, y: yPercent } : s)),
      );
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  /* ---------- BAKE PROPORTIONAL STICKERS & FULL CANVAS COMPOSITING ---------- */
  const bakeStickersToImage = useCallback(
    async (imageFile, currentStickers, currentFitMode, currentZoom) => {
      return new Promise((resolve) => {
        if (!imageFile) {
          resolve(imageFile);
          return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          // Standard Instagram Story canvas: 1080 x 1920
          const CANVAS_W = 1080;
          const CANVAS_H = 1920;
          const canvas = document.createElement("canvas");
          canvas.width = CANVAS_W;
          canvas.height = CANVAS_H;
          const ctx = canvas.getContext("2d");

          const imgW = img.naturalWidth || 1080;
          const imgH = img.naturalHeight || 1920;
          const imgAspect = imgW / imgH;
          const canvasAspect = CANVAS_W / CANVAS_H;

          // 1. Draw Ambient Blurred Background (For Fit mode or slight margins)
          ctx.save();
          // Draw blurred image scaled up to cover canvas
          ctx.filter = "blur(50px)";
          ctx.drawImage(img, -120, -120, CANVAS_W + 240, CANVAS_H + 240);
          ctx.filter = "none";
          // Soft dark scrim over the blur so the main image and stickers pop
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();

          // 2. Draw Main Image (Fit vs Fill + User Zoom)
          let drawW, drawH;
          if (currentFitMode === "fill") {
            // Cover math
            if (imgAspect < canvasAspect) {
              drawW = CANVAS_W * currentZoom;
              drawH = (CANVAS_W / imgAspect) * currentZoom;
            } else {
              drawH = CANVAS_H * currentZoom;
              drawW = (CANVAS_H * imgAspect) * currentZoom;
            }
          } else {
            // Contain math (Whole image fits, never cropped)
            if (imgAspect > canvasAspect) {
              drawW = CANVAS_W * currentZoom;
              drawH = (CANVAS_W / imgAspect) * currentZoom;
            } else {
              drawH = CANVAS_H * currentZoom;
              drawW = (CANVAS_H * imgAspect) * currentZoom;
            }
          }

          const drawX = (CANVAS_W - drawW) / 2;
          const drawY = (CANVAS_H - drawH) / 2;

          ctx.drawImage(img, drawX, drawY, drawW, drawH);

          // 3. Draw Stickers proportional to 1080 x 1920
          currentStickers.forEach((s) => {
            const posX = (s.x / 100) * CANVAS_W;
            const posY = (s.y / 100) * CANVAS_H;
            const stickerScale = s.scale || 1;

            ctx.save();
            ctx.translate(posX, posY);

            if (s.type === "badge") {
              const fontSize = Math.round(44 * stickerScale);
              ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              const textMetrics = ctx.measureText(s.text);
              const padX = fontSize * 0.75;
              const padY = fontSize * 0.35;
              const badgeW = textMetrics.width + padX * 2;
              const badgeH = fontSize + padY * 2;
              const radius = badgeH / 2;

              // Rounded pill badge with shadow
              ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
              ctx.shadowBlur = 16;
              ctx.shadowOffsetY = 6;

              ctx.fillStyle = s.bg || "rgba(0, 0, 0, 0.85)";
              ctx.beginPath();
              ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, radius);
              ctx.fill();

              ctx.shadowColor = "transparent";
              ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
              ctx.lineWidth = 3;
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(s.text, 0, 2);
            } else {
              // Emoji
              const emojiSize = Math.round(100 * stickerScale);
              ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
              ctx.shadowBlur = 18;
              ctx.shadowOffsetY = 6;
              ctx.fillText(s.text, 0, 0);
            }
            ctx.restore();
          });

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const bakedFile = new File([blob], imageFile.name || "story.jpg", {
                  type: "image/jpeg",
                });
                resolve(bakedFile);
              } else {
                resolve(imageFile);
              }
            },
            "image/jpeg",
            0.94,
          );
        };

        img.onerror = () => resolve(imageFile);
        img.src = objectUrl;
      });
    },
    [],
  );

  const shareStory = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to share stories.");
      return;
    }
    if (!file || uploading) return;

    try {
      setUploading(true);

      let fileToUpload = file;
      // If photo, bake with fitMode, imageScale and stickers into 1080x1920 standard story
      if (file.type.startsWith("image/")) {
        fileToUpload = await bakeStickersToImage(file, stickers, fitMode, imageScale);
      }

      const body = new FormData();
      body.append("image", fileToUpload);
      body.append("caption", caption.trim());
      body.append("audience", audience);
      if (file.type?.startsWith("video/") && videoDuration > 0) {
        body.append("duration", String(videoDuration));
      }

      const res = await axios.post(apiUrl("/api/v1/story"), body, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res.data?.success) throw new Error(res.data?.message);

      await onCreated?.(res.data.story);
      toast.success("Story shared for 24 hours!");
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to share story.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (uploading) return;
        if (v) onOpenChange(true);
        else close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="
          flex flex-col
          w-[calc(100vw-20px)] sm:w-[calc(100vw-32px)] max-w-[460px]
          max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-40px)]
          overflow-hidden p-0 rounded-[28px]
          bg-[var(--surface)]/95 backdrop-blur-2xl
          border border-[var(--border)]
          shadow-[0_32px_80px_-24px_rgba(0,0,0,.45),0_8px_24px_-12px_var(--glow)]
          animate-in fade-in zoom-in-95 duration-200
        "
      >
        {/* HEADER */}
        <DialogHeader className="shrink-0 border-b border-[var(--border)]/60 px-4 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={close}
              disabled={uploading}
              className="
                h-9 px-3.5 rounded-full text-xs sm:text-sm font-medium
                text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]
                active:scale-95 transition-all outline-none disabled:opacity-50 cursor-pointer
              "
            >
              Cancel
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              <Sparkles
                className="size-3.5 text-[var(--primary)] animate-pulse"
                strokeWidth={2}
              />
              <DialogTitle className="truncate text-sm font-semibold text-[var(--foreground)]">
                New Story
              </DialogTitle>
            </div>

            <button
              type="button"
              onClick={shareStory}
              disabled={!file || uploading}
              className="
                h-9 min-w-[76px] px-4 rounded-full
                inline-flex items-center justify-center gap-1.5
                text-xs sm:text-sm font-semibold
                bg-grad-btn text-white
                shadow-[0_8px_20px_-8px_var(--glow-strong)]
                hover:brightness-[1.06] active:scale-95
                transition-all outline-none cursor-pointer
                disabled:opacity-40 disabled:pointer-events-none
              "
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Sharing
                </>
              ) : (
                "Share"
              )}
            </button>
          </div>
          <DialogDescription className="sr-only">
            Share a photo or video story that disappears after 24 hours.
          </DialogDescription>
        </DialogHeader>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
          {preview ? (
            <div className="space-y-2.5">
              {/* 9:16 WYSIWYG STORY PREVIEW CONTAINER */}
              <div
                ref={previewBoxRef}
                onClick={() => setActiveStickerId(null)}
                className="relative mx-auto h-[320px] sm:h-[350px] aspect-[9/16] overflow-hidden rounded-[26px] border border-[var(--border)] bg-black shadow-2xl"
              >
                {file?.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    aria-label="Story video preview"
                    controls
                    playsInline
                    className="h-full w-full object-contain pointer-events-auto"
                  />
                ) : (
                  <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
                    {/* Ambient blurred backdrop for Fit Mode */}
                    {fitMode === "fit" && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-125 pointer-events-none"
                        style={{ backgroundImage: `url(${preview})` }}
                      />
                    )}

                    {/* Main Image with user scale and Fit/Fill mode */}
                    <img
                      src={preview}
                      alt="Story preview"
                      style={{ transform: `scale(${imageScale})` }}
                      className={`
                        relative z-10 h-full w-full select-none pointer-events-none transition-transform duration-200
                        ${fitMode === "fit" ? "object-contain drop-shadow-md" : "object-cover"}
                      `}
                      draggable={false}
                    />
                  </div>
                )}

                {/* STICKERS LAYER */}
                {stickers.map((s) => {
                  const isActive = activeStickerId === s.id;
                  return (
                    <div
                      key={s.id}
                      onPointerDown={(e) => handleStickerPointerDown(e, s.id)}
                      style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        transform: `translate(-50%, -50%) scale(${s.scale || 1})`,
                      }}
                      className={`
                        absolute z-20 cursor-grab active:cursor-grabbing select-none transition-shadow
                        ${isActive ? "ring-2 ring-white/90 rounded-2xl shadow-2xl" : ""}
                      `}
                    >
                      {s.type === "badge" ? (
                        <div
                          style={{ backgroundColor: s.bg || "rgba(0,0,0,0.85)" }}
                          className="px-2.5 py-1 rounded-full text-white font-extrabold text-[11px] sm:text-xs tracking-wider border border-white/40 shadow-lg uppercase"
                        >
                          {s.text}
                        </div>
                      ) : (
                        <span className="text-3xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] block">
                          {s.text}
                        </span>
                      )}

                      {/* Active Sticker Controls Overlay */}
                      {isActive && (
                        <div
                          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/85 px-1.5 py-0.5 rounded-full border border-white/30 backdrop-blur-md shadow-lg"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => adjustStickerScale(s.id, 0.15)}
                            className="size-5 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-90"
                            title="Bigger"
                          >
                            <Plus className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStickerScale(s.id, -0.15)}
                            className="size-5 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-90"
                            title="Smaller"
                          >
                            <Minus className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSticker(s.id)}
                            className="size-5 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 active:scale-90"
                            title="Delete"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* TOP ACTIONS OVERLAY */}
                <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={uploading}
                    aria-label="Remove image"
                    className="size-8 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/90 active:scale-95 border border-white/20 backdrop-blur-md shadow-md cursor-pointer"
                  >
                    <X className="size-3.5" strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              {/* FIT / FILL & ZOOM RESIZE CONTROLS (FOR PHOTOS) */}
              {!file?.type.startsWith("video/") && (
                <div className="flex flex-col gap-2 p-2 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-2">
                    {/* Fit vs Fill Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setFitMode((m) => (m === "fit" ? "fill" : "fit"))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] border border-[var(--border)] active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      {fitMode === "fit" ? (
                        <>
                          <Minimize2 className="size-3.5 text-[var(--primary)]" />
                          <span>Fit (Full Image)</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="size-3.5 text-[var(--primary)]" />
                          <span>Fill (Crop 9:16)</span>
                        </>
                      )}
                    </button>

                    {/* Sticker Button */}
                    <button
                      type="button"
                      onClick={() => setShowStickerModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] border border-[var(--border)] active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      <Smile className="size-3.5 text-[var(--primary)]" />
                      <span>Stickers ({stickers.length})</span>
                    </button>
                  </div>

                  {/* Zoom / Scale Slider & Controls */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]/40 px-1">
                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.max(Number((s - 0.1).toFixed(2)), 0.6))}
                      className="size-6 rounded-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] active:scale-90"
                      title="Zoom Out"
                    >
                      <ZoomOut className="size-3" />
                    </button>

                    <input
                      type="range"
                      min="0.6"
                      max="1.5"
                      step="0.05"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="flex-1 accent-[var(--primary)] cursor-pointer h-1.5 bg-[var(--border)] rounded-full"
                    />

                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.min(Number((s + 0.1).toFixed(2)), 1.5))}
                      className="size-6 rounded-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] active:scale-90"
                      title="Zoom In"
                    >
                      <ZoomIn className="size-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setImageScale(1)}
                      className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]"
                      title="Reset Zoom"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="
                group relative mx-auto flex h-[280px]
                w-full max-w-[280px] sm:max-w-[300px]
                flex-col items-center justify-center overflow-hidden
                rounded-[24px] border border-dashed border-[var(--border-strong)]
                bg-[var(--surface-2)]/60 px-6 text-center
                transition-all duration-300
                hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5
                active:scale-[0.985] outline-none cursor-pointer
              "
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full bg-[var(--primary)]/10 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 size-36 rounded-full bg-purple-500/10 blur-3xl" />

              <span className="relative mb-3 flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--primary)] shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-110">
                <ImagePlus className="size-6" strokeWidth={1.7} />
              </span>

              <span className="relative text-sm font-semibold text-[var(--foreground)]">
                Choose Photo or Video
              </span>
              <span className="relative mt-1 text-[11px] text-[var(--muted-foreground)]">
                Photo up to 10 MB · Video up to 20 MB / 30s
              </span>

              <span className="relative mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 text-xs font-medium text-[var(--foreground)] shadow-sm transition-all group-hover:border-[var(--primary)]/40">
                <Upload className="size-3.5" />
                Select from device
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => selectFile(e.target.files?.[0])}
            className="hidden"
          />

          {/* AUDIENCE SELECTOR */}
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-[var(--foreground)]">
              Audience
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: "followers",
                  label: "Followers only",
                  hint: "Visible to your followers",
                },
                {
                  value: "public",
                  label: "Public",
                  hint: "Visible to everyone",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={audience === option.value}
                  onClick={() => setAudience(option.value)}
                  className={`
                    rounded-2xl border p-2.5 text-left transition-all outline-none cursor-pointer
                    ${
                      audience === option.value
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_4px_12px_-4px_var(--glow)]"
                        : "border-[var(--border)] bg-[var(--surface-2)]/40 hover:border-[var(--border-strong)]"
                    }
                  `}
                >
                  <span className="block text-xs font-semibold text-[var(--foreground)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--muted-foreground)]">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* CAPTION */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--foreground)]">
                Caption <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
              </label>
              <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]">
                {caption.length}/500
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-2)]/40 focus-within:border-[var(--primary)]/50 focus-within:ring-2 focus-within:ring-[var(--primary)]/10 transition-all">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                placeholder="Add a caption..."
                rows={2}
                className="min-h-[60px] resize-none border-0 bg-transparent px-3 py-2 text-xs sm:text-sm text-[var(--foreground)] outline-none focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>
        </div>

        {/* INSTAGRAM STICKER / EMOJI PICKER MODAL */}
        {showStickerModal && (
          <div
            className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowStickerModal(false)}
          >
            <div
              className="flex flex-col max-h-[80%] rounded-t-[28px] border-t border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--foreground)] shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-[var(--muted-foreground)]/30 mb-3" />

              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Smile className="size-4 text-[var(--primary)]" />
                  <h4 className="text-sm font-semibold">Add to Story</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStickerModal(false)}
                  className="size-7 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* TABS */}
              <div className="flex gap-2 py-2.5 border-b border-[var(--border)]/60">
                {[
                  { id: "emojis", label: "Emojis", icon: Smile },
                  { id: "badges", label: "Badges", icon: Tag },
                  { id: "custom", label: "Custom Text", icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer
                      ${
                        activeTab === tab.id
                          ? "bg-[var(--primary)] text-white shadow-sm"
                          : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }
                    `}
                  >
                    <tab.icon className="size-3" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB CONTENT */}
              <div className="overflow-y-auto py-3 max-h-[220px]">
                {activeTab === "emojis" && (
                  <div className="grid grid-cols-6 gap-2">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addSticker(emoji, "emoji")}
                        className="size-10 rounded-2xl flex items-center justify-center text-2xl hover:bg-[var(--surface-2)] hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "badges" && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {POPULAR_BADGES.map((badge) => (
                      <button
                        key={badge.text}
                        type="button"
                        onClick={() => addSticker(badge.text, "badge", badge.bg)}
                        style={{ backgroundColor: badge.bg }}
                        className="px-3.5 py-1.5 rounded-full text-white font-extrabold text-xs tracking-wider shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      >
                        {badge.text}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "custom" && (
                  <div className="space-y-3 px-1">
                    <input
                      type="text"
                      value={customStickerText}
                      onChange={(e) => setCustomStickerText(e.target.value.slice(0, 30))}
                      placeholder="Type emoji or short text..."
                      className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-[var(--primary)]"
                    />
                    <button
                      type="button"
                      disabled={!customStickerText.trim()}
                      onClick={() => {
                        addSticker(customStickerText.trim(), "badge", "#7C5CFF");
                        setCustomStickerText("");
                      }}
                      className="w-full py-2 rounded-full bg-grad-btn text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Add Custom Sticker
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
