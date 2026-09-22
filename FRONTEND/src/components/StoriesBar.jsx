import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import StoryViewer from "./StoryViewer";
import CreateStoryDialog from "./CreateStoryDialog";
import { apiUrl } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const VIEWED_KEY = "nova:viewedStoryItems";
const getId = (value) => (typeof value === "object" ? value?._id : value)?.toString();

const getViewedSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveViewedSet = (set) => {
  try { localStorage.setItem(VIEWED_KEY, JSON.stringify([...set])); }
  catch { /* Storage is optional for stories. */ }
};

const StoriesBar = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [viewedSet, setViewedSet] = useState(getViewedSet);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [startUser, setStartUser] = useState(0);
  const [startItem, setStartItem] = useState(0);

  const loadStories = useCallback(async () => {
    if (!user?._id) return setStories([]);
    try {
      const response = await axios.get(apiUrl("/api/v1/story"), { withCredentials: true });
      if (response.data?.success) setStories(response.data.stories || []);
    } catch { setStories([]); }
  }, [user?._id]);
  useEffect(() => { loadStories(); }, [loadStories]);

  const myStory = useMemo(() => stories.find((story) => getId(story.user?._id) === getId(user?._id)), [stories, user?._id]);
  const followingIds = useMemo(() => new Set((user?.following || []).map(getId).filter(Boolean)), [user?.following]);
  // The API already filters this, and this extra client-side check avoids a stale
  // response appearing after an immediate unfollow.
  const followedStories = useMemo(() => stories.filter((story) => followingIds.has(getId(story.user?._id))), [stories, followingIds]);
  const isAllViewed = useCallback((story) => story.items.every((item) => viewedSet.has(item._id)), [viewedSet]);
  const sortedStories = useMemo(() => [...followedStories].sort((a, b) => Number(isAllViewed(a)) - Number(isAllViewed(b))), [followedStories, isAllViewed]);
  const navigationStories = useMemo(() => (myStory ? [myStory, ...sortedStories] : sortedStories), [myStory, sortedStories]);

  const openViewer = (userIndex, itemIndex = 0) => { setStartUser(userIndex); setStartItem(itemIndex); setViewerOpen(true); };
  const openStory = (story) => {
    const storyIndex = navigationStories.findIndex((item) => item._id === story._id);
    const firstUnseen = story.items.findIndex((item) => !viewedSet.has(item._id));
    if (storyIndex >= 0) openViewer(storyIndex, Math.max(firstUnseen, 0));
  };
  const markViewed = (itemId) => setViewedSet((previous) => {
    if (previous.has(itemId)) return previous;
    const next = new Set(previous).add(itemId);
    saveViewedSet(next);
    return next;
  });

  return (
    <>
      <div className="mb-4">
        <div className="flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
          <div className="relative flex w-[74px] shrink-0 flex-col items-center gap-1.5">
          <button onClick={() => (myStory ? openViewer(0) : setCreateOpen(true))} className="flex w-full flex-col items-center gap-1.5 focus:outline-none">
            <div className="relative">
              {myStory ? <div className={`rounded-full p-[2px] ${isAllViewed(myStory) ? "bg-[var(--border-strong)]" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"}`}><Avatar className="h-16 w-16 border-2 border-[var(--background)]"><AvatarImage src={user?.profilePicture} /><AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback></Avatar></div> : <Avatar className="h-16 w-16 border border-[var(--border)]"><AvatarImage src={user?.profilePicture} /><AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback></Avatar>}
            </div>
            <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--foreground)]">Your story</span>
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} aria-label="Add to your story" className="absolute right-0 top-11 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--background)]" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}><Plus className="h-3.5 w-3.5" strokeWidth={3} /></button>
          </div>
          {sortedStories.map((story) => <button key={story._id} onClick={() => openStory(story)} className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 focus:outline-none"><div className={`rounded-full p-[2px] ${isAllViewed(story) ? "bg-[var(--border-strong)]" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"}`}><Avatar className="h-16 w-16 border-2 border-[var(--background)]"><AvatarImage src={story.user.profilePicture} /><AvatarFallback>{(story.user.fullName || story.user.username || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar></div><span className="w-full truncate text-center text-[11px] leading-tight text-[var(--foreground)]">{story.user.username}</span></button>)}
          {!myStory && sortedStories.length === 0 && <p className="self-center whitespace-nowrap pl-1 text-[11px] text-[var(--muted-foreground)]">Stories from people you follow will appear here</p>}
        </div>
      </div>
      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadStories} />
      {viewerOpen && navigationStories.length > 0 && <StoryViewer stories={navigationStories} initialUserIndex={startUser} initialItemIndex={startItem} onMarkViewed={markViewed} onClose={() => setViewerOpen(false)} onOpenProfile={(storyUser) => { setViewerOpen(false); navigate(`/profile/${storyUser._id}`); }} />}
    </>
  );
};

export default StoriesBar;
