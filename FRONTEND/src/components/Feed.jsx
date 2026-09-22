import React from "react";
import StoriesBar from "./StoriesBar";
import Posts from "./Posts";

const Feed = ({ requestState }) => {
  return (
    <div className="max-w-[600px] mx-auto px-3 sm:px-4 py-4 animate-fade-in">
      {/* Stories */}
      <StoriesBar />

      {/* Header */}
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Your feed
          </p>
          <h1
            className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Today's stories
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ background: "var(--success)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
          </span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            Live
          </span>
        </div>
      </header>

      <Posts requestState={requestState} />
    </div>
  );
};

export default Feed;
