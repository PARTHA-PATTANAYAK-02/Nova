import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { updateFollowing } from "@/redux/authSlice";
import { apiUrl } from "@/lib/api";

/**
 * Mobile/tablet-only suggested users card.
 * Designed to be injected INLINE inside the feed (after every N posts).
 * Compact, self-contained — no outer max-width wrapper.
 */
const MobileSuggested = () => {
  const { suggestedUsers, user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    const initialState = {};
    (suggestedUsers || []).forEach((suggestedUser) => {
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
        setFollowStates((prev) => ({ ...prev, [userId]: !prev[userId] }));
        dispatch(updateFollowing(userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  if (!suggestedUsers || suggestedUsers.length === 0) return null;

  return (
    <div className="lg:hidden card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Suggested for you
        </h2>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {suggestedUsers.length} people
        </span>
      </div>

      {/* List */}
      <div className="space-y-0.5">
        {suggestedUsers.slice(0, 5).map((suggestedUser) => {
          const isFollowing = followStates[suggestedUser._id];
          return (
            <div
              key={suggestedUser._id}
              className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
            >
              <Link
                to={`/profile/${suggestedUser._id}`}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={suggestedUser.profilePicture}
                    alt={suggestedUser.fullName || suggestedUser.username}
                  />
                  <AvatarFallback>
                    {(suggestedUser.fullName || suggestedUser.username)
                      ?.charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
                    {suggestedUser.fullName || suggestedUser.username}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
                    @{suggestedUser.username}
                  </p>
                </div>
              </Link>

              <button
                onClick={() => handleFollowToggle(suggestedUser._id)}
                className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                  isFollowing
                    ? "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    : ""
                }`}
                style={
                  !isFollowing
                    ? {
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }
                    : undefined
                }
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileSuggested;
