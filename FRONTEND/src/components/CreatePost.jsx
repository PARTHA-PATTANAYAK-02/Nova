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
import { Loader2, ImagePlus, X, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";

const CreatePost = ({ open, setOpen }) => {
  const imageRef = useRef();
  const [file, setFile] = useState("");
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { posts } = useSelector((store) => store.post);
  const dispatch = useDispatch();

  /* ---------- LOGIC (UNCHANGED) ---------- */
  const fileChangeHandler = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setImagePreview(dataUrl);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setImagePreview(dataUrl);
    } else if (file) {
      toast.error("Please drop an image file.");
    }
  };

  const createPostHandler = async () => {
    if (!imagePreview) {
      toast.error("Please select an image");
      return;
    }

    const formData = new FormData();
    formData.append("caption", caption);
    formData.append("image", file);

    try {
      setLoading(true);
      const res = await axios.post(apiUrl("/api/v1/post/addpost"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setPosts([res.data.post, ...posts]));
        toast.success("Post created successfully");
        setOpen(false);
        setCaption("");
        setImagePreview("");
        setFile("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImagePreview("");
    setFile("");
  };

  /* ---------- UI ---------- */
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-[560px] max-h-[92vh] p-0 overflow-hidden glass-strong !rounded-[28px] !border-white/10 !gap-0">
        {/* ============ HEADER ============ */}
        <DialogHeader className="relative px-5 py-4 border-b border-white/8 !space-y-0">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              <DialogTitle className="font-display text-sm font-semibold text-white">
                New post
              </DialogTitle>
            </div>

            <button
              onClick={createPostHandler}
              disabled={!imagePreview || loading}
              className="text-xs font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(124,92,255,0.45)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {loading ? "Posting" : "Share"}
            </button>
          </div>

          <DialogDescription className="sr-only">
            Upload an image and write a caption to share a new post
          </DialogDescription>
        </DialogHeader>

        {/* ============ BODY ============ */}
        <div className="px-5 pb-5 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-70" />
              <Avatar className="relative h-10 w-10 ring-2 ring-[#0a0a18]">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-xs font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">
                {user?.username}
              </p>
              <p className="text-[11px] text-white/40">Post to everyone</p>
            </div>
          </div>

          {/* Image area */}
          {imagePreview ? (
            <div className="relative rounded-3xl overflow-hidden bg-black/40 border border-white/8 group">
              <img
                src={imagePreview}
                alt="preview"
                className="w-full max-h-[50vh] object-contain mx-auto"
              />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all opacity-0 group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center py-14 rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
                dragging
                  ? "border-violet-400/70 bg-violet-500/10 scale-[1.01]"
                  : "border-white/15 hover:border-white/25 bg-white/[0.02]"
              }`}
            >
              {/* gradient blob behind */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl" />
              </div>

              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-4">
                {dragging ? (
                  <Upload className="w-7 h-7 text-violet-300" />
                ) : (
                  <ImagePlus className="w-7 h-7 text-white/60" />
                )}
              </div>

              <p className="relative font-display font-semibold text-white text-base">
                {dragging ? "Drop to upload" : "Drop photos here"}
              </p>
              <p className="relative text-xs text-white/40 mt-1 mb-4">
                or choose from your device
              </p>

              <span className="relative text-xs font-semibold px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/90 hover:bg-white/12 hover:border-white/20 transition-all">
                Select from computer
              </span>

              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={fileChangeHandler}
              />
            </label>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="caption"
                className="text-xs font-medium text-white/70"
              >
                Caption{" "}
                <span className="text-white/35 font-normal">(optional)</span>
              </label>
              <span className="text-[11px] text-white/35 tabular-nums">
                {caption.length}/2,200
              </span>
            </div>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl resize-none focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20"
              maxLength={2200}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
