import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { updateFollowing } from "@/redux/authSlice";
import { apiUrl } from "@/lib/api";
import { useSuggestedStories } from "@/hooks/useSuggestedStories";
import SuggestedUserRow from "./SuggestedUserRow";
import StoryViewer from "./StoryViewer";

const MobileSuggested = () => {
  const { suggestedUsers, user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [followStates, setFollowStates] = useState({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const { stories, storiesByUserId, isAllViewed, markViewed } = useSuggestedStories(suggestedUsers);

  useEffect(() => {
    const initialState = {};
    (suggestedUsers || []).forEach((suggestedUser) => {
      initialState[suggestedUser._id] = user?.following?.includes(suggestedUser._id) || false;
    });
    setFollowStates(initialState);
  }, [suggestedUsers, user]);

  const handleFollowToggle = async (userId) => {
    try {
      const response = await axios.post(apiUrl(`/api/v1/user/followorunfollow/${userId}`), {}, { withCredentials: true });
      if (response.data.success) {
        toast.success(response.data.message);
        setFollowStates((previous) => ({ ...previous, [userId]: !previous[userId] }));
        dispatch(updateFollowing(userId));
      }
    } catch (error) { toast.error(error.response?.data?.message || "Something went wrong"); }
  };

  if (!suggestedUsers || suggestedUsers.length === 0) return null;

  const openStory = (story) => {
    const index = stories.findIndex((item) => item._id === story._id);
    if (index >= 0) { setStoryIndex(index); setViewerOpen(true); }
  };
  const openProfile = (userId) => navigate(`/profile/${userId}`);

  return (
    <div className="card p-4 lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Suggested for you</h2>
        <span className="text-[11px] text-[var(--muted-foreground)]">{suggestedUsers.length} people</span>
      </div>
      <div className="space-y-0.5">
        {suggestedUsers.slice(0, 5).map((suggestedUser) => {
          const story = storiesByUserId.get(suggestedUser._id?.toString());
          return <SuggestedUserRow key={suggestedUser._id} user={suggestedUser} isFollowing={followStates[suggestedUser._id]} onFollow={handleFollowToggle} story={story} seen={isAllViewed(story)} onOpenStory={openStory} onOpenProfile={openProfile} />;
        })}
      </div>
      {viewerOpen && stories.length > 0 && <StoryViewer stories={stories} initialUserIndex={storyIndex} onMarkViewed={markViewed} onClose={() => setViewerOpen(false)} onOpenProfile={(storyUser) => { setViewerOpen(false); navigate(`/profile/${storyUser._id}`); }} />}
    </div>
  );
};

export default MobileSuggested;
