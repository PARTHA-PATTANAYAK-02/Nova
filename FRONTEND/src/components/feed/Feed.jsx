import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import StoriesBar from "@/components/feed/StoriesBar";
import Posts from "@/components/feed/Posts";
import MobileSuggested from "@/components/users/MobileSuggested";
import { getDisplayName } from "@/lib/utils";
import { ArrowDown, Loader2, MessageCircle, RefreshCw } from "lucide-react";
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

  /* Typewriter write-in animation for greeting header */
  const greetingPrefix = `${getGreeting()}, `;
  const greetingTarget = `${greetingPrefix}${firstName}`;
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    setTypedCount(0);
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setTypedCount(current);
      if (current >= greetingTarget.length) {
        clearInterval(interval);
      }
    }, 38);

    return () => clearInterval(interval);
  }, [greetingTarget]);

  const prefixVisible = greetingTarget.slice(0, Math.min(typedCount, greetingPrefix.length));
  const nameVisible =
    typedCount > greetingPrefix.length
      ? greetingTarget.slice(greetingPrefix.length, typedCount)
      : "";
  const isTyping = typedCount < greetingTarget.length;

  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const rafRef = useRef(null);
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
    if (diff > 10) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const distance = Math.min((diff - 10) * 0.42, 90);
        setPullY(distance);
      });
    } else if (diff < 0) {
      isPullingRef.current = false;
      if (pullY !== 0) setPullY(0);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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

      {/* ── Mobile Top Brand Header ── */}
      <div className="md:hidden flex items-center justify-between pb-3.5 pt-0.5 px-1">
        <Link to="/" className="flex items-center gap-2.5 outline-none group">
          <span className="nvs2-logo-orb size-8 shrink-0">
            <span className="nvs2-logo-halo" aria-hidden="true" />
            <img src="/logo.gif" alt="Nova" className="nvs2-logo-img size-7 object-contain" />
          </span>
          <span className="text-grad font-display text-[22px] font-semibold tracking-[-.02em] leading-none">
            Nova
          </span>
        </Link>

        <Link
          to="/chat"
          className="size-9 rounded-full bg-[var(--surface)]/80 backdrop-blur-xl border border-[var(--border)]/70 flex items-center justify-center text-[var(--foreground)]/80 hover:text-[var(--primary)] active:scale-95 transition-all shadow-sm outline-none"
          aria-label="Direct messages"
        >
          <MessageCircle className="size-4.5" strokeWidth={1.9} />
        </Link>
      </div>

      <StoriesBar />

      {/* ── Compact Animated Typewriter Greeting ── */}
      <header className="mb-3.5 mt-2 px-1 select-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]/70 animate-in fade-in duration-500">
          {getDateLine()}
        </p>
        <h1 className="mt-0.5 font-display text-[19px] sm:text-[22px] font-bold tracking-tight text-[var(--foreground)] leading-snug flex items-center flex-wrap">
          <span>{prefixVisible}</span>
          {nameVisible && <span className="text-grad ml-1">{nameVisible}</span>}
          {isTyping && (
            <span
              className="inline-block w-[2px] h-4 sm:h-5 bg-[var(--primary)] ml-0.5 rounded-full animate-pulse"
              aria-hidden="true"
            />
          )}
        </h1>
      </header>

      <Posts requestState={requestState} />

      {/* ── Suggested Users (Mobile/Tablet — placed neatly under posts) ── */}
      <div className="lg:hidden mt-8 mb-4">
        <MobileSuggested />
      </div>
    </div>
  );
};

export default Feed;

