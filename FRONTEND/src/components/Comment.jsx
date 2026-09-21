import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";

const Comment = ({ comment }) => {
  return (
    <div className="group flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors duration-200">
      <Link
        to={`/profile/${comment?.author?._id}`}
        className="shrink-0 relative"
      >
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-60 transition-opacity" />
        <Avatar className="relative h-8 w-8 ring-2 ring-[#0a0a18]">
          <AvatarImage src={comment?.author?.profilePicture} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-[11px] font-semibold">
            {(comment?.author?.fullName || comment?.author?.username)
              ?.charAt(0)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${comment?.author?._id}`}
          className="inline-block font-semibold text-[13px] text-white/95 hover:text-violet-300 transition-colors"
        >
          {comment?.author?.fullName || comment?.author?.username}
        </Link>
        <p className="text-[13px] text-white/70 leading-relaxed mt-0.5 break-words">
          {comment?.text}
        </p>
      </div>
    </div>
  );
};

export default Comment;
