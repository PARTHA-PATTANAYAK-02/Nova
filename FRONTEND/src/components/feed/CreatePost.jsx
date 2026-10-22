import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ImagePlus,
  Video,
  X,
  Upload,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const CAPTION_MAX = 500;

const CreatePost = ({ open, setOpen }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const previewUrlRef = useRef("");

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { posts } = useSelector((s) => s.post);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    const isVideo = selectedFile.type.startsWith("video/");
    const isImage = selectedFile.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("Please select an image or video file.");
      return;
    }
    if (
      (isVideo && selectedFile.size > 50 * 1024 * 1024) ||
      (isImage && selectedFile.size > 10 * 1024 * 1024)
    ) {
      toast.error(
        isVideo
          ? "Videos must be 50 MB or smaller."
          : "Images must be 10 MB or smaller.",
      );
      return;
    }
    try {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(selectedFile);
      previewUrlRef.current = url;
      setFile(selectedFile);
      setImagePreview(url);
    } catch (e) {
      console.error(e);
      toast.error("Unable to preview this image.");
    }
  };

  const fileChangeHandler = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await processFile(f);
  };

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
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await processFile(f);
  };

  const clearImage = () => {
    setFile(null);
    setImagePreview("");
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setFile(null);
    setCaption("");
    setImagePreview("");
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setLoading(false);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    resetForm();
  };

  const createPostHandler = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to share posts.");
      return;
    }
    if (!imagePreview || !file) {
      toast.error("Please select an image or video first.");
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("caption", caption);
      fd.append("image", file);
      const res = await axios.post(apiUrl("/api/v1/post/addpost"), fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      if (res.data?.post) dispatch(setPosts([res.data.post, ...posts]));
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
    <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="
          nova-create-post
          w-[calc(100vw-20px)] max-w-[540px]
          max-h-[92dvh]
          overflow-hidden p-0 rounded-[26px]
          bg-[var(--surface)]/95 backdrop-blur-2xl
          border border-[var(--border)]
          shadow-[0_32px_80px_-24px_rgba(0,0,0,.4),0_8px_24px_-12px_var(--glow)]
          flex flex-col
        "
      >
        {/* ═════════ HEADER (fixed) ═════════ */}
        <DialogHeader className="nova-create-post__header">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="nova-create-post__cancel"
            >
              Cancel
            </button>

            <div className="flex items-center gap-1.5">
              <Sparkles
                className="size-3.5 text-[var(--primary)]"
                strokeWidth={2}
              />
              <DialogTitle className="font-display text-sm font-semibold text-[var(--foreground)]">
                New post
              </DialogTitle>
            </div>

            <button
              type="button"
              onClick={createPostHandler}
              disabled={loading || !imagePreview}
              className="nova-create-post__share"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Posting
                </>
              ) : (
                "Share"
              )}
            </button>
          </div>
          <DialogDescription className="sr-only">
            Create and share a new post.
          </DialogDescription>
        </DialogHeader>

        {/* ═════════ BODY (scrollable) ═════════ */}
        <div className="nova-create-post__body">
          <div className="nova-create-post__user">
            <span className="relative shrink-0 size-9 flex items-center justify-center">
              <Avatar className="size-9 border border-[var(--border)]">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>
                  {getDisplayName(user, "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                {getDisplayName(user, "You")}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Post to everyone
              </p>
            </div>
          </div>

          {imagePreview ? (
            <div className="nova-create-post__preview">
              {file?.type.startsWith("video/") ? (
                <video
                  src={imagePreview}
                  aria-label="Post video preview"
                  controls
                  playsInline
                  className="nova-create-post__media"
                />
              ) : (
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="nova-create-post__media"
                />
              )}

              <button
                type="button"
                onClick={clearImage}
                aria-label="Remove image"
                className="nova-create-post__clear"
              >
                <X className="size-3.5" strokeWidth={2.4} />
              </button>

              <div className="nova-create-post__ready">
                <Check className="size-3" />
                {file?.type.startsWith("video/")
                  ? "Video ready"
                  : "Image ready"}
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`nova-create-post__drop ${
                dragging ? "is-dragging" : ""
              }`}
            >
              <div
                className={`nova-create-post__drop-icon ${dragging ? "is-dragging" : ""}`}
              >
                {dragging ? (
                  <Upload className="size-5 text-[var(--primary)] animate-bounce" />
                ) : (
                  <span className="flex items-center gap-1">
                    <ImagePlus
                      className="size-4 text-[var(--primary)]"
                      strokeWidth={1.8}
                    />
                    <Video
                      className="size-4 text-[var(--primary)]"
                      strokeWidth={1.8}
                    />
                  </span>
                )}
              </div>

              <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                {dragging ? "Drop to upload" : "Share a moment"}
              </h3>
              <p className="mt-0.5 max-w-[260px] text-[11px] text-[var(--muted-foreground)]">
                Photo up to 10 MB · video up to 50 MB
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="nova-create-post__choose"
              >
                <ImagePlus className="size-3.5" />
                Choose from device
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={fileChangeHandler}
                className="hidden"
              />
            </div>
          )}

          <div className="nova-create-post__caption-wrap">
            <div className="nova-create-post__caption-head">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Caption
              </label>
              <span
                className={`text-[11px] tabular-nums ${
                  caption.length > CAPTION_MAX - 50
                    ? "text-[var(--danger)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {caption.length}/{CAPTION_MAX}
              </span>
            </div>

            <div className="nova-create-post__caption-box">
              <Textarea
                value={caption}
                onChange={(e) => {
                  if (e.target.value.length <= CAPTION_MAX)
                    setCaption(e.target.value);
                }}
                placeholder="Write a caption..."
                className="nova-create-post__textarea"
              />
              <div className="nova-create-post__progress">
                <div
                  className="nova-create-post__progress-bar"
                  style={{
                    width: `${Math.min((caption.length / CAPTION_MAX) * 100, 100)}%`,
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
