import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SuggestedUsers from "@/components/users/SuggestedUsers";
import { getDisplayName } from "@/lib/utils";

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);

  return (
    <div className="p-2 space-y-3">
      {/* USER CARD */}
      <Link
        to={`/profile/${user?._id}`}
        className="group flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
      >
        <Avatar className="h-12 w-12 shrink-0 border border-[var(--border)]">
          <AvatarImage src={user?.profilePicture} alt="profile" />
          <AvatarFallback className="text-base">
            {getDisplayName(user, "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
            {getDisplayName(user)}
          </p>
        </div>
      </Link>

      <div className="divider" />

      {/* SUGGESTED USERS */}
      <SuggestedUsers />

      <div className="divider" />

      {/* FOOTER */}
      <div className="pt-1 space-y-2.5">
        <div className="flex justify-center flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
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
        <p className=" flex justify-center text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} Nova
        </p>
      </div>
    </div>
  );
};

export default RightSidebar;
