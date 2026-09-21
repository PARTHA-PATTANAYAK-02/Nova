import React from "react";
import Post from "./Post";
import { useSelector } from "react-redux";
import { ErrorState, LoadingState } from "./RequestState";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const Posts = ({ requestState }) => {
  const { posts } = useSelector((store) => store.post);
  const loadMoreRef = useRef(null);

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !requestState.hasMore) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) requestState.loadMore();
      },
      { rootMargin: "500px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [requestState]);

  if (requestState.loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        <FeedSkeleton />
        <FeedSkeleton />
        <FeedSkeleton />
      </div>
    );
  }

  if (requestState.error && posts.length === 0) {
    return (
      <ErrorState message={requestState.error} onRetry={requestState.retry} />
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass rounded-[28px] p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-white/60" />
        </div>
        <p className="font-display text-lg font-semibold text-white">
          Your orbit is quiet
        </p>
        <p className="mt-2 text-sm text-white/50 max-w-xs mx-auto">
          Follow people or create your first post to fill this space.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {posts.map((post, index) => (
        <div
          key={post._id}
          className="animate-slide-up opacity-0"
          style={{
            animationDelay: `${Math.min(index * 60, 600)}ms`,
            animationFillMode: "forwards",
          }}
        >
          <Post post={post} />
        </div>
      ))}

      {/* ---------- Load more sentinel ---------- */}
      <div
        ref={loadMoreRef}
        className="flex min-h-20 items-center justify-center pt-2"
      >
        {requestState.loadingMore && (
          <div className="flex items-center gap-3 glass rounded-full px-5 py-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-white/70" />
            <span className="text-xs text-white/60 font-medium">
              Loading more
            </span>
          </div>
        )}
        {!requestState.hasMore && posts.length > 0 && (
          <div className="flex items-center gap-3 text-white/30">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
            <p className="text-[11px] tracking-wide uppercase font-medium">
              All caught up
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;

/* ---------- Skeleton loader ---------- */
const FeedSkeleton = () => (
  <div className="glass rounded-[28px] overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-3 p-4">
      <div className="h-10 w-10 rounded-full shimmer-bg" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded-full shimmer-bg" />
        <div className="h-2.5 w-20 rounded-full shimmer-bg" />
      </div>
      <div className="h-6 w-6 rounded-lg shimmer-bg" />
    </div>
    {/* Image */}
    <div className="aspect-square w-full shimmer-bg" />
    {/* Actions */}
    <div className="p-4 space-y-3">
      <div className="flex gap-3">
        <div className="h-6 w-6 rounded-lg shimmer-bg" />
        <div className="h-6 w-6 rounded-lg shimmer-bg" />
        <div className="h-6 w-6 rounded-lg shimmer-bg" />
      </div>
      <div className="h-3 w-24 rounded-full shimmer-bg" />
      <div className="h-3 w-3/4 rounded-full shimmer-bg" />
    </div>
  </div>
);
