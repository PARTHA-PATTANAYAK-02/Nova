// import React from "react";
// import Post from "@/components/feed/Post";
// import { useSelector } from "react-redux";
// import { ErrorState, LoadingState } from "@/components/common/RequestState";
// import { Loader2, Compass } from "lucide-react";
// import { useEffect, useRef } from "react";

// const Posts = ({ requestState }) => {
//   const { posts } = useSelector((store) => store.post);
//   const loadMoreRef = useRef(null);

//   /* ---------- LOGIC (UNCHANGED) ---------- */
//   useEffect(() => {
//     const target = loadMoreRef.current;
//     if (!target || !requestState.hasMore) return undefined;

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (entry.isIntersecting) requestState.loadMore();
//       },
//       { rootMargin: "500px" },
//     );
//     observer.observe(target);
//     return () => observer.disconnect();
//   }, [requestState]);

//   if (requestState.loading && posts.length === 0) {
//     return (
//       <div className="space-y-4">
//         <FeedSkeleton />
//         <FeedSkeleton />
//         <FeedSkeleton />
//       </div>
//     );
//   }

//   if (requestState.error && posts.length === 0) {
//     return (
//       <ErrorState message={requestState.error} onRetry={requestState.retry} />
//     );
//   }

//   if (posts.length === 0) {
//     return (
//       <div className="card p-10 text-center">
//         <div
//           className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
//           style={{ background: "var(--surface-2)" }}
//         >
//           <Compass
//             className="w-5 h-5 text-[var(--muted-foreground)]"
//             strokeWidth={1.8}
//           />
//         </div>
//         <p
//           className="text-base font-semibold text-[var(--foreground)]"
//           style={{ fontFamily: "var(--font-display)" }}
//         >
//           Your feed is quiet
//         </p>
//         <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
//           Follow people or create your first post to fill this space.
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-3">
//       {posts.map((post, index) => (
//         <div
//           key={post._id}
//           className="animate-slide-up opacity-0"
//           style={{
//             animationDelay: `${Math.min(index * 50, 500)}ms`,
//             animationFillMode: "forwards",
//           }}
//         >
//           <Post post={post} />
//         </div>
//       ))}

//       {/* Load more sentinel */}
//       <div
//         ref={loadMoreRef}
//         className="flex min-h-16 items-center justify-center pt-2"
//       >
//         {requestState.loadingMore && (
//           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)]">
//             <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted-foreground)]" />
//             <span className="text-xs text-[var(--muted-foreground)]">
//               Loading
//             </span>
//           </div>
//         )}
//         {!requestState.hasMore && posts.length > 0 && (
//           <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
//             <div className="h-px w-6 bg-[var(--border-strong)]" />
//             <p className="text-[10px] tracking-wider uppercase">
//               You're all caught up
//             </p>
//             <div className="h-px w-6 bg-[var(--border-strong)]" />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Posts;

// /* ---------- Skeleton ---------- */
// const FeedSkeleton = () => (
//   <div className="card overflow-hidden">
//     {/* Header */}
//     <div className="flex items-center gap-3 p-3">
//       <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] animate-pulse" />
//       <div className="flex-1 space-y-2">
//         <div className="h-3 w-28 rounded-full bg-[var(--surface-2)] animate-pulse" />
//         <div className="h-2.5 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
//       </div>
//     </div>
//     {/* Image */}
//     <div className="aspect-square w-full bg-[var(--surface-2)] animate-pulse" />
//     {/* Actions */}
//     <div className="p-3 space-y-3">
//       <div className="flex gap-3">
//         <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
//         <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
//         <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
//       </div>
//       <div className="h-3 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
//       <div className="h-3 w-3/4 rounded-full bg-[var(--surface-2)] animate-pulse" />
//     </div>
//   </div>
// );

import React from "react";
import Post from "@/components/feed/Post";
import { useSelector } from "react-redux";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { Loader2, Compass } from "lucide-react";
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
      <div className="space-y-3">
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
      <div className="card p-10 text-center">
        <div
          className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: "var(--surface-2)" }}
        >
          <Compass
            className="w-5 h-5 text-[var(--muted-foreground)]"
            strokeWidth={1.8}
          />
        </div>
        <p
          className="text-base font-semibold text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your feed is quiet
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
          Follow people or create your first post to fill this space.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={post._id}
          className="animate-slide-up opacity-0"
          style={{
            animationDelay: `${Math.min(index * 50, 500)}ms`,
            animationFillMode: "forwards",
          }}
        >
          <Post post={post} />
        </div>
      ))}

      {/* Load more sentinel */}
      <div
        ref={loadMoreRef}
        className="flex min-h-16 items-center justify-center pt-2"
      >
        {requestState.loadingMore && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">
              Loading
            </span>
          </div>
        )}
        {!requestState.hasMore && posts.length > 0 && (
          <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
            <div className="h-px w-6 bg-[var(--border-strong)]" />
            <p className="text-[10px] tracking-wider uppercase">
              You're all caught up
            </p>
            <div className="h-px w-6 bg-[var(--border-strong)]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;

/* ---------- Skeleton ---------- */
const FeedSkeleton = () => (
  <div className="card overflow-hidden">
    <div className="flex items-center gap-3 p-3">
      <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded-full bg-[var(--surface-2)] animate-pulse" />
        <div className="h-2.5 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
      </div>
    </div>
    <div className="aspect-square w-full bg-[var(--surface-2)] animate-pulse" />
    <div className="p-3 space-y-3">
      <div className="flex gap-3">
        <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        <div className="h-6 w-6 rounded-lg bg-[var(--surface-2)] animate-pulse" />
      </div>
      <div className="h-3 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
      <div className="h-3 w-3/4 rounded-full bg-[var(--surface-2)] animate-pulse" />
    </div>
  </div>
);