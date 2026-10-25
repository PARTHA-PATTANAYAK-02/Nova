import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Heart, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { getDisplayName } from "@/lib/utils";
import RichText from "@/components/common/RichText";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { playLikeSound } from "@/lib/sound";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const units = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  let valueInUnit = seconds;
  let unit = "second";
  for (const [limit, candidate] of units) {
    unit = candidate;
    if (abs < limit) break;
    valueInUnit = Math.round(
      seconds /
        (limit === 60
          ? 60
          : limit === 3600
            ? 3600
            : limit === 86400
              ? 86400
              : limit === 604800
                ? 604800
                : limit === 2629800
                  ? 2629800
                  : 31557600),
    );
  }
  const divisor = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2629800,
    year: 31557600,
  }[unit];
  valueInUnit = Math.round(seconds / divisor);
  if (unit === "second" && abs < 10) return "now";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    valueInUnit,
    unit,
  );
};

const CommentItem = ({
  comment,
  currentUserId,
  onReply,
  isNested = false,
}) => {
  const author = comment?.author || comment?.user || {};
  const authorName = getDisplayName(author, "User");
  const commentText = comment?.text || comment?.comment || "";
  const createdAt = formatRelativeTime(comment?.createdAt);

  const initialLikes = Array.isArray(comment?.likes) ? comment.likes : [];
  const [likes, setLikes] = useState(initialLikes);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  if (!commentText) return null;

  const isLiked = currentUserId && likes.some((id) => (id?._id || id)?.toString() === currentUserId?.toString());
  const initial = authorName.charAt(0).toUpperCase();
  const replies = Array.isArray(comment?.replies) ? comment.replies : [];

  const handleLike = async () => {
    if (!comment?._id || !currentUserId || isLiking) return;
    const wasLiked = isLiked;
    const nextLiked = !wasLiked;
    playLikeSound(nextLiked);

    setLikes((prev) =>
      nextLiked
        ? [...prev, currentUserId]
        : prev.filter((id) => (id?._id || id)?.toString() !== currentUserId?.toString())
    );

    try {
      setIsLiking(true);
      const res = await axios.post(
        apiUrl(`/api/v1/post/comment/${comment._id}/like`),
        {},
        { withCredentials: true },
      );
      if (!res.data.success) throw new Error("Like failed");
    } catch (err) {
      setLikes(initialLikes);
      toast.error("Unable to like comment");
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className={`flex flex-col ${isNested ? "mt-2.5" : "my-1"}`}>
      <article className="nova-comment flex items-start gap-2.5 group">
        <Link
          to={`/profile/${author.username || author._id}`}
          className="nova-comment__avatar shrink-0 pt-0.5"
          aria-label={`${authorName} profile`}
        >
          <Avatar className={`border border-[var(--border)] ${isNested ? "size-6.5" : "size-8"}`}>
            <AvatarImage src={author.profilePicture} alt={authorName} />
            <AvatarFallback className="text-[10px] font-bold">{initial}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="nova-comment__content flex-1 min-w-0">
          <p className="nova-comment__line text-[13px] leading-snug">
            <Link
              to={`/profile/${author.username || author._id}`}
              className="nova-comment__author font-semibold mr-1.5 text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
            >
              {authorName}
            </Link>{" "}
            <RichText text={commentText} className="nova-comment__text text-[var(--foreground)]/90" />
          </p>

          {/* Action row under comment */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--muted-foreground)]">
            {createdAt && <time dateTime={comment.createdAt}>{createdAt}</time>}

            {likes.length > 0 && (
              <span className="font-semibold text-[var(--foreground)]/80">
                {likes.length} {likes.length === 1 ? "like" : "likes"}
              </span>
            )}

            {onReply && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="font-semibold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors cursor-pointer select-none"
              >
                Reply
              </button>
            )}
          </div>
        </div>

        {/* Small Heart Like Button on the right */}
        {currentUserId && (
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            aria-label={isLiked ? "Unlike comment" : "Like comment"}
            className={`shrink-0 p-1 rounded-full transition-transform active:scale-75 ${
              isLiked ? "text-[#ff315d]" : "text-[var(--muted-foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            <Heart
              className="size-3.5"
              fill={isLiked ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
        )}
      </article>

      {/* Collapsible Nested Replies Thread */}
      {replies.length > 0 && (
        <div className="ml-5 sm:ml-7 mt-1.5 pl-3 border-l-2 border-[var(--border)]/70">
          <button
            type="button"
            onClick={() => setShowReplies((prev) => !prev)}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--primary)] py-1 transition-colors select-none cursor-pointer group/toggle"
          >
            <span className="w-4 h-[1px] bg-[var(--border)] group-hover/toggle:bg-[var(--primary)] transition-colors" />
            {showReplies ? (
              <>
                <span>Hide replies</span>
                <ChevronUp className="size-3" />
              </>
            ) : (
              <>
                <span>View {replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
                <ChevronDown className="size-3" />
              </>
            )}
          </button>

          {showReplies && (
            <div className="flex flex-col gap-2 mt-1 animate-in fade-in-50 duration-200">
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id || `reply-${Math.random()}`}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  isNested={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Comment = ({ comment, currentUserId, onReply }) => {
  return (
    <CommentItem
      comment={comment}
      currentUserId={currentUserId}
      onReply={onReply}
      isNested={false}
    />
  );
};

export default Comment;
