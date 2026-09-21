import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import axios from "axios";
import { toast } from "sonner";
import { updateFollowing } from "@/redux/authSlice";
import { apiUrl } from "@/lib/api";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const SuggestedUsers = () => {
  const { suggestedUsers, user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const [followStates, setFollowStates] = useState({});
  const [showAll, setShowAll] = useState(false);

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useState(() => {
    const initialState = {};
    suggestedUsers.forEach((suggestedUser) => {
      initialState[suggestedUser._id] =
        user?.following?.includes(suggestedUser._id) || false;
    });
    setFollowStates(initialState);
  }, [suggestedUsers, user]);

  const handleFollowToggle = async (userId) => {
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${userId}`),
        {},
        { withCredentials: true },
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setFollowStates((prev) => ({
          ...prev,
          [userId]: !prev[userId],
        }));
        dispatch(updateFollowing(userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="p-5 space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-white/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white/70" />
          </div>
          <h2 className="font-display font-semibold text-sm text-white/90 tracking-tight truncate">
            Suggested for you
          </h2>
        </div>

        {suggestedUsers.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((c) => !c)}
            className="flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors shrink-0"
          >
            {showAll ? (
              <>
                Less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                All <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* LIST */}
      <div className="space-y-1">
        {suggestedUsers
          .slice(0, showAll ? undefined : 5)
          .map((suggestedUser) => {
            const isFollowing = followStates[suggestedUser._id];

            return (
              <div
                key={suggestedUser._id}
                className="group flex items-center justify-between gap-3 rounded-2xl px-2 py-2 hover:bg-white/5 transition-colors duration-200"
              >
                <Link
                  to={`/profile/${suggestedUser._id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="relative shrink-0">
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-80 transition-opacity duration-300" />
                    <Avatar className="relative h-9 w-9 ring-2 ring-[#0a0a18]">
                      <AvatarImage
                        src={suggestedUser.profilePicture}
                        alt={suggestedUser.fullName || suggestedUser.username}
                      />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold">
                        {(suggestedUser.fullName || suggestedUser.username)
                          ?.charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/90 truncate leading-tight">
                      {suggestedUser.fullName || suggestedUser.username}
                    </p>
                    <p className="text-xs text-white/40 truncate leading-tight mt-0.5">
                      {suggestedUser.bio || "New to Nova"}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={() => handleFollowToggle(suggestedUser._id)}
                  className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                    isFollowing
                      ? "text-white/70 bg-white/8 hover:bg-white/12 border border-white/10"
                      : "text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:opacity-90 shadow-[0_0_20px_rgba(124,92,255,0.35)]"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
      </div>

      {/* EMPTY */}
      {suggestedUsers.length === 0 && (
        <p className="text-xs text-white/40 text-center py-4">
          No suggestions right now
        </p>
      )}
    </div>
  );
};

export default SuggestedUsers;
