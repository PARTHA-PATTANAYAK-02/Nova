import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, User, Play } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import StoryViewer from "@/components/feed/StoryViewer";
import { apiUrl } from "@/lib/api";

const ChatUserMenu = ({ user, children }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openUserActions = async () => {
    if (loading || !user?._id) return;
    setLoading(true);
    try {
      const response = await axios.get(
        apiUrl(`/api/v1/story?userIds=${user._id}`),
        { withCredentials: true },
      );
      const userStory = response.data?.stories?.find(
        (item) => item.user?._id?.toString() === user._id.toString(),
      );

      if (userStory) {
        setStory(userStory);
        setOpen(true);
      } else {
        navigate(`/profile/${user.username || user._id}`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to check this user's story.",
      );
    } finally {
      setLoading(false);
    }
  };

  const markViewed = (storyId) => {
    axios
      .post(
        apiUrl(`/api/v1/story/${storyId}/view`),
        {},
        { withCredentials: true },
      )
      .catch((error) =>
        toast.error(
          error.response?.data?.message || "Unable to save story view.",
        ),
      );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openUserActions();
            }}
            disabled={loading}
            aria-label="Open user actions"
            className="nova-chat-menu-trigger"
          >
            <span className="nova-chat-menu-trigger__inner">
              {children}
              {loading && (
                <Loader2
                  className="size-3.5 animate-spin text-[var(--muted-foreground)] shrink-0"
                  strokeWidth={2.2}
                />
              )}
            </span>
          </button>
        </PopoverAnchor>

        <PopoverContent
          className="nova-chat-menu w-52 p-1.5 animate-popover-in"
          align="start"
          sideOffset={8}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setViewerOpen(true);
            }}
            className="nova-chat-menu__item"
          >
            <span className="nova-chat-menu__orb nova-chat-menu__orb--grad">
              <Play className="size-3.5" fill="currentColor" strokeWidth={0} />
            </span>
            <span>View story</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(`/profile/${user.username || user._id}`);
            }}
            className="nova-chat-menu__item"
          >
            <span className="nova-chat-menu__orb">
              <User className="size-3.5" strokeWidth={2.2} />
            </span>
            <span>View profile</span>
          </button>
        </PopoverContent>
      </Popover>

      {viewerOpen && story && (
        <StoryViewer
          stories={[story]}
          onMarkViewed={markViewed}
          onClose={() => setViewerOpen(false)}
          onOpenProfile={() => {
            setViewerOpen(false);
            navigate(`/profile/${user.username || user._id}`);
          }}
        />
      )}
    </>
  );
};

export default ChatUserMenu;
