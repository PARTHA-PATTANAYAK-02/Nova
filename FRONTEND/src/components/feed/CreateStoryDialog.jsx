import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X, Upload, Sparkles, Check } from "lucide-react";
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

const CreateStoryDialog = ({ open, onOpenChange, onCreated }) => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("followers");
  const [uploading, setUploading] = useState(false);

  const clearFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    clearFile();
    setCaption("");
    setAudience("followers");
    setUploading(false);
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

  const shareStory = async () => {
    if (!file || uploading) return;
    try {
      setUploading(true);
      const body = new FormData();
      body.append("image", file);
      body.append("caption", caption.trim());
      body.append("audience", audience);

      const res = await axios.post(apiUrl("/api/v1/story"), body, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res.data?.success) throw new Error(res.data?.message);

      await onCreated?.(res.data.story);
      toast.success("Story shared for 24 hours");
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
          w-[calc(100vw-20px)] sm:w-[calc(100vw-32px)] max-w-[440px]
          max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-40px)]
          overflow-hidden p-0 rounded-[26px] sm:rounded-[28px]
          bg-[var(--surface)]/95 backdrop-blur-2xl
          border border-[var(--border)]
          shadow-[0_32px_80px_-24px_rgba(0,0,0,.4),0_8px_24px_-12px_var(--glow)]
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300
          data-[state=closed]:animate-out data-[state=closed]:fade-out
          data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-4
        "
      >
        <DialogHeader className="shrink-0 border-b border-[var(--border)]/60 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={close}
              disabled={uploading}
              className="
                h-9 px-3 sm:px-3.5 rounded-full
                text-xs sm:text-sm font-medium
                text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]
                active:scale-95 transition-all duration-200 outline-none
                disabled:pointer-events-none disabled:opacity-50
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
                New story
              </DialogTitle>
            </div>

            <button
              type="button"
              onClick={shareStory}
              disabled={!file || uploading}
              className="
                h-9 min-w-[72px] sm:min-w-[78px] px-3 sm:px-4 rounded-full
                inline-flex items-center justify-center gap-1.5
                text-xs sm:text-sm font-semibold
                bg-grad-btn text-white
                shadow-[0_8px_20px_-8px_var(--glow-strong)]
                hover:brightness-[1.06] active:scale-95
                transition-all duration-200 outline-none
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
            Share a photo story that disappears after 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 sm:px-4 sm:py-4">
          <div className="space-y-3.5">
            {preview ? (
              <div className="group relative mx-auto h-[260px] sm:h-[290px] w-full max-w-[270px] sm:max-w-[290px] overflow-hidden rounded-[22px] border border-[var(--border)] bg-black shadow-[0_14px_40px_rgba(0,0,0,.22)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                {file?.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    aria-label="Story video preview"
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Story preview"
                    className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/25" />

                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[10px] font-medium text-white backdrop-blur-md">
                  <Check className="size-3" />
                  Ready
                </div>

                <button
                  type="button"
                  onClick={clearFile}
                  disabled={uploading}
                  aria-label="Remove selected image"
                  className="
                    absolute right-3 top-3 z-20 size-8 rounded-full
                    flex items-center justify-center
                    border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur-md
                    transition-all duration-200
                    hover:scale-110 hover:rotate-90 hover:bg-black/90
                    active:scale-95 disabled:opacity-50 outline-none
                  "
                >
                  <X className="size-3.5" strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="
                  group relative mx-auto flex h-[260px] sm:h-[290px]
                  w-full max-w-[270px] sm:max-w-[290px]
                  flex-col items-center justify-center overflow-hidden
                  rounded-[22px] border border-dashed border-[var(--border-strong)]
                  bg-[var(--surface-2)] px-6 text-center
                  transition-all duration-300
                  hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5
                  active:scale-[0.985] outline-none
                "
              >
                <div className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full bg-[var(--primary)]/10 blur-3xl transition-transform duration-700 group-hover:scale-125" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 size-36 rounded-full bg-purple-500/10 blur-3xl" />

                <span className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--primary)] shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:scale-110">
                  <ImagePlus
                    className="size-6 transition-transform duration-300 group-hover:rotate-6"
                    strokeWidth={1.7}
                  />
                </span>

                <span className="relative text-sm font-semibold text-[var(--foreground)]">
                  Choose a photo or video
                </span>
                <span className="relative mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Photo up to 10 MB · video up to 20 MB / 30 seconds
                </span>

                <span className="relative mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 text-xs font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--primary)]/40 group-hover:shadow-md">
                  <Upload className="size-3.5" />
                  Select media
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

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-[var(--foreground)]">
                Who can view this story?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "followers",
                    label: "Followers only",
                    hint: "People who follow you",
                  },
                  {
                    value: "public",
                    label: "Public",
                    hint: "Anyone visiting your profile",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={audience === option.value}
                    onClick={() => setAudience(option.value)}
                    className={`
                      rounded-2xl border p-3 text-left transition-all duration-200 outline-none
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Caption{" "}
                  <span className="font-normal text-[var(--muted-foreground)]">
                    (optional)
                  </span>
                </label>
                <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]">
                  {caption.length}/500
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-2)]/40 transition-all duration-200 focus-within:border-[var(--primary)]/50 focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                  placeholder="Write something..."
                  rows={2}
                  className="min-h-[64px] resize-none border-0 bg-transparent px-3.5 py-3 text-sm text-[var(--foreground)] shadow-none outline-none focus-visible:ring-0"
                />
                <div className="h-0.5 w-full bg-[var(--border)]/60">
                  <div
                    className="h-full rounded-r-full bg-grad-btn transition-all duration-200"
                    style={{
                      width: `${Math.min((caption.length / 500) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
