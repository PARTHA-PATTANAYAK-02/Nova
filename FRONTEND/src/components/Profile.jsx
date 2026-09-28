import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
  LogOut,
  UserPlus,
  UserCheck,
  MoreHorizontal,
  Trash2,
  Home,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import CommentDialog from "./CommentDialog";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { useTheme } from "@/hooks/useTheme";
import axios from "axios";
import { toast } from "sonner";
import { ErrorState } from "./RequestState";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

/* ============================================================
   HELPERS
   ============================================================ */
/* Validate MongoDB ObjectId format (24 hex chars) */
const isValidObjectId = (id) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

/* ============================================================
   PROFILE SKELETON
   ============================================================ */
const ProfileSkeleton = () => (
  <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 animate-fade-in">
    <section className="card mb-4 p-5 md:p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-[var(--surface-2)] animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 w-40 md:w-52 rounded-md bg-[var(--surface-2)] animate-pulse" />
              <div className="h-3 w-24 rounded-md bg-[var(--surface-2)] animate-pulse" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="h-8 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-5">
            <div className="h-3 w-16 rounded-md bg-[var(--surface-2)] animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-[var(--surface-2)] animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-[var(--surface-2)] animate-pulse" />
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="h-3 w-full max-w-md rounded-md bg-[var(--surface-2)] animate-pulse" />
            <div className="h-3 w-3/4 max-w-sm rounded-md bg-[var(--surface-2)] animate-pulse" />
          </div>
        </div>
      </div>
    </section>

    <div className="flex items-center gap-1 p-1 mb-3 rounded-full bg-[var(--surface)] border border-[var(--border)] w-fit mx-auto">
      <div className="h-7 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
      <div className="h-7 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
    </div>

    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl bg-[var(--surface-2)] animate-pulse"
        />
      ))}
    </div>
  </div>
);

/* ============================================================
   PROFILE NOT FOUND (invalid ID)
   ============================================================ */
const ProfileNotFound = () => (
  <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 animate-fade-in">
    <div className="card py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
        <Compass
          className="w-6 h-6 text-[var(--muted-foreground)]"
          strokeWidth={1.8}
        />
      </div>
      <h3
        className="text-lg font-semibold text-[var(--foreground)] mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Profile not found
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
        This user doesn't exist or the link is broken.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        <Home className="w-4 h-4" strokeWidth={2} />
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
  const [followLoading, setFollowLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // track locally-deleted post IDs (until profile refetch)
  const [removedPostIds, setRemovedPostIds] = useState(new Set());
  // which post's menu is open
  const [openMenuId, setOpenMenuId] = useState(null);

  const { userProfile, user } = useSelector((store) => store.auth);
  const { posts: reduxPosts } = useSelector((store) => store.post);

  const isValidId = isValidObjectId(userId);
  const isProfileLoaded = userProfile?._id === userId;

  const { dark, toggleTheme } = useTheme();
  const dispatch = useDispatch();

  /* ============================================================
     RESET ON PROFILE ID CHANGE
     ============================================================ */
  useEffect(() => {
    setActiveTab(location.state?.tab || "posts");
    setRemovedPostIds(new Set());
    setOpenMenuId(null);
    setOpen(false);
    setPeopleType(null);
    setPhotoOpen(false);
    dispatch(setSelectedPost(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isLoggedInUserProfile = user?._id === userProfile?._id;

  // Derive isFollowing directly from user.following
  const isFollowing = user?.following?.includes(userProfile?._id);

  /* ============================================================
     OPTIMISTIC FOLLOW
     ============================================================ */
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

  /* ============================================================
     DELETE POST
     ============================================================ */
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

  /* ============================================================
     LOADING / ERROR GATE
     ============================================================ */

  /* 1) INVALID ObjectId → instant "not found" (no skeleton hang) */
  if (!isValidId) {
    return <ProfileNotFound />;
  }

  /* 2) Still loading OR profile hasn't loaded for this id yet */
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

  const hasFullName = Boolean(userProfile?.fullName?.trim());

  /* ============================================================
     UI
     ============================================================ */
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 animate-fade-in">
      {/* ============ PROFILE HEADER ============ */}
      <section className="card mb-4 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          {/* AVATAR */}
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="View profile photo"
            className="shrink-0 mx-auto sm:mx-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-2 rounded-full"
          >
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border border-[var(--border)]">
              <AvatarImage
                src={userProfile?.profilePicture}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl">
                {userProfile?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* INFO */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1
                  className="text-xl md:text-2xl font-bold text-[var(--foreground)] truncate leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {userProfile?.fullName || userProfile?.username}
                </h1>

                {hasFullName && (
                  <p className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-[var(--muted-foreground)]">
                    <AtSign className="h-3 w-3" strokeWidth={1.8} />
                    {userProfile?.username}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLoggedInUserProfile ? (
                  <SettingsMenu
                    dark={dark}
                    toggleTheme={toggleTheme}
                    onEdit={() => navigate("/account/edit")}
                    onSaved={() => setActiveTab("saved")}
                    onLogout={handleLogout}
                  />
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95 disabled:cursor-not-allowed ${
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
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                          Follow
                        </>
                      )}
                    </button>

                    <button
                      onClick={openChat}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-5 text-sm">
              <span className="text-[var(--muted-foreground)]">
                <span className="font-bold text-[var(--foreground)] tabular-nums">
                  {displayedPost?.length || 0}
                </span>{" "}
                posts
              </span>

              <button
                onClick={() => setPeopleType("followers")}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <span className="font-bold text-[var(--foreground)] tabular-nums">
                  {userProfile?.followers?.length || 0}
                </span>{" "}
                followers
              </button>

              <button
                onClick={() => setPeopleType("following")}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <span className="font-bold text-[var(--foreground)] tabular-nums">
                  {userProfile?.following?.length || 0}
                </span>{" "}
                following
              </button>
            </div>

            {/* Bio */}
            {userProfile?.bio && (
              <p className="mt-3 text-sm text-[var(--foreground)]/80 leading-relaxed">
                {userProfile.bio}
              </p>
            )}

            {/* Website */}
            {userProfile?.website && (
              <a
                href={userProfile.website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline max-w-full truncate"
              >
                <LinkIcon className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                <span className="truncate">
                  {userProfile.website.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ============ TABS ============ */}
      <div className="flex items-center gap-1 p-1 mb-3 rounded-full bg-[var(--surface)] border border-[var(--border)] w-fit mx-auto">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === "posts"
              ? ""
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          style={
            activeTab === "posts"
              ? {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
              : undefined
          }
        >
          <Grid3x3 className="h-3.5 w-3.5" strokeWidth={2} />
          Posts
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === "saved"
              ? ""
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          style={
            activeTab === "saved"
              ? {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
              : undefined
          }
        >
          <BookmarkCheck className="h-3.5 w-3.5" strokeWidth={2} />
          Saved
        </button>
      </div>

      {/* ============ GRID ============ */}
      {displayedPost?.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {displayedPost.map((post, index) => {
            const canManage = isLoggedInUserProfile && activeTab === "posts";
            const isDeleting = deletingId === post._id;

            return (
              <div
                key={post._id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-300 animate-slide-up opacity-0"
                style={{
                  animationDelay: `${Math.min(index * 40, 400)}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <button
                  type="button"
                  onClick={() => handlePostClick(post)}
                  className="absolute inset-0 w-full h-full"
                  aria-label="Open post"
                >
                  <img
                    src={post.image}
                    alt="Post"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex items-center gap-4 text-white">
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-4 w-4 fill-white" strokeWidth={0} />
                        <span className="text-xs font-semibold">
                          {post.likes?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4" strokeWidth={2} />
                        <span className="text-xs font-semibold">
                          {post.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Menu (only own posts) */}
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
                        className="
                          absolute top-2 right-2 z-10
                          w-7 h-7 rounded-full
                          flex items-center justify-center
                          bg-black/60 hover:bg-black/80
                          text-white backdrop-blur-md
                          opacity-0 group-hover:opacity-100
                          transition-opacity duration-200
                          focus:outline-none focus-visible:opacity-100
                        "
                      >
                        <MoreHorizontal
                          className="h-3.5 w-3.5"
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
                        className="
                          flex items-center gap-2 w-full px-2.5 py-2 rounded-md
                          text-sm text-[var(--danger)] hover:bg-[var(--danger)]/8
                          transition-colors text-left disabled:opacity-50
                        "
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        {isDeleting ? "Deleting…" : "Delete post"}
                      </button>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Deleting overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card py-12 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
            {activeTab === "posts" ? (
              <Compass
                className="h-5 w-5 text-[var(--muted-foreground)]"
                strokeWidth={1.8}
              />
            ) : (
              <Bookmark
                className="h-5 w-5 text-[var(--muted-foreground)]"
                strokeWidth={1.8}
              />
            )}
          </div>
          <h3
            className="text-base font-semibold text-[var(--foreground)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {activeTab === "posts" ? "No posts yet" : "Nothing saved yet"}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
            {activeTab === "posts"
              ? "When they share photos, they'll appear here."
              : "Saved posts will appear here."}
          </p>
        </div>
      )}

      {/* ============ PHOTO PREVIEW ============ */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-[min(92vw,360px)] p-0 !gap-0 overflow-hidden border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">
            {userProfile?.fullName || userProfile?.username} profile photo
          </DialogTitle>
          <div className="flex items-center justify-center">
            <img
              src={userProfile?.profilePicture}
              alt={userProfile?.fullName || userProfile?.username}
              className="w-full h-auto max-h-[70vh] object-contain rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ COMMENT DIALOG ============ */}
      <CommentDialog
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) dispatch(setSelectedPost(null));
        }}
      />

      {/* ============ PEOPLE DIALOG ============ */}
      <Dialog
        open={Boolean(peopleType)}
        onOpenChange={(open) => !open && setPeopleType(null)}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-[var(--border)]">
            <DialogTitle
              className="text-base font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {peopleType === "followers" ? "Followers" : "Following"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-2">
            {people.length === 0 ? (
              <div className="py-10 text-center">
                <Compass
                  className="w-5 h-5 text-[var(--muted-foreground)] mx-auto mb-2"
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
                  className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
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
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      @{person.username}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============================================================
   SETTINGS MENU
   ============================================================ */
const SettingsMenu = ({ dark, toggleTheme, onEdit, onSaved, onLogout }) => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const itemCls =
    "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors text-left";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors active:scale-95"
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={2} />
          Settings
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-56 p-1.5">
        <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Options
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          className="
            group flex w-full items-center justify-between
            rounded-xl px-2.5 py-2.5 text-sm text-[var(--foreground)]
            transition-all duration-200 hover:bg-[var(--surface-2)]
          "
        >
          <span className="flex items-center gap-2.5">
            <span
              className="
                relative flex h-8 w-8 items-center justify-center
                overflow-hidden rounded-lg border border-[var(--border)]
                bg-[var(--surface-2)]
              "
            >
              <Sun
                className={`
                  absolute h-[17px] w-[17px] text-amber-500
                  transition-all duration-500 ease-in-out
                  ${
                    dark
                      ? "-translate-y-8 rotate-180 scale-0 opacity-0"
                      : "translate-y-0 rotate-0 scale-100 opacity-100"
                  }
                `}
                strokeWidth={2}
              />

              <Moon
                className={`
                  absolute h-[17px] w-[17px] text-[var(--primary)]
                  transition-all duration-500 ease-in-out
                  ${
                    dark
                      ? "translate-y-0 rotate-0 scale-100 opacity-100"
                      : "translate-y-8 -rotate-180 scale-0 opacity-0"
                  }
                `}
                strokeWidth={2}
              />
            </span>

            <span className="font-medium">Theme</span>
          </span>

          <span
            className={`
              relative h-7 w-[52px] shrink-0 overflow-hidden
              rounded-full border p-[2px]
              transition-all duration-500 ease-in-out
              ${
                dark
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-[var(--border-strong)] bg-[var(--surface-2)]"
              }
            `}
          >
            <span
              className={`
                pointer-events-none absolute inset-0 rounded-full
                transition-opacity duration-500
                ${dark ? "bg-white/10 opacity-100" : "bg-transparent opacity-0"}
              `}
            />

            <span
              className={`
                pointer-events-none absolute inset-0 transition-all duration-500
                ${dark ? "scale-100 opacity-100" : "scale-50 opacity-0"}
              `}
            >
              <span className="absolute left-2 top-1 h-1 w-1 rounded-full bg-white/80" />
              <span className="absolute left-5 top-4 h-0.5 w-0.5 rounded-full bg-white/60" />
              <span className="absolute right-2 top-2 h-0.5 w-0.5 rounded-full bg-white/70" />
            </span>

            <span
              className={`
                relative z-10 flex h-[21px] w-[21px] items-center justify-center
                rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]
                transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]
                ${
                  dark
                    ? "translate-x-[23px] rotate-[360deg]"
                    : "translate-x-0 rotate-0"
                }
              `}
            >
              {dark ? (
                <Moon
                  className="h-3 w-3 text-[var(--primary)]"
                  strokeWidth={2.5}
                />
              ) : (
                <Sun className="h-3 w-3 text-amber-500" strokeWidth={2.5} />
              )}
            </span>
          </span>
        </button>

        <button
          onClick={() => {
            close();
            onEdit();
          }}
          className={itemCls}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.8} />
          Edit profile
        </button>

        <button
          onClick={() => {
            close();
            onSaved();
          }}
          className={itemCls}
        >
          <Bookmark className="h-4 w-4" strokeWidth={1.8} />
          Saved
        </button>

        <div className="my-1 h-px bg-[var(--border)] mx-1.5" />

        <button
          onClick={() => {
            close();
            onLogout();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-[var(--danger)] hover:bg-[var(--danger)]/8 transition-colors text-left"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Log out
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default Profile;
