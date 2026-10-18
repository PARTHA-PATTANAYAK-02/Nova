import React from "react";
import { useSelector } from "react-redux";
import StoriesBar from "@/components/feed/StoriesBar";
import Posts from "@/components/feed/Posts";
import { getDisplayName } from "@/lib/utils";

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

const Feed = ({ requestState }) => {
  const { user } = useSelector((s) => s.auth);
  const firstName = getDisplayName(user, "there").split(" ")[0];

  return (
    <div className="max-w-[640px] mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-fade-in">
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
