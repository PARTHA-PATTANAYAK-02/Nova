import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SuggestedUsers from "./SuggestedUsers";
import { MapPin } from "lucide-react";

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);

  return (
    <div className="p-5 space-y-5">
      {/* ---------- USER CARD ---------- */}
      <Link
        to={`/profile/${user?._id}`}
        className="group block rounded-3xl bg-white/5 border border-white/8 hover:border-white/15 transition-all duration-300 p-4 hover:bg-white/8"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            <Avatar className="relative h-13 w-13 ring-2 ring-[#0a0a18]">
              <AvatarImage src={user?.profilePicture} alt="profile" />
              <AvatarFallback className="text-base bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold">
                {(user?.fullName || user?.username)?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-sm text-white/95 truncate leading-tight">
              {user?.fullName || user?.username}
            </p>
            <p className="text-xs text-white/45 truncate leading-tight mt-0.5">
              {user?.bio || "Set your vibe in settings"}
            </p>
          </div>
        </div>
      </Link>

      {/* ---------- SUGGESTED USERS ---------- */}
      <SuggestedUsers />

      {/* ---------- FOOTER ---------- */}
      <div className="pt-4 border-t border-white/5 space-y-2.5">
        <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-[11px] text-white/35">
          {["About", "Help", "Press", "API", "Jobs", "Privacy", "Terms"].map(
            (item) => (
              <button
                key={item}
                className="hover:text-white/70 transition-colors"
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/25 font-medium">
          <MapPin className="w-3 h-3" />
          <span>© {new Date().getFullYear()} Nova</span>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
