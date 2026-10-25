import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Play,
  Sparkles,
  ImageOff,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { apiUrl } from "@/lib/api";

// Simple in-memory cache to prevent redundant API calls for duplicate or re-rendering messages
const postCache = new Map();

const InChatPostCard = ({ postId, isMine, onOpenPost }) => {
  const navigate = useNavigate();
  const [post, setPost] = useState(() => postCache.get(postId) || null);
  const [loading, setLoading] = useState(() => !postCache.has(postId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!postId) return;
    if (postCache.has(postId)) {
      setPost(postCache.get(postId));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    axios
      .get(apiUrl(`/api/v1/post/${postId}/detail`), { withCredentials: true })
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data.post) {
          postCache.set(postId, res.data.post);
          setPost(res.data.post);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onOpenPost) {
      onOpenPost(postId);
    } else {
      navigate(`/post/${postId}`);
    }
  };

  if (loading) {
    return (
      <div
        className={`w-64 sm:w-72 rounded-2xl p-3 border mb-2 select-none animate-pulse ${
          isMine
            ? "bg-white/10 border-white/20 text-white"
            : "bg-black/30 border-white/10 text-white"
        }`}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div className="size-7 rounded-full bg-white/20" />
          <div className="h-3 w-28 rounded bg-white/20" />
        </div>
        <div className="aspect-square w-full rounded-xl bg-white/15 mb-2 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-white/40" />
        </div>
        <div className="h-3 w-3/4 rounded bg-white/20" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div
        className={`w-60 sm:w-64 rounded-2xl p-2.5 border mb-2 text-left flex items-center gap-2.5 select-none ${
          isMine
            ? "bg-white/5 border-dashed border-white/20 text-white/70"
            : "bg-black/20 border-dashed border-white/15 text-white/70"
        }`}
      >
        <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <ImageOff className="size-4 text-white/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-white/90 truncate">Post unavailable</p>
          <p className="text-[10px] text-white/50 truncate">This post may have been removed</p>
        </div>
      </div>
    );
  }

  const author = post.author || {};
  const isVideo = post.mediaType === "video";
  const likeCount = (post.likes || []).length;
  const commentCount = (post.comments || []).length;

  return (
    <div
      onClick={handleClick}
      className={`group/postcard w-64 sm:w-72 rounded-2xl overflow-hidden border mb-2 cursor-pointer transition-all duration-200 select-none text-left shadow-lg active:scale-[0.985] ${
        isMine
          ? "bg-gradient-to-b from-white/[0.14] to-white/[0.06] hover:from-white/[0.20] hover:to-white/[0.10] border-white/25"
          : "bg-gradient-to-b from-black/60 to-black/80 hover:from-black/70 hover:to-black/90 border-white/15"
      }`}
    >
      {/* Author Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-6 ring-1 ring-white/30 shrink-0">
            <AvatarImage src={author.profilePicture} />
            <AvatarFallback className="text-[10px] bg-zinc-800 text-white font-bold">
              {author.fullName?.[0] || author.username?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-white truncate max-w-[130px]">
            {author.fullName || author.username || "User"}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
          <Sparkles className="size-2.5" />
          <span>Post</span>
        </span>
      </div>

      {/* Media Preview */}
      <div className="relative aspect-square w-full bg-black/50 overflow-hidden">
        {isVideo ? (
          <>
            <video
              src={post.image}
              className="size-full object-cover group-hover/postcard:scale-105 transition-transform duration-300"
              muted
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="size-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/30 shadow-lg group-hover/postcard:scale-110 transition-transform">
                <Play className="size-4 fill-white ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={post.image}
            alt="Post preview"
            className="size-full object-cover group-hover/postcard:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Floating Quick Stats on Media */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white">
            <span className="flex items-center gap-1">
              <Heart className="size-3 fill-red-400 text-red-400" />
              <span>{likeCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3 text-white/90" />
              <span>{commentCount}</span>
            </span>
          </div>

          <div className="size-6 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover/postcard:scale-110 transition-transform">
            <ExternalLink className="size-3" />
          </div>
        </div>
      </div>

      {/* Caption & View CTA */}
      <div className="p-2.5 pt-2">
        {post.caption && (
          <p className="text-xs text-white/90 line-clamp-2 leading-relaxed mb-2 px-0.5">
            <span className="font-semibold text-white mr-1.5">
              {author.username}
            </span>
            {post.caption}
          </p>
        )}

        <div className="w-full py-1.5 rounded-xl bg-white/15 group-hover/postcard:bg-white/25 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
          <span>View Post</span>
          <ExternalLink className="size-3" />
        </div>
      </div>
    </div>
  );
};

export default InChatPostCard;
