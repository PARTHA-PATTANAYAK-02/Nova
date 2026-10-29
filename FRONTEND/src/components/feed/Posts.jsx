import React, { useEffect, useRef } from "react";
import Post from "@/components/feed/Post";
import { useSelector } from "react-redux";
import { ErrorState } from "@/components/common/RequestState";
import { Loader2, Compass } from "lucide-react";

const Posts = ({ requestState }) => {
  const { posts } = useSelector((s) => s.post);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !requestState.hasMore) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) requestState.loadMore();
      },
      { rootMargin: "500px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [requestState.hasMore, requestState.loadMore]);

  if (requestState.loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        <FeedSkeleton />
        <FeedSkeleton />
      </div>
    );
  }

  if (requestState.error && posts.length === 0) {
    return <ErrorState message={requestState.error} onRetry={requestState.retry} />;
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl bg-[var(--surface)]/60 backdrop-blur-xl border border-[var(--border)]/60 p-12 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <Compass className="size-6 text-[var(--muted-foreground)]" strokeWidth={1.8} />
        </div>
        <p className="font-display text-lg font-semibold text-[var(--foreground)]">
          Your feed is quiet
        </p>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
          Follow people or create your first post to fill this space.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <div
          key={post._id}
          className="feed-post-card animate-slide-up opacity-0"
          style={{
            animationDelay: `${Math.min(index * 50, 500)}ms`,
            animationFillMode: "forwards",
          }}
        >
          <Post post={post} />
        </div>
      ))}

      <div
        ref={loadMoreRef}
        className="flex min-h-16 items-center justify-center pt-2"
      >
        {requestState.loadingMore && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]/70 backdrop-blur-xl border border-[var(--border)]/60">
            <Loader2 className="size-3.5 animate-spin text-[var(--primary)]" />
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Loading
            </span>
          </div>
        )}
        {!requestState.hasMore && posts.length > 0 && (
          <div className="flex items-center gap-3 text-[var(--muted-foreground)]/70">
            <span className="h-px w-8 bg-[var(--border-strong)]" />
            <p className="text-[10px] tracking-[0.18em] uppercase font-medium">
              You're all caught up
            </p>
            <span className="h-px w-8 bg-[var(--border-strong)]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;

const FeedSkeleton = () => (
  <div className="rounded-3xl bg-[var(--surface)]/60 backdrop-blur-xl border border-[var(--border)]/60 overflow-hidden">
    <div className="flex items-center gap-3 p-4">
      <div className="size-10 rounded-full skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded-full skeleton" />
        <div className="h-2.5 w-20 rounded-full skeleton" />
      </div>
    </div>
    <div className="aspect-[4/5] w-full skeleton" />
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <div className="size-8 rounded-full skeleton" />
        <div className="size-8 rounded-full skeleton" />
        <div className="size-8 rounded-full skeleton" />
      </div>
      <div className="h-3 w-24 rounded-full skeleton" />
      <div className="h-3 w-3/4 rounded-full skeleton" />
    </div>
  </div>
);