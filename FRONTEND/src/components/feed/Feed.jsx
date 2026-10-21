import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import StoriesBar from "@/components/feed/StoriesBar";
import Posts from "@/components/feed/Posts";
import { getDisplayName } from "@/lib/utils";
import { ArrowDown, Loader2, RefreshCw } from "lucide-react";
import { playCommentSound } from "@/lib/sound";

/* time-based greeting */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

/* "Wednesday · 9 October" style date */
const getDateLine = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const PULL_THRESHOLD = 65;

const Feed = ({ requestState }) => {
  const { user } = useSelector((s) => s.auth);
  const firstName = getDisplayName(user, "there").split(" ")[0];

  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (window.scrollY > 4 || isRefreshing) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing || window.scrollY > 4) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      // Elastic rubber-band resistance
      const distance = Math.min(diff * 0.45, 95);
      setPullY(distance);
    } else {
      setPullY(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullY >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(54); // Hold spinner in view while refreshing
      playCommentSound();
      try {
        if (requestState?.retry) {
          await requestState.retry();
        }
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 600);
      }
    } else {
      setPullY(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="max-w-[640px] mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-fade-in relative"
    >
      {/* ── Bouncy Pull-To-Refresh Indicator ── */}
      <div
        className="pointer-events-none flex items-center justify-center transition-transform"
        style={{
          height: `${pullY}px`,
          transform: `translateY(${Math.max(0, pullY - 10)}px)`,
          transition: isPullingRef.current ? "none" : "all 0.35s cubic-bezier(0.18, 0.85, 0.25, 1)",
          opacity: pullY > 10 ? 1 : 0,
        }}
        aria-hidden
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)]/90 backdrop-blur-xl border border-[var(--border)]/70 shadow-lg text-[var(--foreground)] text-[12px] font-medium">
          {isRefreshing ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-[var(--primary)]" />
              <span>Updating feed…</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="size-3.5 text-[var(--primary)] transition-transform duration-200"
                style={{
                  transform: `rotate(${pullY >= PULL_THRESHOLD ? 180 : 0}deg)`,
                }}
              />
              <span>{pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
            </>
          )}
        </div>
      </div>

      <StoriesBar />

      <header className="mb-6 mt-4 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]/70">
          {getDateLine()}
        </p>
        <h1 className="mt-2 font-display text-[26px] sm:text-[30px] font-semibold tracking-[-.025em] text-[var(--foreground)] leading-tight">
          {getGreeting()}, <span className="text-grad">{firstName}</span>
        </h1>
      </header>

      <Posts requestState={requestState} />
    </div>
  );
};

export default Feed;

