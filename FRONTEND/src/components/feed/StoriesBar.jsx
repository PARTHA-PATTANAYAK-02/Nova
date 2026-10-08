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

const getId = (value) => (typeof value === "object" ? value?._id : value)?.toString();

const StoriesBar = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [viewedSet, setViewedSet] = useState(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [startUser, setStartUser] = useState(0);
  const [startItem, setStartItem] = useState(0);
  const followingKey = (user?.following || []).map(getId).filter(Boolean).sort().join(",");

  const loadStories = useCallback(async () => {
    if (!user?._id) return setStories([]);
    try {
      const response = await axios.get(apiUrl("/api/v1/story"), { withCredentials: true });
      if (response.data?.success) setStories(response.data.stories || []);
    } catch (error) {
      setStories([]);
      toast.error(error.response?.data?.message || "Unable to load stories.");
    }
  }, [user?._id]);
  useEffect(() => { loadStories(); }, [loadStories, followingKey]);

  const myStory = useMemo(() => stories.find((story) => getId(story.user?._id) === getId(user?._id)), [stories, user?._id]);
  const followingIds = useMemo(() => new Set((user?.following || []).map(getId).filter(Boolean)), [user?.following]);
  // The API already filters this, and this extra client-side check avoids a stale
  // response appearing after an immediate unfollow.
  const followedStories = useMemo(() => stories.filter((story) => followingIds.has(getId(story.user?._id))), [stories, followingIds]);
  const isItemViewed = useCallback((item) => viewedSet.has(item._id) || item.viewedByMe, [viewedSet]);
  const isAllViewed = useCallback((story) => story.items.every(isItemViewed), [isItemViewed]);
  const sortedStories = useMemo(
    () => [...followedStories].sort((a, b) =>
      new Date(b.items[0]?.createdAt || 0).getTime() - new Date(a.items[0]?.createdAt || 0).getTime(),
    ),
    [followedStories],
  );
  const navigationStories = useMemo(() => (myStory ? [myStory, ...sortedStories] : sortedStories), [myStory, sortedStories]);

  const openViewer = (userIndex, itemIndex = 0) => { setStartUser(userIndex); setStartItem(itemIndex); setViewerOpen(true); };
  const openStory = (story) => {
    const storyIndex = navigationStories.findIndex((item) => item._id === story._id);
    const firstUnseen = story.items.findIndex((item) => !isItemViewed(item));
    if (storyIndex >= 0) openViewer(storyIndex, Math.max(firstUnseen, 0));
  };
  const markViewed = useCallback((itemId) => {
    setViewedSet((previous) => new Set(previous).add(itemId));
    axios.post(apiUrl(`/api/v1/story/${itemId}/view`), {}, { withCredentials: true })
      .catch((error) => toast.error(error.response?.data?.message || "Unable to save story view."));
  }, []);
  const updateStoryReaction = useCallback((itemId, emoji, reactionDetails) => {
    setStories((previous) => previous.map((story) => ({
      ...story,
      items: story.items.map((item) => item._id === itemId ? {
        ...item,
        reactionByMe: emoji,
        ...(reactionDetails ? { reactionDetails } : {}),
      } : item),
    })));
  }, []);

  return (
    <>
      <div className="mb-4">
        <div className="flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
          <div className="relative flex w-[74px] shrink-0 flex-col items-center gap-1.5">
          <button onClick={() => (myStory ? openViewer(0) : setCreateOpen(true))} className="flex w-full flex-col items-center gap-1.5 focus:outline-none">
            <div className="relative">
              {myStory ? <div className={`rounded-full p-[2px] ${isAllViewed(myStory) ? "bg-[var(--border-strong)]" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"}`}><Avatar className="h-16 w-16 border-2 border-[var(--background)]"><AvatarImage src={user?.profilePicture} /><AvatarFallback>{getDisplayName(user, "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar></div> : <Avatar className="h-16 w-16 border border-[var(--border)]"><AvatarImage src={user?.profilePicture} /><AvatarFallback>{getDisplayName(user, "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar>}
            </div>
            <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--foreground)]">Your story</span>
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} aria-label="Add to your story" className="absolute right-0 top-11 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--background)]" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}><Plus className="h-3.5 w-3.5" strokeWidth={3} /></button>
          </div>
          {sortedStories.map((story) => (
            <button
              key={story._id}
              type="button"
              onClick={() => openStory(story)}
              aria-label={`View ${getDisplayName(story.user)}'s story`}
              className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 focus:outline-none"
            >
              <div className={`rounded-full p-[2px] ${isAllViewed(story) ? "bg-[var(--border-strong)]" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"}`}>
                <Avatar className="h-16 w-16 border-2 border-[var(--background)]">
                  <AvatarImage src={story.user.profilePicture} />
                  <AvatarFallback>{getDisplayName(story.user, "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--foreground)]">{getDisplayName(story.user)}</span>
            </button>
          ))}
          {!myStory && sortedStories.length === 0 && <p className="self-center whitespace-nowrap pl-1 text-[11px] text-[var(--muted-foreground)]">Stories from people you follow will appear here</p>}
        </div>
      </div>
      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadStories} />
      {viewerOpen && navigationStories.length > 0 && <StoryViewer stories={navigationStories} initialUserIndex={startUser} initialItemIndex={startItem} onMarkViewed={markViewed} onReactionChange={updateStoryReaction} onClose={() => setViewerOpen(false)} onOpenProfile={(storyUser) => { setViewerOpen(false); navigate(`/profile/${storyUser._id}`); }} />}
    </>
  );
};

export default StoriesBar;
