import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SuggestedUsers from "./SuggestedUsers";
import { AtSign } from "lucide-react";

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);

  return (
    <div className="p-4 space-y-3">
      {/* USER CARD */}
      <Link
        to={`/profile/${user?._id}`}
        className="group flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
      >
        <Avatar className="h-12 w-12 shrink-0 border border-[var(--border)]">
          <AvatarImage src={user?.profilePicture} alt="profile" />
          <AvatarFallback className="text-base">
            {(user?.fullName || user?.username)?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
            {user?.fullName || user?.username}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-1 inline-flex items-center gap-0.5">
            <AtSign className="w-3 h-3" strokeWidth={2} />
            {user?.username}
          </p>
        </div>
      </Link>

      <div className="divider" />

      {/* SUGGESTED USERS */}
      <SuggestedUsers />

      <div className="divider" />

      {/* FOOTER */}
      <div className="pt-1 space-y-2.5">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
          {["About", "Help", "Press", "API", "Jobs", "Privacy", "Terms"].map(
            (item) => (
              <button
                key={item}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {item}
              </button>
            ),
          )}
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} Nova
        </p>
      </div>
    </div>
  );
};

export default RightSidebar;
