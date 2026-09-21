import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import useGetUserProfile from "@/hooks/useGetUserProfile";
import { updateFollowing } from "@/redux/authSlice";
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
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import CommentDialog from "./CommentDialog";
import { setSelectedPost } from "@/redux/postSlice";
import axios from "axios";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "./RequestState";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const profileRequest = useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "posts");
  const [open, setOpen] = useState(false);
  const [peopleType, setPeopleType] = useState(null);

  const { userProfile, user } = useSelector((store) => store.auth);
  const isLoggedInUserProfile = user?._id === userProfile?._id;
  const [isFollowing, setIsFollowing] = useState(
    user?.following?.includes(userProfile?._id),
  );

  useEffect(() => {
    setIsFollowing(user?.following?.includes(userProfile?._id));
  }, [user, userProfile]);

  const dispatch = useDispatch();

  /* ---------- LOGIC (UNCHANGED) ---------- */
  const handleFollowToggle = async () => {
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${userProfile._id}`),
        {},
        { withCredentials: true },
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setIsFollowing(!isFollowing);
        dispatch(updateFollowing(userProfile._id));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    }
  };

  if (profileRequest.loading && !userProfile) {
    return <LoadingState message="Loading profile..." className="h-full" />;
  }

  if (profileRequest.error && !userProfile) {
    return (
      <ErrorState
        message={profileRequest.error}
        onRetry={profileRequest.retry}
        className="h-full"
      />
    );
  }

  const displayedPost =
    activeTab === "posts" ? userProfile?.posts : userProfile?.bookmarks;

  /* ---------- POST CLICK → CommentDialog ---------- */
  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    setOpen(true);
  };

  const people =
    peopleType === "followers"
      ? userProfile?.followers || []
      : userProfile?.following || [];

  /* ---------- UI ---------- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 animate-fade-in">
      {/* ================= HEADER ================= */}
      <section className="relative glass rounded-[32px] overflow-hidden mb-6">
        {/* Gradient banner */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a18]/40" />

        <div className="relative p-5 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:gap-8 md:items-start">
            {/* AVATAR */}
            <div className="flex justify-center md:justify-start shrink-0">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 animate-glow-pulse" />
                <Avatar className="relative h-28 w-28 md:h-36 md:w-36 ring-4 ring-[#0a0a18]">
                  <AvatarImage src={userProfile?.profilePicture} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold">
                    {userProfile?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white text-center md:text-left truncate">
                  {userProfile?.username}
                </h1>

                {isLoggedInUserProfile ? (
                  <div className="flex gap-2 justify-center md:justify-start">
                    <Link
                      to="/account/edit"
                      className="text-xs font-semibold px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/90 hover:bg-white/12 hover:border-white/20 transition-all duration-200"
                    >
                      Edit profile
                    </Link>
                    <button
                      onClick={() => setActiveTab("saved")}
                      className="text-xs font-semibold px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/90 hover:bg-white/12 hover:border-white/20 transition-all duration-200"
                    >
                      Archive
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={handleFollowToggle}
                      className={`text-xs font-semibold px-5 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                        isFollowing
                          ? "bg-white/8 border border-white/10 text-white/90 hover:bg-white/12"
                          : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:opacity-90"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                    <button
                      onClick={() =>
                        navigate("/chat", { state: { user: userProfile } })
                      }
                      className="text-xs font-semibold px-5 py-2 rounded-full bg-white/8 border border-white/10 text-white/90 hover:bg-white/12 hover:border-white/20 transition-all duration-200 active:scale-95"
                    >
                      Message
                    </button>
                  </div>
                )}
              </div>

              {/* BIO */}
              <div className="mt-4 md:mt-5 text-center md:text-left space-y-1.5">
                <h2 className="font-semibold text-sm md:text-base text-white/95">
                  {userProfile?.fullName}
                </h2>
                <p className="text-xs md:text-sm text-white/55 max-w-md mx-auto md:mx-0">
                  {userProfile?.bio || "No bio yet"}
                </p>

                {userProfile?.website && (
                  <a
                    href={userProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {userProfile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}

                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-white/60">
                    <AtSign className="h-3 w-3" />
                    {userProfile?.username}
                  </span>
                </div>
              </div>

              {/* STATS */}
              <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3 max-w-md">
                {/* POSTS → scroll to grid */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("posts");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-white/15 p-3 transition-all duration-200 active:scale-[0.97]"
                >
                  <div className="font-display font-bold text-lg text-white">
                    {userProfile?.posts?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                    Posts
                  </div>
                </button>

                {/* FOLLOWERS */}
                <button
                  type="button"
                  onClick={() => setPeopleType("followers")}
                  className="group rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-white/15 p-3 transition-all duration-200 active:scale-[0.97]"
                >
                  <div className="font-display font-bold text-lg text-white">
                    {userProfile?.followers?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                    Followers
                  </div>
                </button>

                {/* FOLLOWING */}
                <button
                  type="button"
                  onClick={() => setPeopleType("following")}
                  className="group rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-white/15 p-3 transition-all duration-200 active:scale-[0.97]"
                >
                  <div className="font-display font-bold text-lg text-white">
                    {userProfile?.following?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                    Following
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TABS ================= */}
      <div className="sticky top-2 z-10 mb-4">
        <div className="glass-strong rounded-full p-1 flex max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "posts"
                ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.35)]"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "saved"
                ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.35)]"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saved
          </button>
        </div>
      </div>

      {/* ================= GRID ================= */}
      {displayedPost?.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
          {displayedPost.map((post, index) => (
            <button
              key={post._id}
              onClick={() => handlePostClick(post)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/15 transition-all duration-300 animate-slide-up opacity-0"
              style={{
                animationDelay: `${Math.min(index * 40, 400)}ms`,
                animationFillMode: "forwards",
              }}
            >
              <img
                src={post.image}
                alt="Post"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="flex items-center gap-5 text-white">
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-5 w-5 fill-white" />
                    <span className="text-sm font-semibold">
                      {post.likes.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-5 w-5 fill-white" />
                    <span className="text-sm font-semibold">
                      {post.comments.length}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="glass rounded-[28px] py-16 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-4">
            {activeTab === "posts" ? (
              <Grid3x3 className="h-6 w-6 text-white/60" />
            ) : (
              <Bookmark className="h-6 w-6 text-white/60" />
            )}
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-1.5">
            {activeTab === "posts" ? "No posts yet" : "Nothing saved yet"}
          </h3>
          <p className="text-white/45 text-sm max-w-xs">
            {activeTab === "posts"
              ? "When they share photos, they'll appear here."
              : "Saved posts will appear here."}
          </p>
        </div>
      )}

      {/* ================= COMMENT DIALOG ================= */}
      <CommentDialog
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) dispatch(setSelectedPost(null));
        }}
      />

      {/* ================= PEOPLE DIALOG ================= */}
      <Dialog
        open={Boolean(peopleType)}
        onOpenChange={(open) => !open && setPeopleType(null)}
      >
        <DialogContent className="max-w-md glass-strong !rounded-3xl !border-white/10 p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-white/8">
            <DialogTitle className="font-display text-white text-base">
              {peopleType === "followers" ? "Followers" : "Following"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-2">
            {people.length === 0 ? (
              <div className="py-12 text-center">
                <Sparkles className="w-6 h-6 text-white/30 mx-auto mb-3" />
                <p className="text-sm text-white/45">No {peopleType} yet.</p>
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
                  className="w-full flex items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/5 transition-colors duration-200"
                >
                  <div className="relative shrink-0">
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-50" />
                    <Avatar className="relative h-10 w-10 ring-2 ring-[#0a0a18]">
                      <AvatarImage src={person.profilePicture} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold">
                        {(person.fullName || person.username)
                          ?.charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm text-white/95">
                      {person.fullName || person.username}
                    </p>
                    <p className="truncate text-xs text-white/45">
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

export default Profile;
