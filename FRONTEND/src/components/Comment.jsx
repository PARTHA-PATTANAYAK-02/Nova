import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";

const Comment = ({ comment }) => {
  // Backend may use different field names — try both
  const author = comment?.author || comment?.user || {};
  const authorName = author.fullName?.trim() || author.username || "User";
  const commentText = comment?.text || comment?.comment || "";

  // Skip rendering if there's no comment text at all
  if (!commentText) return null;

  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
      <Link to={`/profile/${author._id}`} className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.profilePicture} />
          <AvatarFallback>{authorName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${author._id}`}
          className="font-semibold text-[13px] text-[var(--foreground)] hover:opacity-80 transition-opacity truncate inline-block"
        >
          {authorName}
        </Link>
        <p className="text-[13px] text-[var(--foreground)]/85 leading-relaxed mt-0.5 break-words">
          {commentText}
        </p>
      </div>
    </div>
  );
};

export default Comment;
