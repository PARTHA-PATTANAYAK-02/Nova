import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { getDisplayName } from "@/lib/utils";

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
    valueInUnit = Math.round(seconds / (limit === 60 ? 60 : limit === 3600 ? 3600 : limit === 86400 ? 86400 : limit === 604800 ? 604800 : limit === 2629800 ? 2629800 : 31557600));
  }
  const divisor = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 }[unit];
  valueInUnit = Math.round(seconds / divisor);
  if (unit === "second" && abs < 10) return "now";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(valueInUnit, unit);
};

const Comment = ({ comment }) => {
  const author = comment?.author || comment?.user || {};
  const authorName = getDisplayName(author, "User");
  const commentText = comment?.text || comment?.comment || "";
  const createdAt = formatRelativeTime(comment?.createdAt);
  if (!commentText) return null;

  return (
    <article className="comment-premium">
      <Link to={`/profile/${author._id}`} className="comment-premium__avatar-link" aria-label={`${authorName} profile`}>
        <Avatar className="comment-premium__avatar">
          <AvatarImage src={author.profilePicture} alt={authorName} />
          <AvatarFallback>{authorName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="comment-premium__content">
        <div className="comment-premium__bubble">
          <Link to={`/profile/${author._id}`} className="comment-premium__author">{authorName}</Link>{" "}
          <span className="comment-premium__text">{commentText}</span>
        </div>
        <div className="comment-premium__meta">
          {createdAt && <time dateTime={comment.createdAt}>{createdAt}</time>}
        </div>
      </div>
    </article>
  );
};

export default Comment;
