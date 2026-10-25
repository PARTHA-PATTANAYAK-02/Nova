import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector, useDispatch } from "react-redux";
import { Loader2, Sparkles, SendHorizontal } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { setPosts } from "@/redux/postSlice";
import { getDisplayName } from "@/lib/utils";

const QuotePostModal = ({ isOpen, onClose, post }) => {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { posts } = useSelector((store) => store.post);
  const dispatch = useDispatch();

  if (!post) return null;

  const originalAuthor = post.author || {};
  const originalDisplayName = getDisplayName(originalAuthor, "User");

  const handleShareQuote = async (e) => {
    e?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/quote`),
        { caption },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Quote shared! 💬");
        if (res.data.post) {
          dispatch(setPosts([res.data.post, ...(posts || [])]));
        }
        setCaption("");
        onClose();
      } else {
        toast.error("Failed to share quote.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error quoting post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[460px] p-0 rounded-3xl bg-[#0e1122]/95 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden select-none">
        <DialogHeader className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Sparkles className="size-3.5" />
            </span>
            Quote Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleShareQuote} className="p-5 flex flex-col gap-4">
          {/* User input row */}
          <div className="flex items-start gap-3">
            <Avatar className="size-10 rounded-2xl border border-white/15 shrink-0">
              <AvatarImage src={user?.profilePicture} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                {user?.fullName?.[0] || user?.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add your thoughts or commentary…"
              maxLength={400}
              rows={3}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/40 resize-none outline-none leading-relaxed font-sans"
              autoFocus
            />
          </div>

          {/* Quoted post card preview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex gap-3 overflow-hidden">
            {post.image && (
              <div className="size-16 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10">
                {post.mediaType === "video" ? (
                  <video src={post.image} className="size-full object-cover" />
                ) : (
                  <img src={post.image} alt="" className="size-full object-cover" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5 rounded-full">
                  <AvatarImage src={originalAuthor.profilePicture} />
                  <AvatarFallback className="text-[9px]">U</AvatarFallback>
                </Avatar>
                <p className="text-xs font-semibold text-white truncate">
                  {originalDisplayName}
                </p>
                <span className="text-[11px] text-white/40 truncate">
                  @{originalAuthor.username}
                </span>
              </div>
              {post.caption && (
                <p className="text-xs text-white/70 line-clamp-2 mt-1 leading-snug">
                  {post.caption}
                </p>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[11px] text-white/40">
              {caption.length}/400
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-grad-btn text-white text-xs font-bold shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Sharing…</span>
                  </>
                ) : (
                  <>
                    <SendHorizontal className="size-3.5" />
                    <span>Share Quote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotePostModal;
