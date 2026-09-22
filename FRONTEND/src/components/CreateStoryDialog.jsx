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
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { apiUrl } from "@/lib/api";

const CreateStoryDialog = ({ open, onOpenChange, onCreated }) => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ============================================================
     FILE
     ============================================================ */

  const clearFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = "";

    setFile(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const reset = () => {
    clearFile();
    setCaption("");
    setUploading(false);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  /* ============================================================
     SELECT IMAGE
     ============================================================ */

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Stories support photos only.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Choose an image smaller than 10 MB.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(selectedFile);

    previewUrlRef.current = objectUrl;

    setFile(selectedFile);
    setPreview(objectUrl);
  };

  /* ============================================================
     CLOSE
     ============================================================ */

  const close = () => {
    if (uploading) return;

    onOpenChange(false);
    reset();
  };

  /* ============================================================
     SHARE
     ============================================================ */

  const shareStory = async () => {
    if (!file || uploading) return;

    try {
      setUploading(true);

      const body = new FormData();

      body.append("image", file);
      body.append("caption", caption.trim());

      const response = await axios.post(apiUrl("/api/v1/story"), body, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message);
      }

      await onCreated?.(response.data.story);

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
      onOpenChange={(value) => {
        if (uploading) return;

        if (value) {
          onOpenChange(true);
        } else {
          close();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="
          flex
          flex-col

          w-[calc(100vw-20px)]
          sm:w-[calc(100vw-32px)]

          max-w-[430px]

          max-h-[calc(100dvh-24px)]
          sm:max-h-[calc(100dvh-40px)]

          overflow-hidden

          rounded-[24px]
          sm:rounded-[28px]

          border
          border-[var(--border)]

          bg-[var(--background)]

          p-0

          shadow-[0_25px_80px_rgba(0,0,0,0.35)]

          animate-in
          fade-in
          zoom-in-95
          slide-in-from-bottom-4
          duration-300

          data-[state=closed]:animate-out
          data-[state=closed]:fade-out
          data-[state=closed]:zoom-out-95
          data-[state=closed]:slide-out-to-bottom-4
        "
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

        <DialogHeader
          className="
            shrink-0

            border-b
            border-[var(--border)]

            px-3.5
            py-3

            sm:px-4
            sm:py-3.5
          "
        >
          <div className="flex items-center justify-between gap-2">
            {/* CANCEL */}

            <button
              type="button"
              onClick={close}
              disabled={uploading}
              className="
                inline-flex
                h-9
                shrink-0
                items-center
                justify-center

                rounded-full

                px-3
                sm:px-3.5

                text-xs
                sm:text-sm
                font-medium

                text-[var(--muted-foreground)]

                transition-all
                duration-200

                hover:bg-[var(--surface-2)]
                hover:text-[var(--foreground)]

                active:scale-95

                disabled:pointer-events-none
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            {/* TITLE */}

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              <Sparkles
                className="
                  h-3.5
                  w-3.5
                  text-[var(--primary)]
                  animate-pulse
                "
                strokeWidth={2}
              />

              <DialogTitle
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-[var(--foreground)]
                "
              >
                New story
              </DialogTitle>
            </div>

            {/* SHARE */}

            <button
              type="button"
              onClick={shareStory}
              disabled={!file || uploading}
              className="
                inline-flex
                h-9

                min-w-[72px]
                sm:min-w-[78px]

                shrink-0

                items-center
                justify-center
                gap-1.5

                rounded-full

                px-3
                sm:px-4

                text-xs
                sm:text-sm
                font-semibold

                transition-all
                duration-200

                hover:scale-[1.03]
                active:scale-95

                disabled:pointer-events-none
                disabled:opacity-40
              "
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sharing</span>
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

        {/* =====================================================
            SCROLLABLE BODY
        ====================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto

            px-3.5
            py-3.5

            sm:px-4
            sm:py-4

            scrollbar-thin
          "
        >
          <div className="space-y-3.5">
            {/* =================================================
                IMAGE PREVIEW
            ================================================== */}

            {preview ? (
              <div
                className="
                  group
                  relative

                  mx-auto

                  h-[300px]
                  sm:h-[340px]

                  w-full
                  max-w-[270px]
                  sm:max-w-[290px]

                  overflow-hidden

                  rounded-[20px]

                  border
                  border-[var(--border)]

                  bg-black

                  shadow-[0_14px_40px_rgba(0,0,0,0.22)]

                  animate-in
                  fade-in
                  zoom-in-95
                  slide-in-from-bottom-2
                  duration-300
                "
              >
                <img
                  src={preview}
                  alt="Story preview"
                  className="
                    h-full
                    w-full
                    object-contain

                    transition-transform
                    duration-500
                    ease-out

                    group-hover:scale-[1.02]
                  "
                />

                {/* Gradient */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0

                    bg-gradient-to-b
                    from-black/20
                    via-transparent
                    to-black/25
                  "
                />

                {/* Ready */}

                <div
                  className="
                    absolute
                    bottom-3
                    left-3

                    flex
                    items-center
                    gap-1.5

                    rounded-full

                    border
                    border-white/15

                    bg-black/55

                    px-2.5
                    py-1.5

                    text-[10px]
                    font-medium
                    text-white

                    backdrop-blur-md

                    animate-in
                    fade-in
                    slide-in-from-bottom-2
                    duration-300
                  "
                >
                  <Check className="h-3 w-3" />
                  Ready
                </div>

                {/* REMOVE */}

                <button
                  type="button"
                  onClick={clearFile}
                  disabled={uploading}
                  aria-label="Remove selected image"
                  className="
                    absolute
                    right-3
                    top-3
                    z-20

                    flex
                    h-8
                    w-8

                    items-center
                    justify-center

                    rounded-full

                    border
                    border-white/20

                    bg-black/65

                    text-white

                    shadow-lg

                    backdrop-blur-md

                    transition-all
                    duration-200

                    hover:scale-110
                    hover:rotate-90
                    hover:bg-black/90

                    active:scale-95

                    disabled:pointer-events-none
                    disabled:opacity-50
                  "
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              /* =================================================
                 UPLOAD CARD
                 ================================================== */

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="
                  group
                  relative

                  mx-auto

                  flex

                  h-[300px]
                  sm:h-[340px]

                  w-full
                  max-w-[270px]
                  sm:max-w-[290px]

                  flex-col
                  items-center
                  justify-center

                  overflow-hidden

                  rounded-[20px]

                  border
                  border-dashed
                  border-[var(--border-strong)]

                  bg-[var(--surface-2)]

                  px-6
                  text-center

                  transition-all
                  duration-300

                  hover:border-[var(--primary)]/60
                  hover:bg-[var(--primary)]/5

                  active:scale-[0.985]
                "
              >
                {/* Glow */}

                <div
                  className="
                    pointer-events-none

                    absolute
                    -right-16
                    -top-16

                    h-36
                    w-36

                    rounded-full

                    bg-[var(--primary)]/10

                    blur-3xl

                    transition-transform
                    duration-700

                    group-hover:scale-125
                  "
                />

                <div
                  className="
                    pointer-events-none

                    absolute
                    -bottom-16
                    -left-16

                    h-36
                    w-36

                    rounded-full

                    bg-purple-500/10

                    blur-3xl
                  "
                />

                {/* ICON */}

                <span
                  className="
                    relative

                    mb-4

                    flex
                    h-14
                    w-14

                    items-center
                    justify-center

                    rounded-2xl

                    border
                    border-[var(--border)]

                    bg-[var(--background)]

                    text-[var(--primary)]

                    shadow-sm

                    transition-all
                    duration-300

                    group-hover:-translate-y-1
                    group-hover:rotate-3
                    group-hover:scale-110
                  "
                >
                  <ImagePlus
                    className="
                      h-6
                      w-6

                      transition-transform
                      duration-300

                      group-hover:rotate-6
                    "
                    strokeWidth={1.7}
                  />
                </span>

                <span
                  className="
                    relative
                    text-sm
                    font-semibold
                    text-[var(--foreground)]
                  "
                >
                  Choose a photo
                </span>

                <span
                  className="
                    relative
                    mt-1
                    text-[11px]
                    text-[var(--muted-foreground)]
                  "
                >
                  Photos only · up to 10 MB
                </span>

                {/* SELECT BUTTON */}

                <span
                  className="
                    relative

                    mt-4

                    inline-flex
                    h-9

                    items-center
                    justify-center
                    gap-1.5

                    rounded-full

                    border
                    border-[var(--border)]

                    bg-[var(--background)]

                    px-4

                    text-xs
                    font-medium

                    text-[var(--foreground)]

                    shadow-sm

                    transition-all
                    duration-200

                    group-hover:-translate-y-0.5
                    group-hover:border-[var(--primary)]/40
                    group-hover:shadow-md
                  "
                >
                  <Upload className="h-3.5 w-3.5" />
                  Select photo
                </span>
              </button>
            )}

            {/* FILE INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => selectFile(event.target.files?.[0])}
              className="hidden"
            />

            {/* =================================================
                CAPTION
            ================================================== */}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  className="
                    text-xs
                    font-medium
                    text-[var(--foreground)]
                  "
                >
                  Caption{" "}
                  <span className="font-normal text-[var(--muted-foreground)]">
                    (optional)
                  </span>
                </label>

                <span
                  className="
                    text-[10px]
                    tabular-nums
                    text-[var(--muted-foreground)]
                  "
                >
                  {caption.length}/500
                </span>
              </div>

              <div
                className="
                  overflow-hidden

                  rounded-xl

                  border
                  border-[var(--border)]

                  bg-[var(--surface-2)]/50

                  transition-all
                  duration-200

                  focus-within:border-[var(--primary)]/50
                  focus-within:ring-2
                  focus-within:ring-[var(--primary)]/10
                "
              >
                <Textarea
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value.slice(0, 500))
                  }
                  placeholder="Write something..."
                  rows={2}
                  className="
                    min-h-[64px]

                    resize-none

                    border-0

                    bg-transparent

                    px-3.5
                    py-2.5

                    text-sm
                    text-[var(--foreground)]

                    shadow-none

                    outline-none

                    focus-visible:ring-0
                  "
                />

                {/* Progress */}

                <div className="h-0.5 w-full bg-[var(--border)]">
                  <div
                    className="
                      h-full
                      rounded-r-full

                      transition-all
                      duration-200
                    "
                    style={{
                      width: `${Math.min((caption.length / 500) * 100, 100)}%`,
                      background: "var(--primary)",
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
