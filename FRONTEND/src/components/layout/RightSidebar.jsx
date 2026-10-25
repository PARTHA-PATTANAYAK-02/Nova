import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SuggestedUsers from "@/components/users/SuggestedUsers";
import { getDisplayName } from "@/lib/utils";

const FOOTER_LINKS = [
  "About", "Help", "Press", "API", "Jobs", "Privacy", "Terms",
];

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);

  return (
    <div className="nvs2-right p-2 space-y-3">
      {/* USER CARD */}
      <Link
        to={`/profile/${user?.username || user?._id}`}
        className="
          group block relative overflow-hidden
          p-3.5 rounded-2xl
          bg-[var(--surface)]/60 backdrop-blur-xl
          border border-[var(--border)]/60
          transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
          hover:-translate-y-[3px]
          hover:shadow-[0_24px_48px_-24px_var(--glow-strong)]
          hover:border-[var(--primary)]/30
        "
      >
        {/* aurora tint */}
        <div className="nvs2-right-aurora" aria-hidden="true" />

        <div className="relative flex items-center gap-3.5">
          <Avatar className="size-12">
            <AvatarImage src={user?.profilePicture} alt="profile" />
            <AvatarFallback className="text-base">
              {getDisplayName(user, "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
              {getDisplayName(user)}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 transition-colors duration-200 group-hover:text-[var(--primary)]">
              View profile
            </p>
          </div>

          <svg
            className="shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all duration-250"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </Link>

      {/* SUGGESTED */}
      <div className="nvs2-right-card">
        <SuggestedUsers />
      </div>

      {/* FOOTER */}
      <div className="px-1 pt-1 space-y-2.5">
        <div className="flex justify-center flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[var(--muted-foreground)]">
          {FOOTER_LINKS.map((item) => (
            <button
              key={item}
              className="
                hover:text-[var(--foreground)] transition-colors duration-200
                outline-none focus-visible:text-[var(--primary)]
              "
            >
              {item}
            </button>
          ))}
        </div>
        <p className="flex justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
          © {new Date().getFullYear()} Nova
        </p>
      </div>
    </div>
  );
};

export default RightSidebar;