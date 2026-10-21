import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Plus } from "lucide-react";
import { getDisplayName } from "@/lib/utils";

const SuggestedUserRow = ({
  user,
  isFollowing,
  onFollow,
  story,
  seen,
  onOpenStory,
  onOpenProfile,
}) => {
  const displayName = getDisplayName(user);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="nova-user-row">
      {/* avatar / story ring */}
      <button
        type="button"
        onClick={() => (story ? onOpenStory(story) : onOpenProfile(user._id))}
        aria-label={
          story
            ? `View ${displayName}'s story`
            : `Open ${displayName}'s profile`
        }
        className="nova-user-row__avatar-btn"
      >
        {story ? (
          <span
            className={`block rounded-full transition-transform duration-300 ${
              seen ? "nova-story-ring-seen" : "nova-story-ring-active"
            }`}
          >
            <span className="block rounded-full bg-[var(--background)] p-[2px]">
              <Avatar className="size-10">
                <AvatarImage src={user.profilePicture} alt={displayName} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </span>
          </span>
        ) : (
          <Avatar className="size-10 border border-[var(--border)]/70">
            <AvatarImage src={user.profilePicture} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        )}
      </button>

      {/* name + subtitle */}
      <button
        type="button"
        onClick={() => onOpenProfile(user._id)}
        className="nova-user-row__meta"
      >
        <p className="nova-user-row__name">{displayName}</p>
        <p className="nova-user-row__sub">
          {story ? "New story" : "Suggested for you"}
        </p>
      </button>

      {/* follow button */}
      <button
        type="button"
        onClick={() => onFollow(user._id)}
        aria-pressed={isFollowing}
        className={`nova-user-row__follow ${
          isFollowing ? "is-following" : "is-follow"
        }`}
      >
        {isFollowing ? (
          <>
            <Check className="size-3" strokeWidth={2.6} />
            Following
          </>
        ) : (
          <>
            <Plus className="size-3" strokeWidth={2.6} />
            Follow
          </>
        )}
      </button>
    </div>
  );
};

export default SuggestedUserRow;
