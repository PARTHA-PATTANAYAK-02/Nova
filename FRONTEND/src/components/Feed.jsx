import React from "react";
import Posts from "./Posts";

const Feed = ({ requestState }) => {
  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-6 md:py-10 animate-fade-in">
      {/* ---------- Header ---------- */}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Your orbit
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-gradient">Today's signals</span>
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 glass rounded-full pl-2.5 pr-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-medium text-white/70 tracking-wide">
            Live
          </span>
        </div>
      </header>

      {/* ---------- Posts ---------- */}
      <Posts requestState={requestState} />
    </div>
  );
};

export default Feed;
