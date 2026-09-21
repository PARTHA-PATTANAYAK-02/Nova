import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Comment from "./Comment";
import axios from "axios";
import { toast } from "sonner";
import { setPosts } from "@/redux/postSlice";
import { Textarea } from "./ui/textarea";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts } = useSelector((store) => store.post);
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    setComments(selectedPost?.comments || []);
  }, [selectedPost]);

  const sendMessageHandler = async () => {
    if (!text.trim() || !selectedPost?._id) return;

    try {
      setSubmitting(true);
      const res = await axios.post(
        apiUrl(`/api/v1/post/${selectedPost?._id}/comment`),
        { text },
        { withCredentials: true },
      );

      if (res.data.success) {
        const updatedComments = [...comments, res.data.comment];
        setComments(updatedComments);

        const updatedPosts = posts.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: updatedComments } : p,
        );
        dispatch(setPosts(updatedPosts));
        toast.success("Comment added");
        setText("");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl p-0 h-[85vh] md:h-[80vh] overflow-hidden glass-strong !rounded-[28px] !border-white/10 !gap-0 flex flex-col md:flex-row">
        <DialogTitle className="sr-only">Comments</DialogTitle>
        <DialogDescription className="sr-only">
          View and add comments on this post
        </DialogDescription>

        {/* ============ IMAGE PANEL ============ */}
        <div className="hidden md:flex md:w-1/2 bg-black/50 items-center justify-center relative overflow-hidden">
          <img
            src={selectedPost?.image}
            alt="Post"
            className="w-full h-full object-contain"
          />
        </div>

        {/* ============ COMMENTS PANEL ============ */}
        <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-white/[0.02] backdrop-blur-xl">
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-70" />
                <Avatar className="relative h-9 w-9 ring-2 ring-[#0a0a18]">
                  <AvatarImage src={selectedPost?.author?.profilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-xs font-semibold">
                    {(
                      selectedPost?.author?.fullName ||
                      selectedPost?.author?.username
                    )
                      ?.charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${selectedPost?.author?._id}`}
                  className="font-semibold text-sm text-white hover:text-violet-300 transition-colors truncate block"
                >
                  {selectedPost?.author?.fullName ||
                    selectedPost?.author?.username}
                </Link>
                <p className="text-[11px] text-white/40">Author</p>
              </div>

              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/50">
                {comments.length}{" "}
                {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <Comment key={comment._id} comment={comment} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-white/50" />
                </div>
                <p className="font-display text-sm font-semibold text-white">
                  No comments yet
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Be the first to say something.
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 p-3 border-t border-white/8">
            <div className="flex items-end gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                rows={1}
                className="min-h-[42px] max-h-32 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl resize-none focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 py-2.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !submitting) {
                    e.preventDefault();
                    sendMessageHandler();
                  }
                }}
              />
              <button
                onClick={sendMessageHandler}
                disabled={!text.trim() || submitting}
                className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_18px_rgba(124,92,255,0.4)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
