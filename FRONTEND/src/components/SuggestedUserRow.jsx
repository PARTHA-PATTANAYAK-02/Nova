import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const SuggestedUserRow = ({ user, isFollowing, onFollow, story, seen, onOpenStory, onOpenProfile }) => {
  const displayName = user.username || user.fullName || "User";

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--surface-2)]">
      <button
        type="button"
        onClick={() => (story ? onOpenStory(story) : onOpenProfile(user._id))}
        aria-label={story ? `View ${displayName}'s story` : `Open ${displayName}'s profile`}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <div className={`rounded-full p-[2px] ${story ? (seen ? "bg-[var(--border-strong)]" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600") : ""}`}>
          <Avatar className="h-10 w-10 border-2 border-[var(--background)]">
            <AvatarImage src={user.profilePicture} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </button>

      <button type="button" onClick={() => onOpenProfile(user._id)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)] hover:opacity-75">
          @{displayName}
        </p>
        <p className="mt-0.5 truncate text-xs leading-tight text-[var(--muted-foreground)]">
          {user.fullName || "View profile"}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onFollow(user._id)}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${isFollowing ? "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]" : ""}`}
        style={!isFollowing ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
};

export default SuggestedUserRow;
