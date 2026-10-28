import React from "react";

export const ProfileSkeleton = () => (
  <div className="nova-profile animate-pulse">
    {/* Cover banner */}
    <div className="nova-profile__hero">
      <div className="nova-profile__cover nova-profile__cover--empty bg-[var(--surface-2)]/80" />
      <div className="nova-profile__body">
        {/* Avatar */}
        <div className="nova-profile__avatar-wrap">
          <div className="size-20 sm:size-24 rounded-full bg-[var(--surface-2)] ring-4 ring-[var(--surface)]" />
        </div>

        {/* Identity & Bio */}
        <div className="nova-profile__info mt-2 space-y-2.5">
          <div className="h-5 w-40 rounded-lg bg-[var(--surface-2)]" />
          <div className="h-3.5 w-24 rounded-md bg-[var(--surface-2)]/70" />
          <div className="h-3 w-64 rounded-md bg-[var(--surface-2)]/60" />
        </div>
      </div>
    </div>

    {/* Stats & Actions */}
    <div className="mt-4 px-2 sm:px-4 space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <div className="h-9 flex-1 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-9 flex-1 rounded-xl bg-[var(--surface-2)]" />
        <div className="size-9 rounded-xl bg-[var(--surface-2)] shrink-0" />
      </div>

      {/* Story highlights */}
      <div className="flex items-center gap-3.5 overflow-hidden py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="size-14 sm:size-16 rounded-full bg-[var(--surface-2)] p-0.5" />
            <div className="h-2 w-10 rounded-full bg-[var(--surface-2)]/70" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-around border-t border-[var(--border)]/60 pt-3">
        <div className="h-4 w-16 rounded-md bg-[var(--surface-2)]" />
        <div className="h-4 w-16 rounded-md bg-[var(--surface-2)]/60" />
        <div className="h-4 w-16 rounded-md bg-[var(--surface-2)]/60" />
      </div>

      {/* 3x3 Post Grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  </div>
);

export default ProfileSkeleton;

