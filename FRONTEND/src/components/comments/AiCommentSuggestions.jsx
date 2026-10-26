import React, { useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { SparklesIcon, RefreshCwIcon, CheckIcon } from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * AiCommentSuggestions - AI Smart Comment Assistant for Nova
 * Generates 3 contextual, high-vibe comment suggestions powered by Gemini.
 *
 * @param {Object} post - The post object (must include caption, author, etc.)
 * @param {Function} onSelectComment - Callback called with (commentText)
 * @param {string} className - Optional container styling
 * @param {boolean} compact - Compact mode for feed inline inputs
 */
const AiCommentSuggestions = ({
  post,
  onSelectComment,
  className = "",
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const iconRef = useRef(null);

  const fetchAiComments = async () => {
    if (!post?._id && !post?.caption) return;
    try {
      setLoading(true);
      setSelectedIdx(null);
      iconRef.current?.startAnimation?.();

      const res = await axios.post(
        apiUrl("/api/v1/post/ai-comments"),
        {
          postId: post?._id,
          caption: post?.caption || "",
          authorUsername: post?.author?.username || "",
        },
        { withCredentials: true }
      );

      if (res.data?.success && Array.isArray(res.data.comments)) {
        setSuggestions(res.data.comments);
      } else {
        toast.error("Couldn't generate suggestions. Try again.");
      }
    } catch (err) {
      console.error("AI comments error:", err);
      toast.error(err?.response?.data?.message || "Failed to generate AI comments.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen && suggestions.length === 0 && !loading) {
      fetchAiComments();
    }
  };

  const handleSelect = (item, idx) => {
    setSelectedIdx(idx);
    if (onSelectComment) {
      onSelectComment(item.text);
    }
    toast.success("AI comment applied! ✨", { duration: 1500 });
    setTimeout(() => {
      setOpen(false);
      setSelectedIdx(null);
    }, 220);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="✨ AI Smart Comment"
            aria-label="Generate AI comments"
            className={`
              relative group flex items-center justify-center transition-all duration-200 outline-none cursor-pointer
              ${
                compact
                  ? "size-7 rounded-lg text-pink-400 hover:text-pink-300 hover:bg-pink-500/15 active:scale-95"
                  : "size-8 rounded-full text-pink-400 hover:text-pink-300 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 border border-transparent hover:border-pink-500/30 active:scale-90"
              }
            `}
          >
            <AnimatedIcon
              ref={iconRef}
              icon={SparklesIcon}
              size={compact ? 15 : 17}
              strokeWidth={2.2}
              className="text-pink-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]"
            />
            <span className="sr-only">AI Smart Comments</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="
            w-[290px] sm:w-[320px] p-3 rounded-2xl
            bg-[var(--surface)]/95 backdrop-blur-2xl
            border border-[var(--border)]
            shadow-2xl shadow-black/40 z-[9999]
            select-none animate-in fade-in zoom-in-95 duration-150
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]/60">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-pink-400">
                <AnimatedIcon icon={SparklesIcon} size={13} strokeWidth={2.4} />
              </span>
              <span className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                AI Smart Replies
              </span>
            </div>

            <button
              type="button"
              onClick={fetchAiComments}
              disabled={loading}
              title="Get new suggestions"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all cursor-pointer group disabled:opacity-50"
            >
              <AnimatedIcon
                icon={RefreshCwIcon}
                size={11}
                className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-300"}
              />
              <span>Refresh</span>
            </button>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-4 px-1 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-pink-400 font-medium py-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="animate-pulse">Thinking with Gemini…</span>
              </div>
              <div className="h-9 rounded-xl bg-[var(--surface-2)]/60 animate-pulse border border-[var(--border)]/40" />
              <div className="h-9 rounded-xl bg-[var(--surface-2)]/60 animate-pulse border border-[var(--border)]/40" />
              <div className="h-9 rounded-xl bg-[var(--surface-2)]/60 animate-pulse border border-[var(--border)]/40" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-4 text-center text-xs text-[var(--muted-foreground)]">
              <p>No suggestions yet.</p>
              <button
                type="button"
                onClick={fetchAiComments}
                className="mt-2 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Click to generate ✨
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {suggestions.map((item, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(item, idx)}
                    className={`
                      w-full p-2 rounded-xl text-left transition-all duration-150 cursor-pointer group
                      flex items-start gap-2 border text-xs
                      ${
                        isSelected
                          ? "bg-primary/20 border-primary text-[var(--foreground)]"
                          : "bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border-[var(--border)]/60 text-[var(--foreground)]/90 hover:border-pink-500/40"
                      }
                    `}
                  >
                    <span className="shrink-0 text-sm mt-0.5" aria-hidden>
                      {item.emoji || "✨"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400/90">
                          {item.vibe || "Reply"}
                        </span>
                        {isSelected && (
                          <AnimatedIcon icon={CheckIcon} size={12} className="text-primary" />
                        )}
                      </div>
                      <p className="text-[12px] leading-snug line-clamp-2 text-[var(--foreground)]">
                        "{item.text}"
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Micro Footer Hint */}
          <div className="mt-2 pt-1.5 border-t border-[var(--border)]/40 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Tap any reply to fill your comment box ⚡
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AiCommentSuggestions;
