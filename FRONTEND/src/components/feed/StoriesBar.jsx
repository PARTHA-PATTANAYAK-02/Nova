import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StoryViewer from "@/components/feed/StoryViewer";
import CreateStoryDialog from "@/components/feed/CreateStoryDialog";
import { apiUrl } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDisplayName } from "@/lib/utils";

const getId = (v) => (typeof v === "object" ? v?._id : v)?.toString();

const StoriesBar = () => {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [viewedSet, setViewedSet] = useState(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [startUser, setStartUser] = useState(0);
  const [startItem, setStartItem] = useState(0);
  const followingKey = (user?.following || [])
    .map(getId)
    .filter(Boolean)
    .sort()
    .join(",");

  const loadStories = useCallback(async () => {
    if (!user?._id) return setStories([]);
    try {
      const res = await axios.get(apiUrl("/api/v1/story"), {
        withCredentials: true,
      });
      if (res.data?.success) setStories(res.data.stories || []);
    } catch (error) {
      setStories([]);
      toast.error(error.response?.data?.message || "Unable to load stories.");
    }
  }, [user?._id]);

  useEffect(() => {
    loadStories();
  }, [loadStories, followingKey]);

  const myStory = useMemo(
    () => stories.find((s) => getId(s.user?._id) === getId(user?._id)),
    [stories, user?._id],
  );
  const followingIds = useMemo(
    () => new Set((user?.following || []).map(getId).filter(Boolean)),
    [user?.following],
  );
  const followedStories = useMemo(
    () => stories.filter((s) => followingIds.has(getId(s.user?._id))),
    [stories, followingIds],
  );
  const isItemViewed = useCallback(
    (item) => viewedSet.has(item._id) || item.viewedByMe,
    [viewedSet],
  );
  const isAllViewed = useCallback(
    (story) => story.items.every(isItemViewed),
    [isItemViewed],
  );
  const sortedStories = useMemo(
    () =>
      [...followedStories].sort(
        (a, b) =>
          new Date(b.items[0]?.createdAt || 0).getTime() -
          new Date(a.items[0]?.createdAt || 0).getTime(),
      ),
    [followedStories],
  );
  const navigationStories = useMemo(
    () => (myStory ? [myStory, ...sortedStories] : sortedStories),
    [myStory, sortedStories],
  );

  const openViewer = (uIdx, iIdx = 0) => {
    setStartUser(uIdx);
    setStartItem(iIdx);
    setViewerOpen(true);
  };
  const openStory = (story) => {
    const idx = navigationStories.findIndex((s) => s._id === story._id);
    const firstUnseen = story.items.findIndex((item) => !isItemViewed(item));
    if (idx >= 0) openViewer(idx, Math.max(firstUnseen, 0));
  };
  const markViewed = useCallback((itemId) => {
    setViewedSet((prev) => new Set(prev).add(itemId));
    axios
      .post(apiUrl(`/api/v1/story/${itemId}/view`), {}, { withCredentials: true })
      .catch((e) =>
        toast.error(e.response?.data?.message || "Unable to save story view."),
      );
  }, []);
  const updateStoryReaction = useCallback((itemId, emoji, details) => {
    setStories((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((item) =>
          item._id === itemId
            ? { ...item, reactionByMe: emoji, ...(details ? { reactionDetails: details } : {}) }
            : item,
        ),
      })),
    );
  }, []);

  const initial = getDisplayName(user, "U").charAt(0).toUpperCase();

  return (
    <>
      <div className="mb-2">
        <div className="flex gap-3.5 overflow-x-auto px-1 pb-2 scroll-hide">
          {/* YOUR STORY */}
          <div className="relative flex w-[76px] shrink-0 flex-col items-center gap-2">
            <button
              onClick={() => (myStory ? openViewer(0) : setCreateOpen(true))}
              className="group flex w-full flex-col items-center gap-2 outline-none"
            >
              <span className="relative">
                {myStory ? (
                  <span
                    className={`block rounded-full p-[2.5px] ${
                      isAllViewed(myStory)
                        ? "bg-[var(--border-strong)]"
                        : "bg-grad-ring"
                    } transition-transform duration-300 group-hover:scale-[1.05]`}
                  >
                    <span className="block rounded-full bg-[var(--background)] p-[2px]">
                      <Avatar className="size-16">
                        <AvatarImage src={user?.profilePicture} />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                    </span>
                  </span>
                ) : (
                  <span className="block rounded-full p-[2.5px] bg-[var(--border)] transition-transform duration-300 group-hover:scale-[1.05]">
                    <span className="block rounded-full bg-[var(--background)] p-[2px]">
                      <Avatar className="size-16">
                        <AvatarImage src={user?.profilePicture} />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                    </span>
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-[var(--foreground)]/85">
                Your story
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Add to your story"
              className="
                absolute right-1 top-[52px] z-10
                size-6 rounded-full
                flex items-center justify-center
                bg-grad-btn text-white
                border-2 border-[var(--background)]
                shadow-[0_4px_12px_-4px_var(--glow-strong)]
                hover:scale-110 active:scale-95
                transition-all duration-200 outline-none
              "
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </button>
          </div>

          {/* FOLLOWED STORIES */}
          {sortedStories.map((story) => (
            <button
              key={story._id}
              type="button"
              onClick={() => openStory(story)}
              aria-label={`View ${getDisplayName(story.user)}'s story`}
              className="group flex w-[76px] shrink-0 flex-col items-center gap-2 outline-none"
            >
              <span
                className={`block rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-[1.05] ${
                  isAllViewed(story) ? "bg-[var(--border-strong)]" : "bg-grad-ring"
                }`}
              >
                <span className="block rounded-full bg-[var(--background)] p-[2px]">
                  <Avatar className="size-16">
                    <AvatarImage src={story.user.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(story.user, "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-[var(--foreground)]/85">
                {getDisplayName(story.user)}
              </span>
            </button>
          ))}

          {!myStory && sortedStories.length === 0 && (
            <p className="self-center whitespace-nowrap pl-1 text-[11.5px] text-[var(--muted-foreground)]">
              Stories from people you follow will appear here
            </p>
          )}
        </div>
      </div>

      <CreateStoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadStories}
      />

      {viewerOpen && navigationStories.length > 0 && (
        <StoryViewer
          stories={navigationStories}
          initialUserIndex={startUser}
          initialItemIndex={startItem}
          onMarkViewed={markViewed}
          onReactionChange={updateStoryReaction}
          onClose={() => setViewerOpen(false)}
          onOpenProfile={(storyUser) => {
            setViewerOpen(false);
            navigate(`/profile/${storyUser._id}`);
          }}
        />
      )}
    </>
  );
};

export default StoriesBar;