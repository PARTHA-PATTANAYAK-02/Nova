import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Play, ImageOff, Heart as LucideHeart } from "lucide-react";
import {
  HashIcon,
  ArrowLeftIcon,
  HeartIcon,
  MessageCircleIcon,
  SparklesIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { useDispatch } from "react-redux";
import { setSelectedPost } from "@/redux/postSlice";
import CommentDialog from "@/components/comments/CommentDialog";

const HashtagExplorePage = () => {
  const { tag } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);

  useEffect(() => {
    if (!tag) return;
    const cleanTag = decodeURIComponent(tag).replace(/^#/, "");

    setLoading(true);
    setError(null);

    axios
      .get(apiUrl(`/api/v1/post/tag/${encodeURIComponent(cleanTag)}`), {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data?.success) {
          setPosts(res.data.posts || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load tag posts:", err);
        setError("Unable to load posts for this hashtag.");
      })
      .finally(() => setLoading(false));
  }, [tag]);

  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    setOpenCommentDialog(true);
  };

  const cleanTag = decodeURIComponent(tag || "").replace(/^#/, "");

  return (
    <div className="min-h-screen pb-20 select-none">
      {/* ═══ Header ═══ */}
      <div className="sticky top-0 z-30 bg-[#090b14]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer group"
              title="Go back"
            >
              <AnimatedIcon icon={ArrowLeftIcon} size={20} />
            </button>
            <div className="flex items-center gap-2 group">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
                <AnimatedIcon icon={HashIcon} size={18} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  #{cleanTag}
                </h1>
                <p className="text-xs text-white/50">
                  {loading ? "Searching posts…" : `${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-medium group">
            <AnimatedIcon icon={SparklesIcon} size={14} className="text-cyan-400" />
            <span>Hashtag Feed</span>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-white/5 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="size-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ImageOff className="size-6" />
            </div>
            <p className="text-white/70 text-sm font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-white transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4 group">
            <div className="size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10">
              <AnimatedIcon icon={HashIcon} size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">No posts with #{cleanTag} yet</h2>
              <p className="text-sm text-white/50 max-w-sm mt-1">
                Be the first person to share a photo or video using #{cleanTag}!
              </p>
            </div>
            <Link
              to="/"
              className="mt-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {posts.map((post, idx) => (
              <div
                key={post._id}
                onClick={() => handlePostClick(post)}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-black/40 border border-white/10 hover:border-cyan-500/50 transition-all duration-200"
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                {post.mediaType === "video" ? (
                  <video
                    src={post.image}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={post.image}
                    alt={post.caption || "Post"}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Video Play Badge */}
                {post.mediaType === "video" && (
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <Play className="size-3 fill-white" />
                  </div>
                )}

                {/* Hover Overlay with Stats */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white">
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <LucideHeart size={16} fill="white" color="white" />
                    {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <AnimatedIcon icon={MessageCircleIcon} size={16} fill="white" className="text-white" parentSelector=".group" />
                    {post.comments?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CommentDialog
        open={openCommentDialog}
        setOpen={setOpenCommentDialog}
      />
    </div>
  );
};

export default HashtagExplorePage;
