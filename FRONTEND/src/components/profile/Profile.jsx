import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useGetUserProfile from "@/hooks/useGetUserProfile";
import { updateFollowing, setAuthUser } from "@/redux/authSlice";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  AtSign,
  Heart,
  MessageCircle,
  Bookmark,
  Grid3x3,
  BookmarkCheck,
  Link as LinkIcon,
  Compass,
  Settings,
  Sun,
  Moon,
  Pencil,
  KeyRound,
  LogOut,
  UserPlus,
  UserCheck,
  MoreHorizontal,
  Trash2,
  Plus,
  Loader2,
  Home,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CommentDialog from "@/components/comments/CommentDialog";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { useTheme } from "@/hooks/useTheme";
import axios from "axios";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/RequestState";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import StoryViewer from "@/components/feed/StoryViewer";
import {
  checkIsStoryAllViewed,
  getGlobalViewedItemIds,
  markStoryItemAsViewed,
} from "@/lib/story";

const isValidObjectId = (id) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

const fmtCount = (n) => {
  if (!n && n !== 0) return "0";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
};

const ProfileSkeleton = () => (
  <div className="nova-profile">
    <div className="nova-profile__hero">
      <div className="nova-profile__cover nova-profile__cover--empty nova-skel-pulse" />
      <div className="nova-profile__body">
        <div className="nova-profile__avatar nova-profile__avatar--skeleton nova-skel-pulse" />
        <div className="nova-profile__info">
          <div className="nova-profile__skel-bar nova-profile__skel-bar--lg nova-skel-pulse" />
          <div className="nova-profile__skel-bar nova-profile__skel-bar--sm nova-skel-pulse" />
        </div>
      </div>
    </div>
  </div>
);

const ProfileNotFound = () => (
  <div className="nova-profile">
    <div className="nova-profile__empty">
      <div className="nova-profile__empty-orb">
        <Compass className="size-5" strokeWidth={1.8} />
      </div>
      <h3 className="nova-profile__empty-title">Profile not found</h3>
      <p className="nova-profile__empty-sub">
        This user doesn't exist or the link is broken.
      </p>
      <Link to="/" className="nova-btn-primary mt-5">
        <Home className="size-4" strokeWidth={2} />
        Go home
      </Link>
    </div>
  </div>
);

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const profileRequest = useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "posts");
  const [open, setOpen] = useState(false);
  const [peopleType, setPeopleType] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [profileStory, setProfileStory] = useState(null);
  const [profileStoryOpen, setProfileStoryOpen] = useState(false);
  const [viewedStoryIds, setViewedStoryIds] = useState(getGlobalViewedItemIds);
  const [followLoading, setFollowLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* ═══ Highlights State ═══ */
  const [highlights, setHighlights] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [activeHighlightViewer, setActiveHighlightViewer] = useState(null);
  const [newHighlightOpen, setNewHighlightOpen] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [creatingHighlight, setCreatingHighlight] = useState(false);
  const [deleteHighlightTarget, setDeleteHighlightTarget] = useState(null);
  const [selectedHighlightStories, setSelectedHighlightStories] = useState([]);
  const [selectedHighlightCover, setSelectedHighlightCover] = useState("");
  const [userStoriesArchive, setUserStoriesArchive] = useState([]);
  const [loadingStoriesArchive, setLoadingStoriesArchive] = useState(false);

  useEffect(() => {
    if (userId && isValidObjectId(userId)) {
      setLoadingHighlights(true);
      axios
        .get(apiUrl(`/api/v1/story/highlights/user/${userId}`), {
          withCredentials: true,
        })
        .then((res) => {
          if (res.data?.success) {
            setHighlights(res.data.highlights || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHighlights(false));
    }
  }, [userId]);

  const handleOpenHighlight = (highlight) => {
    if (!highlight || !highlight.stories?.length) {
      toast.info("This highlight has no stories yet.");
      return;
    }
    const highlightStoryGroup = {
      _id: highlight._id,
      user: userProfile || user,
      items: highlight.stories.map((s) => ({
        _id: s.storyId || s._id,
        image: s.image,
        mediaType: s.mediaType || "image",
        caption: s.caption || "",
        createdAt: s.createdAt,
        poll: s.poll,
        questionSticker: s.questionSticker,
        sharedPost: s.sharedPost,
      })),
    };
    setActiveHighlightViewer({
      stories: [highlightStoryGroup],
      userIndex: 0,
      itemIndex: 0,
    });
  };

  const handleCreateHighlightFromProfile = async () => {
    if (!newHighlightTitle.trim() || creatingHighlight) return;
    try {
      setCreatingHighlight(true);
      const coverUrl =
        selectedHighlightCover ||
        selectedHighlightStories[0]?.image ||
        profileStory?.items?.[0]?.image ||
        userProfile?.posts?.[0]?.image ||
        userProfile?.profilePicture ||
        "";
      const storyIds = selectedHighlightStories.map((s) => s._id || s.storyId);

      const res = await axios.post(
        apiUrl("/api/v1/story/highlight"),
        {
          name: newHighlightTitle.trim(),
          cover: coverUrl,
          storyIds: storyIds.length > 0 ? storyIds : undefined,
          storyId: storyIds[0] || profileStory?.items?.[0]?._id || undefined,
        },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(`Highlight "${newHighlightTitle.trim()}" created!`);
        setHighlights((prev) => [res.data.highlight, ...prev]);
        setNewHighlightTitle("");
        setSelectedHighlightStories([]);
        setSelectedHighlightCover("");
        setNewHighlightOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to create highlight.");
    } finally {
      setCreatingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    try {
      await axios.delete(apiUrl(`/api/v1/story/highlight/${highlightId}`), {
        withCredentials: true,
      });
      setHighlights((prev) => prev.filter((h) => h._id !== highlightId));
      setDeleteHighlightTarget(null);
      toast.success("Highlight removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete highlight.");
    }
  };

  useEffect(() => {
    const handleGlobalSync = () => {
      setViewedStoryIds(getGlobalViewedItemIds());
    };
    window.addEventListener("nova:story-viewed", handleGlobalSync);
    return () => window.removeEventListener("nova:story-viewed", handleGlobalSync);
  }, []);

  const [removedPostIds, setRemovedPostIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);

  const { userProfile, user } = useSelector((store) => store.auth);
  const { posts: reduxPosts } = useSelector((store) => store.post);

  const isValidId = isValidObjectId(userId);
  const isProfileLoaded = userProfile?._id === userId;
  const userFollowingKey = (user?.following || [])
    .map((id) => id?._id || id)
    .join(",");

  const { dark, toggleTheme } = useTheme();
  const dispatch = useDispatch();

  useEffect(() => {
    setActiveTab(location.state?.tab || "posts");
    setRemovedPostIds(new Set());
    setOpenMenuId(null);
    setOpen(false);
    setPeopleType(null);
    setPhotoOpen(false);
    setCoverOpen(false);
    setProfileStory(null);
    setProfileStoryOpen(false);
    dispatch(setSelectedPost(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isLoggedInUserProfile = user?._id === userProfile?._id;

  useEffect(() => {
    let active = true;
    if (!userProfile?._id || userProfile._id === user?._id) {
      setProfileStory(null);
      return () => {
        active = false;
      };
    }
    axios
      .get(apiUrl(`/api/v1/story?userIds=${userProfile._id}`), {
        withCredentials: true,
      })
      .then((response) => {
        if (active && response.data?.success) {
          setProfileStory(response.data.stories?.[0] || null);
        }
      })
      .catch((error) => {
        if (active) {
          setProfileStory(null);
          toast.error(
            error.response?.data?.message ||
              "Unable to load this user's story.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [userProfile?._id, user?._id, userFollowingKey]);

  const isFollowing = (user?.following || []).some(
    (id) => (id?._id || id)?.toString() === userProfile?._id?.toString(),
  );

  const handleFollowToggle = async () => {
    if (followLoading || !userProfile?._id) return;
    setFollowLoading(true);
    dispatch(updateFollowing(userProfile._id));
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${userProfile._id}`),
        {},
        { withCredentials: true },
      );
      if (!res.data.success) {
        dispatch(updateFollowing(userProfile._id));
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      dispatch(updateFollowing(userProfile._id));
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId || deletingId) return;
    setOpenMenuId(null);
    setDeletingId(postId);
    try {
      const res = await axios.delete(apiUrl(`/api/v1/post/delete/${postId}`), {
        withCredentials: true,
      });
      if (res.data.success) {
        setRemovedPostIds((prev) => new Set([...prev, postId]));
        const updatedPosts = (reduxPosts || []).filter((p) => p._id !== postId);
        dispatch(setPosts(updatedPosts));
        toast.success(res.data.message || "Post deleted");
      } else {
        toast.error("Unable to delete post.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
    } finally {
      setDeletingId(null);
    }
  };

  const openChat = () => {
    if (!userProfile?._id) return;
    navigate("/chat", { state: { user: userProfile } });
  };

  const handleLogout = async () => {
    try {
      const res = await axios.get(apiUrl("/api/v1/user/logout"), {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to log out. Please try again."),
      );
    }
  };

  if (!isValidId) return <ProfileNotFound />;

  if (!isProfileLoaded) {
    if (profileRequest.error && !profileRequest.loading) {
      return (
        <ErrorState
          message={profileRequest.error}
          onRetry={profileRequest.retry}
          className="h-full"
        />
      );
    }
    return <ProfileSkeleton />;
  }

  const rawPosts =
    activeTab === "posts" ? userProfile?.posts : userProfile?.bookmarks;

  const displayedPost = (rawPosts || []).filter(
    (p) => !removedPostIds.has(p._id),
  );

  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    setOpen(true);
  };

  const people =
    peopleType === "followers"
      ? userProfile?.followers || []
      : userProfile?.following || [];

  const hasCover = Boolean(userProfile?.coverPicture);
  const coverUrl = userProfile?.coverPicture;

  const isAllStoryViewed = checkIsStoryAllViewed(profileStory, viewedStoryIds);

  const initial = (userProfile?.fullName || userProfile?.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="nova-profile">
      {/* ══════════════ HERO ══════════════ */}
      <section className="nova-profile__hero">
        {hasCover && (
          <div
            aria-hidden
            className="nova-profile__ambient"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}

        {hasCover ? (
          <button
            type="button"
            onClick={() => setCoverOpen(true)}
            aria-label="View cover photo"
            className="nova-profile__cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
          >
            <span className="nova-profile__cover-zoom" aria-hidden>
              <Maximize2 className="size-4" strokeWidth={2.2} />
            </span>
          </button>
        ) : (
          <div className="nova-profile__cover nova-profile__cover--empty" />
        )}

        <div className="nova-profile__hero-actions">
          {isLoggedInUserProfile ? (
            <SettingsMenu
              dark={dark}
              toggleTheme={toggleTheme}
              onEdit={() => navigate("/account/edit")}
              onSecurity={() => navigate("/account/security")}
              onSaved={() => setActiveTab("saved")}
              onLogout={handleLogout}
              needsUsername={!user?.username}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followLoading}
                aria-label={isFollowing ? "Unfollow" : "Follow"}
                className={`nova-profile__hero-btn ${isFollowing ? "is-following" : "is-follow"}`}
              >
                {isFollowing ? (
                  <UserCheck className="size-4" strokeWidth={2.2} />
                ) : (
                  <UserPlus className="size-4" strokeWidth={2.2} />
                )}
              </button>
              <button
                type="button"
                onClick={openChat}
                aria-label="Message"
                className="nova-profile__hero-btn"
              >
                <MessageCircle className="size-4" strokeWidth={2.2} />
              </button>
            </>
          )}
        </div>

        <div className="nova-profile__body">
          <div className="nova-profile__avatar-wrap">
            {profileStory?.items?.length ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Story and profile options"
                    className="nova-profile__avatar-btn"
                  >
                    <span
                      className={`nova-profile__avatar-ring ${
                        isAllStoryViewed ? "is-seen" : ""
                      }`}
                    >
                      <Avatar className="nova-profile__avatar">
                        <AvatarImage
                          src={userProfile?.profilePicture}
                          className="object-cover"
                        />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                    </span>
                    <span className="nova-profile__story-dot" aria-hidden />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5" align="center">
                  <button
                    type="button"
                    onClick={() => setProfileStoryOpen(true)}
                    className="nova-profile__popover-item"
                  >
                    <span className="nova-profile__popover-orb nova-profile__popover-orb--grad">
                      ▶
                    </span>
                    View story
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoOpen(true)}
                    className="nova-profile__popover-item"
                  >
                    <span className="nova-profile__popover-orb">
                      <Compass className="size-3" strokeWidth={2.4} />
                    </span>
                    View profile photo
                  </button>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                aria-label="View profile photo"
                className="nova-profile__avatar-btn"
              >
                <Avatar className="nova-profile__avatar">
                  <AvatarImage
                    src={userProfile?.profilePicture}
                    className="object-cover"
                  />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
              </button>
            )}
          </div>

          <div className="nova-profile__info">
            <div className="nova-profile__identity">
              <h1 className="nova-profile__name">
                {userProfile?.fullName || userProfile?.username || "Nova user"}
              </h1>
              <div className="nova-profile__handle-row">
                {userProfile?.username && (
                  <span className="nova-profile__handle">
                    <AtSign className="size-3" strokeWidth={1.8} />
                    {userProfile.username}
                  </span>
                )}
                {userProfile?.website && (
                  <a
                    href={userProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="nova-profile__link"
                  >
                    <LinkIcon className="size-3 shrink-0" strokeWidth={1.8} />
                    <span className="truncate">
                      {userProfile.website.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                )}
              </div>
            </div>

            <div className="nova-profile__stats">
              <div className="nova-profile__stat">
                <span className="nova-profile__stat-num">
                  {fmtCount(displayedPost?.length || 0)}
                </span>
                <span className="nova-profile__stat-label">Posts</span>
              </div>
              <button
                type="button"
                onClick={() => setPeopleType("followers")}
                className="nova-profile__stat is-clickable"
              >
                <span className="nova-profile__stat-num">
                  {fmtCount(userProfile?.followers?.length || 0)}
                </span>
                <span className="nova-profile__stat-label">Followers</span>
              </button>
              <button
                type="button"
                onClick={() => setPeopleType("following")}
                className="nova-profile__stat is-clickable"
              >
                <span className="nova-profile__stat-num">
                  {fmtCount(userProfile?.following?.length || 0)}
                </span>
                <span className="nova-profile__stat-label">Following</span>
              </button>
            </div>

            {userProfile?.bio && (
              <p className="nova-profile__bio">{userProfile.bio}</p>
            )}

            {!isLoggedInUserProfile && (
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`nova-profile__follow-cta ${
                  isFollowing ? "is-following" : ""
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="size-4" strokeWidth={2.2} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" strokeWidth={2.2} />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ INSTAGRAM STORY HIGHLIGHTS BAR ══════════════ */}
      {highlights.length > 0 && (
        <div className="nova-profile__highlights px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full select-none">
          <div className="flex items-center gap-4 overflow-x-auto scroll-hide pb-2 pt-1">
            {/* List of Highlights */}
            {highlights.map((hl) => (
              <div
                key={hl._id}
                className="relative flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer outline-none"
              >
                <button
                  type="button"
                  onClick={() => handleOpenHighlight(hl)}
                  className="size-16 sm:size-18 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500/80 via-pink-500/80 to-purple-600/80 hover:scale-105 active:scale-95 transition-transform shadow-md"
                >
                  <div className="size-full rounded-full overflow-hidden bg-[var(--surface)] ring-2 ring-[var(--surface)]">
                    {hl.cover ? (
                      <img
                        src={hl.cover}
                        alt={hl.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-tr from-purple-500/20 to-pink-500/20 text-lg">
                        ✨
                      </div>
                    )}
                  </div>
                </button>

                <span className="text-[11px] sm:text-xs font-semibold text-[var(--foreground)] truncate max-w-[76px] text-center">
                  {hl.name}
                </span>

                {/* Owner Delete Highlight Option */}
                {isLoggedInUserProfile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteHighlightTarget(hl);
                    }}
                    title="Delete highlight"
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TABS — CENTERED ══════════════ */}
      <div className="nova-profile__tabs-wrap">
        <div className="nova-profile__tabs">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`nova-tab ${activeTab === "posts" ? "is-active" : ""}`}
          >
            <Grid3x3 className="size-3.5" strokeWidth={2} />
            Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`nova-tab ${activeTab === "saved" ? "is-active" : ""}`}
          >
            <BookmarkCheck className="size-3.5" strokeWidth={2} />
            Saved
          </button>
        </div>
      </div>

      {/* ══════════════ GRID ══════════════ */}
      {displayedPost?.length > 0 ? (
        <div className="nova-profile__grid">
          {displayedPost.map((post, index) => {
            const canManage = isLoggedInUserProfile && activeTab === "posts";
            const isDeleting = deletingId === post._id;

            return (
              <div
                key={post._id}
                className="nova-profile__tile"
                style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => handlePostClick(post)}
                  className="nova-profile__tile-btn"
                  aria-label="Open post"
                >
                  {post.mediaType === "video" ? (
                    <video
                      src={post.image}
                      aria-label="Video post"
                      className="nova-profile__tile-media"
                      muted
                      playsInline
                      preload="metadata"
                      disablePictureInPicture
                      controlsList="nodownload noplaybackrate nofullscreen"
                      onContextMenu={(event) => event.preventDefault()}
                    />
                  ) : (
                    <img
                      src={post.image}
                      alt="Post"
                      className="nova-profile__tile-media"
                      draggable={false}
                    />
                  )}

                  <div className="nova-profile__tile-overlay">
                    <span className="nova-profile__tile-stat">
                      <Heart
                        className="size-4"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      {fmtCount(post.likes?.length || 0)}
                    </span>
                    <span className="nova-profile__tile-stat">
                      <MessageCircle className="size-4" strokeWidth={2} />
                      {fmtCount(post.comments?.length || 0)}
                    </span>
                  </div>
                </button>

                {canManage && (
                  <Popover
                    open={openMenuId === post._id}
                    onOpenChange={(v) => setOpenMenuId(v ? post._id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Post options"
                        onClick={(e) => e.stopPropagation()}
                        className="nova-profile__tile-menu"
                      >
                        <MoreHorizontal
                          className="size-3.5"
                          strokeWidth={2.4}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={6}
                      className="w-40 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post._id)}
                        disabled={isDeleting}
                        className="nova-profile__menu-item is-danger"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2} />
                        {isDeleting ? "Deleting…" : "Delete post"}
                      </button>
                    </PopoverContent>
                  </Popover>
                )}

                {isDeleting && (
                  <div className="nova-profile__tile-loading">
                    <div className="nova-spinner" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="nova-profile__empty">
          <div className="nova-profile__empty-orb">
            {activeTab === "posts" ? (
              <Compass className="size-5" strokeWidth={1.8} />
            ) : (
              <Bookmark className="size-5" strokeWidth={1.8} />
            )}
          </div>
          <h3 className="nova-profile__empty-title">
            {activeTab === "posts" ? "No posts yet" : "Nothing saved yet"}
          </h3>
          <p className="nova-profile__empty-sub">
            {activeTab === "posts"
              ? "When they share photos, they'll appear here."
              : "Saved posts will appear here."}
          </p>
        </div>
      )}

      {profileStoryOpen && profileStory && (
        <StoryViewer
          stories={[profileStory]}
          onClose={() => setProfileStoryOpen(false)}
          onMarkViewed={(itemId) => {
            markStoryItemAsViewed(itemId);
            setViewedStoryIds((previous) => new Set(previous).add(itemId));
            setProfileStory(
              (previous) =>
                previous && {
                  ...previous,
                  items: previous.items.map((item) =>
                    item._id === itemId ? { ...item, viewedByMe: true } : item,
                  ),
                },
            );
          }}
          onReactionChange={(itemId, emoji, reactionDetails) =>
            setProfileStory(
              (previous) =>
                previous && {
                  ...previous,
                  items: previous.items.map((item) =>
                    item._id === itemId
                      ? {
                          ...item,
                          reactionByMe: emoji,
                          ...(reactionDetails ? { reactionDetails } : {}),
                        }
                      : item,
                  ),
                },
            )
          }
          onOpenProfile={() => setProfileStoryOpen(false)}
        />
      )}
      {activeHighlightViewer && (
        <StoryViewer
          stories={activeHighlightViewer.stories}
          initialUserIndex={activeHighlightViewer.userIndex}
          initialItemIndex={activeHighlightViewer.itemIndex}
          onClose={() => setActiveHighlightViewer(null)}
        />
      )}

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-fit min-w-[min(90vw,320px)] max-w-[min(94vw,560px)] sm:max-w-[min(94vw,560px)] h-fit p-0 !gap-0 overflow-hidden border border-white/10 bg-black/90 backdrop-blur-2xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85)]"
        >
          <DialogTitle className="sr-only">Profile photo of {userProfile?.fullName || userProfile?.username}</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-8 ring-1 ring-white/20 shrink-0">
                <AvatarImage src={userProfile?.profilePicture} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-semibold text-white leading-tight truncate">
                  {userProfile?.fullName || userProfile?.username}
                </span>
                <span className="text-[11px] text-white/60 leading-tight truncate">
                  @{userProfile?.username || "user"} · Profile Photo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              aria-label="Close"
              className="size-8 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0 ml-4"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Large Profile Photo with ambient backdrop glow */}
          <div className="relative flex items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-black/20 to-black/60 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-35 scale-125"
              style={{ backgroundImage: `url(${userProfile?.profilePicture})` }}
            />

            <div className="relative">
              <img
                src={userProfile?.profilePicture}
                alt={userProfile?.fullName || userProfile?.username || "User"}
                className="size-[min(76vw,420px)] object-cover rounded-full ring-4 ring-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
                draggable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-fit min-w-[min(90vw,340px)] max-w-[min(94vw,1100px)] sm:max-w-[min(94vw,1100px)] h-fit p-0 !gap-0 overflow-hidden border border-white/10 bg-black/90 backdrop-blur-2xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85)]"
        >
          <DialogTitle className="sr-only">Cover photo of {userProfile?.fullName || userProfile?.username}</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-8 ring-1 ring-white/20 shrink-0">
                <AvatarImage src={userProfile?.profilePicture} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-semibold text-white leading-tight truncate">
                  {userProfile?.fullName || userProfile?.username}
                </span>
                <span className="text-[11px] text-white/60 leading-tight">
                  Cover Photo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCoverOpen(false)}
              aria-label="Close"
              className="size-8 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0 ml-4"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Cover View - fits image width cleanly without unnecessary side gaps */}
          <div className="relative flex items-center justify-center p-2 sm:p-3 bg-gradient-to-b from-black/20 to-black/60">
            <img
              src={coverUrl}
              alt="Cover"
              className="block w-auto h-auto max-w-[min(90vw,1060px)] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CommentDialog
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) dispatch(setSelectedPost(null));
        }}
      />

      <Dialog
        open={Boolean(peopleType)}
        onOpenChange={(open) => !open && setPeopleType(null)}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-[var(--border)]">
            <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
              {peopleType === "followers" ? "Followers" : "Following"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-2">
            {people.length === 0 ? (
              <div className="py-10 text-center">
                <Compass
                  className="size-5 text-[var(--muted-foreground)] mx-auto mb-2"
                  strokeWidth={1.8}
                />
                <p className="text-sm text-[var(--muted-foreground)]">
                  No {peopleType} yet.
                </p>
              </div>
            ) : (
              people.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  onClick={() => {
                    setPeopleType(null);
                    navigate(`/profile/${person._id}`);
                  }}
                  className="nova-people-row"
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={person.profilePicture} />
                    <AvatarFallback>
                      {(person.fullName || person.username)
                        ?.charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm text-[var(--foreground)]">
                      {person.fullName || person.username}
                    </p>
                    {person.username && (
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        @{person.username}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Story Highlight Dialog ═══ */}
      <Dialog open={newHighlightOpen} onOpenChange={setNewHighlightOpen}>
        <DialogContent className="w-full max-w-md p-0 overflow-hidden border border-white/10 bg-[#161722]/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Plus className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  New Highlight
                </DialogTitle>
                <p className="text-[11px] text-white/50">
                  Save stories or photos to your profile
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewHighlightOpen(false)}
              className="size-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Live Highlight Circle Preview */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative size-20 sm:size-22 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shadow-xl group">
                <div className="size-full rounded-full overflow-hidden bg-[#181926] ring-2 ring-[#161722] flex items-center justify-center">
                  {selectedHighlightCover ||
                  selectedHighlightStories[0]?.image ||
                  profileStory?.items?.[0]?.image ||
                  userProfile?.posts?.[0]?.image ? (
                    <img
                      src={
                        selectedHighlightCover ||
                        selectedHighlightStories[0]?.image ||
                        profileStory?.items?.[0]?.image ||
                        userProfile?.posts?.[0]?.image
                      }
                      alt="Highlight cover preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Sparkles className="size-7 text-pink-400" />
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-white mt-2 truncate max-w-[140px]">
                {newHighlightTitle.trim() || "Highlight Name"}
              </span>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/80">
                Highlight Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                maxLength={30}
                value={newHighlightTitle}
                onChange={(e) => setNewHighlightTitle(e.target.value)}
                placeholder="e.g. Travel, Gym, Moments, Vibes..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newHighlightTitle.trim()) {
                    handleCreateHighlightFromProfile();
                  }
                }}
              />
            </div>

            {/* Select from Active Stories (if available) */}
            {profileStory?.items?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-white/80">
                  <span>Select Stories</span>
                  <span className="text-[11px] text-white/40">
                    {selectedHighlightStories.length} selected
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide">
                  {profileStory.items.map((item) => {
                    const isSelected = selectedHighlightStories.some(
                      (s) => s._id === item._id || s.storyId === item._id
                    );
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHighlightStories((prev) =>
                              prev.filter(
                                (s) => s._id !== item._id && s.storyId !== item._id
                              )
                            );
                            if (selectedHighlightCover === item.image) {
                              setSelectedHighlightCover("");
                            }
                          } else {
                            setSelectedHighlightStories((prev) => [...prev, item]);
                            if (!selectedHighlightCover) {
                              setSelectedHighlightCover(item.image);
                            }
                          }
                        }}
                        className={`relative size-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/50 scale-95"
                            : "border-white/10 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={item.image}
                          alt="Story"
                          className="size-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[var(--primary)]/30 flex items-center justify-center">
                            <div className="size-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
                              <Check className="size-3" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Select from Posts as Cover (if available) */}
            {userProfile?.posts?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-white/80">
                  <span>Choose Cover from Posts</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide">
                  {userProfile.posts.slice(0, 10).map((post) => {
                    const isCover = selectedHighlightCover === post.image;
                    return (
                      <button
                        key={post._id}
                        type="button"
                        onClick={() => setSelectedHighlightCover(post.image)}
                        className={`relative size-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          isCover
                            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/50 scale-95"
                            : "border-white/10 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={post.image}
                          alt="Post"
                          className="size-full object-cover"
                        />
                        {isCover && (
                          <div className="absolute inset-0 bg-[var(--primary)]/30 flex items-center justify-center">
                            <div className="size-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
                              <Check className="size-2.5" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => {
                setNewHighlightOpen(false);
                setNewHighlightTitle("");
                setSelectedHighlightStories([]);
                setSelectedHighlightCover("");
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newHighlightTitle.trim() || creatingHighlight}
              onClick={handleCreateHighlightFromProfile}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {creatingHighlight && <Loader2 className="size-3.5 animate-spin" />}
              <span>{creatingHighlight ? "Creating…" : "Create Highlight"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Highlight Confirmation Dialog ═══ */}
      <Dialog
        open={Boolean(deleteHighlightTarget)}
        onOpenChange={(open) => !open && setDeleteHighlightTarget(null)}
      >
        <DialogContent className="max-w-sm p-5 border border-white/10 bg-[#161720]/95 backdrop-blur-2xl rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              Delete Highlight?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/60 mt-1">
            Are you sure you want to delete &ldquo;{deleteHighlightTarget?.name}&rdquo;?
            This will remove the highlight from your profile.
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setDeleteHighlightTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDeleteHighlight(deleteHighlightTarget._id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

const SettingsMenu = ({
  dark,
  toggleTheme,
  onEdit,
  onSecurity,
  onSaved,
  onLogout,
  needsUsername,
}) => {
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="nova-profile__hero-btn is-settings"
          aria-label="Settings"
          title="Settings"
        >
          <span className="nova-profile__hero-btn-orb">
            <Settings className="size-4" strokeWidth={2.2} />
            {needsUsername && <span className="nova-profile__hero-btn-dot" />}
          </span>
          <span className="nova-profile__hero-btn-label">Settings</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-56 p-1.5">
        <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Options
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          className="nova-settings-theme-row"
        >
          <span className="flex items-center gap-2.5">
            <span className="nova-settings-theme-orb">
              <Sun
                className={`absolute size-[17px] text-amber-500 transition-all duration-500 ease-in-out ${
                  dark
                    ? "-translate-y-8 rotate-180 scale-0 opacity-0"
                    : "translate-y-0 rotate-0 scale-100 opacity-100"
                }`}
                strokeWidth={2}
              />
              <Moon
                className={`absolute size-[17px] text-[var(--primary)] transition-all duration-500 ease-in-out ${
                  dark
                    ? "translate-y-0 rotate-0 scale-100 opacity-100"
                    : "translate-y-8 -rotate-180 scale-0 opacity-0"
                }`}
                strokeWidth={2}
              />
            </span>
            <span className="font-medium">Theme</span>
          </span>

          <span
            className={`relative h-7 w-[52px] shrink-0 overflow-hidden rounded-full border p-[2px] transition-all duration-500 ease-in-out ${
              dark
                ? "border-[var(--primary)] bg-[var(--primary)]"
                : "border-[var(--border-strong)] bg-[var(--surface-2)]"
            }`}
          >
            <span
              className={`relative z-10 flex h-[21px] w-[21px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${
                dark
                  ? "translate-x-[23px] rotate-[360deg]"
                  : "translate-x-0 rotate-0"
              }`}
            >
              {dark ? (
                <Moon
                  className="size-3 text-[var(--primary)]"
                  strokeWidth={2.5}
                />
              ) : (
                <Sun className="size-3 text-amber-500" strokeWidth={2.5} />
              )}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
            toast.success(next ? "Sound FX enabled" : "Sound FX muted");
          }}
          aria-label={soundOn ? "Mute sound effects" : "Enable sound effects"}
          className="nova-settings-theme-row mt-1"
        >
          <span className="flex items-center gap-2.5">
            <span className="nova-settings-theme-orb">
              {soundOn ? (
                <Volume2
                  className="size-[17px] text-[var(--primary)]"
                  strokeWidth={2}
                />
              ) : (
                <VolumeX
                  className="size-[17px] text-[var(--muted-foreground)]"
                  strokeWidth={2}
                />
              )}
            </span>
            <span className="font-medium">Sound FX</span>
          </span>

          <span
            className={`relative h-7 w-[52px] shrink-0 overflow-hidden rounded-full border p-[2px] transition-all duration-300 ease-in-out ${
              soundOn
                ? "border-[var(--primary)] bg-[var(--primary)]"
                : "border-[var(--border-strong)] bg-[var(--surface-2)]"
            }`}
          >
            <span
              className={`relative z-10 flex h-[21px] w-[21px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out ${
                soundOn ? "translate-x-[23px]" : "translate-x-0"
              }`}
            >
              {soundOn ? (
                <Volume2
                  className="size-3 text-[var(--primary)]"
                  strokeWidth={2.5}
                />
              ) : (
                <VolumeX
                  className="size-3 text-[var(--muted-foreground)]"
                  strokeWidth={2.5}
                />
              )}
            </span>
          </span>
        </button>

        <button
          onClick={() => {
            close();
            onEdit();
          }}
          className="nova-settings-item"
        >
          <Pencil className="size-4" strokeWidth={1.8} />
          <span className="flex-1">Edit profile</span>
          {needsUsername && (
            <span className="size-2 rounded-full bg-[var(--danger)]" />
          )}
        </button>

        <button
          onClick={() => {
            close();
            onSecurity();
          }}
          className="nova-settings-item"
        >
          <KeyRound className="size-4" strokeWidth={1.8} />
          Password & security
        </button>

        <button
          onClick={() => {
            close();
            onSaved();
          }}
          className="nova-settings-item"
        >
          <Bookmark className="size-4" strokeWidth={1.8} />
          Saved
        </button>

        <div className="my-1 h-px bg-[var(--border)] mx-1.5" />

        <button
          onClick={() => {
            close();
            onLogout();
          }}
          className="nova-settings-item is-danger"
        >
          <LogOut className="size-4" strokeWidth={1.8} />
          Log out
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default Profile;
