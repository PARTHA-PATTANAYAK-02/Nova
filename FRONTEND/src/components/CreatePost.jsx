import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { readFileAsDataURL } from "@/lib/utils";
import { Loader2, ImagePlus, X, Upload, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";

const CreatePost = ({ open, setOpen }) => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dispatch = useDispatch();

  const { user } = useSelector((store) => store.auth);
  const { posts } = useSelector((store) => store.post);

  /* ---------- File handler ---------- */
  const processFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(selectedFile);
      setFile(selectedFile);
      setImagePreview(dataUrl);
    } catch (error) {
      console.error(error);
      toast.error("Unable to preview this image.");
    }
  };

  const fileChangeHandler = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  /* ---------- Drag & Drop ---------- */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    await processFile(droppedFile);
  };

  /* ---------- Clear image ---------- */
  const clearImage = () => {
    setFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- Reset form ---------- */
  const resetForm = () => {
    setFile(null);
    setCaption("");
    setImagePreview("");
    setLoading(false);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- Close dialog ---------- */
  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    resetForm();
  };

  /* ---------- Create post ---------- */
  const createPostHandler = async () => {
    if (!imagePreview || !file) {
      toast.error("Please select an image first.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("image", file);

      const res = await axios.post(apiUrl("/api/v1/post/addpost"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.post) {
        dispatch(setPosts([res.data.post, ...posts]));
      }

      toast.success("Post shared successfully!");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Something went wrong while creating the post.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && setOpen(value)}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="
          w-[calc(100vw-24px)]
          max-w-[540px]
          max-h-[92vh]
          overflow-hidden
          rounded-[24px]
          border border-[var(--border)]
          bg-[var(--background)]
          p-0
          shadow-2xl
        "
      >
        {/* =====================================================
            HEADER — Cancel · Title · Share
        ====================================================== */}
        <DialogHeader className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* LEFT — Cancel */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="
                inline-flex h-9 shrink-0 items-center justify-center
                rounded-full px-3.5 text-sm font-medium
                text-[var(--muted-foreground)]
                transition-colors duration-200
                hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]
                active:scale-95 disabled:pointer-events-none disabled:opacity-50
              "
            >
              Cancel
            </button>

            {/* CENTER — Title */}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              <Sparkles
                className="h-3.5 w-3.5 text-[var(--primary)]"
                strokeWidth={2}
              />
              <DialogTitle
                className="truncate text-sm font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                New post
              </DialogTitle>
            </div>

            {/* RIGHT — Share */}
            <button
              type="button"
              onClick={createPostHandler}
              disabled={loading || !imagePreview}
              className="
                inline-flex h-9 min-w-[84px] shrink-0 items-center justify-center gap-1.5
                rounded-full px-4 text-sm font-semibold
                transition-all duration-200
                active:scale-95 disabled:pointer-events-none disabled:opacity-40
              "
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting</span>
                </>
              ) : (
                <span>Share</span>
              )}
            </button>
          </div>

          <DialogDescription className="sr-only">
            Create and share a new post.
          </DialogDescription>
        </DialogHeader>

        {/* =====================================================
            BODY
        ====================================================== */}
        <div className="max-h-[calc(92vh-64px)] overflow-y-auto px-4 py-4">
          {/* User info */}
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-[var(--border)]">
              <AvatarImage
                src={user?.profilePicture}
                alt={user?.username || "User"}
              />
              <AvatarFallback className="text-sm font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {user?.username || "You"}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Post to everyone
              </p>
            </div>
          </div>

          {/* Image preview / upload */}
          {imagePreview ? (
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
              <img
                src={imagePreview}
                alt="Post preview"
                className="block max-h-[360px] min-h-[200px] w-full object-contain"
              />

              {/* Remove image button */}
              <button
                type="button"
                onClick={clearImage}
                aria-label="Remove image"
                className="
                  absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center
                  rounded-full border border-white/20 bg-black/70 text-white
                  backdrop-blur-md transition-all duration-200
                  hover:scale-110 hover:bg-black/90 active:scale-95
                "
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>

              {/* Ready badge */}
              <div
                className="
                  absolute bottom-3 left-3 z-10 flex items-center gap-1.5
                  rounded-full border border-white/15 bg-black/60 px-2.5 py-1
                  text-[11px] font-medium text-white backdrop-blur-md
                "
              >
                <Check className="h-3 w-3" />
                Image ready
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative mb-4 flex min-h-[240px] flex-col items-center justify-center
                overflow-hidden rounded-2xl border border-dashed px-6 py-8 text-center
                transition-all duration-300
                ${
                  dragging
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]/40"
                }
              `}
            >
              {/* Icon */}
              <div
                className={`
                  relative mb-4 flex h-14 w-14 items-center justify-center
                  rounded-2xl border border-[var(--border)] bg-[var(--background)]
                  transition-all duration-300
                  ${dragging ? "scale-110 rotate-2" : ""}
                `}
              >
                {dragging ? (
                  <Upload className="h-6 w-6 text-[var(--primary)] animate-bounce" />
                ) : (
                  <ImagePlus
                    className="h-6 w-6 text-[var(--primary)]"
                    strokeWidth={1.7}
                  />
                )}
              </div>

              <h3 className="relative text-sm font-semibold text-[var(--foreground)]">
                {dragging ? "Drop to upload" : "Share a moment"}
              </h3>

              <p className="relative mt-1 max-w-xs text-xs text-[var(--muted-foreground)]">
                Drag & drop an image here, or choose one from your device.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="
                  relative mt-4 inline-flex h-9 items-center justify-center gap-1.5
                  rounded-full border border-[var(--border)] bg-[var(--background)]
                  px-4 text-xs font-medium
                  transition-all duration-200
                  hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]
                  active:scale-95
                "
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Choose from device
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={fileChangeHandler}
                className="hidden"
              />
            </div>
          )}

          {/* Caption */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--foreground)]">
                Caption
              </label>
              <span
                className={`text-[11px] tabular-nums transition-colors ${
                  caption.length > 1900
                    ? "text-[var(--danger)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {caption.length}/2000
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 transition-colors focus-within:border-[var(--primary)]/50">
              <Textarea
                value={caption}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) {
                    setCaption(e.target.value);
                  }
                }}
                placeholder="Write a caption..."
                className="
                  min-h-[100px] resize-none border-0 bg-transparent
                  px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-none
                  outline-none focus-visible:ring-0
                "
              />

              <div className="h-0.5 w-full bg-[var(--border)]">
                <div
                  className="h-full rounded-r-full transition-all duration-200"
                  style={{
                    width: `${Math.min((caption.length / 2000) * 100, 100)}%`,
                    background: "var(--primary)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
