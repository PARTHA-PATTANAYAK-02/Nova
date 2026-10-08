import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, User, Image as ImageIcon } from "lucide-react";
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
        // No story → straight to profile
        navigate(`/profile/${user._id}`);
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
            onClick={(event) => {
              event.preventDefault();
              openUserActions();
            }}
            disabled={loading}
            aria-label={
              loading
                ? "Checking for story"
                : `Open ${user?.fullName || "user"}'s profile options`
            }
            className="min-w-0 text-left disabled:opacity-70 transition-opacity"
          >
            <span className="relative inline-flex items-center gap-2.5 w-full">
              {children}
              {loading && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin text-[var(--muted-foreground)] shrink-0"
                  strokeWidth={2.2}
                />
              )}
            </span>
          </button>
        </PopoverAnchor>

        <PopoverContent
          className="w-52 p-1.5 animate-popover-in"
          align="start"
          sideOffset={8}
        >
          {/* Story option */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setViewerOpen(true);
            }}
            className="
              group w-full rounded-xl px-3 py-2.5 text-left text-sm
              inline-flex items-center gap-2.5
              text-[var(--foreground)]
              hover:bg-[var(--surface-2)]
              transition-colors
              active:scale-[0.98]
            "
          >
            <span className="w-7 h-7 rounded-full bg-[var(--primary)]/12 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            <span className="font-medium">View story</span>
          </button>

          {/* Profile option */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(`/profile/${user._id}`);
            }}
            className="
              group w-full rounded-xl px-3 py-2.5 text-left text-sm
              inline-flex items-center gap-2.5
              text-[var(--foreground)]
              hover:bg-[var(--surface-2)]
              transition-colors
              active:scale-[0.98]
            "
          >
            <span className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] group-hover:scale-110 transition-all">
              <User className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            <span className="font-medium">View profile</span>
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
            navigate(`/profile/${user._id}`);
          }}
        />
      )}
    </>
  );
};

export default ChatUserMenu;
