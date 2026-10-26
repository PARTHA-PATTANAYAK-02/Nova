import React, { useEffect, useState } from "react";
import {
  UserRound,
  ArrowRight,
  Play,
  Heart as LucideHeart,
} from "lucide-react";
import {
  SearchIcon,
  XIcon,
  SparklesIcon,
  UsersIcon,
  HeartIcon,
  MessageCircleIcon,
  Repeat2Icon,
  TrendingUpIcon,
  CompassIcon,
  HashIcon,
  FlameIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { getErrorMessage } from "@/lib/utils";
import { updateFollowing } from "@/redux/authSlice";
import { setSelectedPost } from "@/redux/postSlice";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import CommentDialog from "@/components/comments/CommentDialog";

const SearchPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, suggestedUsers } = useSelector((store) => store.auth);

  const [activeTab, setActiveTab] = useState("explore"); // "explore" | "people"
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searchState, setSearchState] = useState({ loading: false, error: null });

  // Explore grid state
  const [explorePosts, setExplorePosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreError, setExploreError] = useState(null);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);

  // Typewriter effect: types "Explore what's trending." once on mount
  const FULL_TITLE = "Explore what's trending.";
  const [typedLength, setTypedLength] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setTypedLength(current);
      if (current >= FULL_TITLE.length) {
        clearInterval(timer);
        setTimeout(() => setTypingComplete(true), 600);
      }
    }, 45);
    return () => clearInterval(timer);
  }, []);

  useGetSuggestedUsers();

  /* ═══════════ FETCH EXPLORE FEED ═══════════ */
  useEffect(() => {
    let isMounted = true;
    setExploreLoading(true);
    setExploreError(null);

    axios
      .get(apiUrl("/api/v1/post/explore"), { withCredentials: true })
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success) {
          setExplorePosts(res.data.posts || []);
          setTrendingTags(res.data.trendingTags || []);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Explore feed fetch error:", err);
        // Fallback to /api/v1/post/all if /explore is unavailable
        axios
          .get(apiUrl("/api/v1/post/all?limit=30"), { withCredentials: true })
          .then((fallbackRes) => {
            if (!isMounted) return;
            if (fallbackRes.data?.posts) {
              setExplorePosts(fallbackRes.data.posts);
            }
          })
          .catch(() => {
            if (!isMounted) return;
            setExploreError("Could not load explore feed.");
          });
      })
      .finally(() => {
        if (isMounted) setExploreLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* ═══════════ USER SEARCH ═══════════ */
  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setSearchState({ loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearchState({ loading: true, error: null });
      try {
        const res = await axios.get(
          apiUrl(
            `/api/v1/user/search?q=${encodeURIComponent(
              normalizedQuery,
            )}&limit=20`,
          ),
          { withCredentials: true, signal: controller.signal },
        );
        setUsers(res.data.users || []);
        setSearchState({ loading: false, error: null });
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;
        setSearchState({
          loading: false,
          error: getErrorMessage(error, "Unable to search users."),
        });
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const clearSearch = () => setQuery("");

  /* ═══════════ FOLLOW / UNFOLLOW ═══════════ */
  const handleFollowToggle = async (userId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${userId}`),
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success(res.data.message);
        dispatch(updateFollowing(userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  /* ═══════════ CLICK EXPLORE POST ═══════════ */
  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    setOpenCommentDialog(true);
  };

  const isQueryActive = query.trim().length >= 2;
  const suggestedList = suggestedUsers || [];

  return (
    <main className="nv-search">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="nv-search__head">
        <span className="nv-search__eyebrow group">
          <AnimatedIcon icon={SparklesIcon} size={14} strokeWidth={2.2} />
          Explore & Discover
        </span>
        <h1 className="nv-search__title min-h-[1.25em] flex items-baseline flex-wrap">
          {typedLength <= 15 ? (
            <span>{FULL_TITLE.slice(0, typedLength)}</span>
          ) : (
            <span>
              Explore what's{" "}
              <em>{FULL_TITLE.slice(15, typedLength)}</em>
            </span>
          )}
          {!typingComplete && (
            <span className="inline-block w-[2.5px] h-[0.85em] ml-1 bg-gradient-to-b from-primary to-accent animate-pulse align-middle" />
          )}
        </h1>
        <p className="nv-search__sub">
          Discover viral posts, hot topics, and inspiring creators from across the network.
        </p>
      </header>

      {/* ═══════════ SEARCH BAR ═══════════ */}
      <div className="nv-search__bar group">
        <span className="nv-search__bar-icon">
          <AnimatedIcon icon={SearchIcon} size={16} strokeWidth={2} />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2 && activeTab !== "people") {
              setActiveTab("people");
            }
          }}
          placeholder="Search by username, full name, or topic…"
          aria-label="Search"
          className="nv-search__input"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="nv-search__clear cursor-pointer group/clear"
          >
            <AnimatedIcon icon={XIcon} size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* ═══════════ TRENDING HASHTAGS SCROLLER ═══════════ */}
      {trendingTags.length > 0 && (
        <div className="mt-4 mb-6">
          <div className="flex items-center gap-2 mb-2.5 px-1 group">
            <AnimatedIcon icon={FlameIcon} size={16} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/80">
              Trending Hashtags
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-hide">
            {trendingTags.map((item, idx) => {
              const tagName = typeof item === "string" ? item : item.tag;
              const count = typeof item === "object" ? item.count : null;
              return (
                <button
                  key={idx}
                  onClick={() => navigate(`/explore/tags/${encodeURIComponent(tagName)}`)}
                  className="
                    shrink-0 group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                    bg-[var(--surface-2)]/80 hover:bg-primary/15
                    border border-[var(--border)] hover:border-primary/40
                    text-xs font-medium text-[var(--foreground)]
                    transition-all duration-200 active:scale-95 cursor-pointer
                  "
                >
                  <AnimatedIcon icon={HashIcon} size={14} className="text-primary" />
                  <span className="font-semibold">{tagName}</span>
                  {count > 1 && (
                    <span className="text-[10px] text-[var(--muted-foreground)] px-1.5 py-0.2 rounded-full bg-[var(--surface)]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ NAVIGATION TABS ═══════════ */}
      {!isQueryActive && (
        <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer group
              ${
                activeTab === "explore"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              }
            `}
          >
            <AnimatedIcon icon={CompassIcon} size={16} />
            Explore Grid
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer group
              ${
                activeTab === "people"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              }
            `}
          >
            <AnimatedIcon icon={UsersIcon} size={16} />
            Discover People
          </button>
        </div>
      )}

      {/* ═══════════ TAB: EXPLORE GRID ═══════════ */}
      {!isQueryActive && activeTab === "explore" && (
        <section>
          {exploreLoading ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-2.5">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-[var(--surface-2)]/60 animate-pulse border border-[var(--border)]/40"
                />
              ))}
            </div>
          ) : exploreError ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[var(--danger)]">{exploreError}</p>
            </div>
          ) : explorePosts.length === 0 ? (
            <div className="nv-search__empty">
              <span className="nv-search__empty-orb">
                <AnimatedIcon icon={CompassIcon} size={20} strokeWidth={1.8} />
              </span>
              <p className="nv-search__empty-title">No explore posts yet</p>
              <p className="nv-search__empty-sub">
                Be the first to share photos and videos to the community!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3 auto-rows-fr">
              {explorePosts.map((post, idx) => {
                // Authentic Instagram Explore Grid pattern:
                // Every 10 posts, items at index 1 and 7 expand to 2x2 on md screens
                const isFeatured = (idx % 10 === 1 || idx % 10 === 7);
                const isVideo = post.mediaType === "video";
                const isRepost = !!post.repostOf;

                return (
                  <div
                    key={post._id || idx}
                    onClick={() => handlePostClick(post)}
                    className={`
                      group relative overflow-hidden rounded-xl bg-black/40 border border-white/5 cursor-pointer
                      transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40
                      ${isFeatured ? "md:col-span-2 md:row-span-2 aspect-square" : "col-span-1 row-span-1 aspect-square"}
                    `}
                  >
                    {/* Media Thumbnail */}
                    {isVideo ? (
                      <video
                        src={post.image}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.image}
                        alt={post.caption || "Explore post"}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {/* Media Type Badges (Top Right) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      {isVideo && (
                        <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white shadow-md">
                          <Play className="size-3 fill-white" />
                        </span>
                      )}
                      {isRepost && (
                        <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 shadow-md">
                          <AnimatedIcon icon={Repeat2Icon} size={12} parentSelector=".group" />
                        </span>
                      )}
                    </div>

                    {/* Instagram Hover Scrim Overlay with Stats */}
                    <div className="
                      absolute inset-0 bg-black/55 backdrop-blur-[2px]
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      flex flex-col items-center justify-center gap-3 p-3 text-white
                    ">
                      <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base font-bold drop-shadow">
                        <span className="flex items-center gap-1.5">
                          <LucideHeart size={18} fill="white" color="white" />
                          {post.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AnimatedIcon icon={MessageCircleIcon} size={18} fill="white" className="text-white" parentSelector=".group" />
                          {post.comments?.length || 0}
                        </span>
                      </div>

                      {post.author && (
                        <div className="flex items-center gap-2 max-w-[90%] truncate text-xs text-white/90">
                          <Avatar className="size-5 shrink-0 border border-white/30">
                            <AvatarImage src={post.author?.profilePicture} />
                            <AvatarFallback>{post.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">@{post.author?.username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════ TAB: DISCOVER PEOPLE / SEARCH RESULTS ═══════════ */}
      {(!isQueryActive && activeTab === "people") ? (
        <section className="nv-search__panel">
          <div className="nv-search__panel-head">
            <span className="nv-search__panel-title">
              <AnimatedIcon icon={SparklesIcon} size={14} strokeWidth={2.2} />
              Suggested for you
            </span>
            {suggestedList.length > 0 && (
              <span className="nv-search__panel-count">
                {suggestedList.length}{" "}
                {suggestedList.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {suggestedList.length === 0 ? (
            <div className="nv-search__empty">
              <span className="nv-search__empty-orb">
                <UserRound className="size-5" strokeWidth={1.8} />
              </span>
              <p className="nv-search__empty-title">No suggestions right now</p>
              <p className="nv-search__empty-sub">
                Start typing above to search for people.
              </p>
            </div>
          ) : (
            <div className="nv-search__list">
              {suggestedList.map((u, index) => {
                const isFollowing = (user?.following || []).some(
                  (id) => (id?._id || id)?.toString() === u._id?.toString(),
                );
                const initial = (u.fullName || u.username || "U")
                  .charAt(0)
                  .toUpperCase();

                return (
                  <article
                    key={u._id}
                    className="nv-user-card"
                    style={{
                      animationDelay: `${Math.min(index * 45, 350)}ms`,
                    }}
                  >
                    <Link
                      to={`/profile/${u.username || u._id}`}
                      className="nv-user-card__link"
                    >
                      <Avatar className="nv-user-card__avatar">
                        <AvatarImage
                          src={u.profilePicture}
                          alt={u.fullName || u.username}
                        />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <div className="nv-user-card__meta">
                        <p className="nv-user-card__name">
                          {u.fullName || u.username}
                        </p>
                        {u.username && (
                          <p className="nv-user-card__handle">@{u.username}</p>
                        )}
                        {u.bio && <p className="nv-user-card__bio">{u.bio}</p>}
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => handleFollowToggle(u._id, e)}
                      className={`nv-user-card__cta ${
                        isFollowing ? "is-following" : ""
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : isQueryActive ? (
        searchState.loading ? (
          <LoadingState />
        ) : searchState.error ? (
          <ErrorState message={searchState.error} />
        ) : users.length === 0 ? (
          <div className="nv-search__empty">
            <span className="nv-search__empty-orb">
              <AnimatedIcon icon={SearchIcon} size={20} strokeWidth={1.8} />
            </span>
            <p className="nv-search__empty-title">No profiles found</p>
            <p className="nv-search__empty-sub">
              Try a different username or full name.
            </p>
          </div>
        ) : (
          <section className="nv-search__panel">
            <div className="nv-search__panel-head">
              <span className="nv-search__panel-title">
                <AnimatedIcon icon={UsersIcon} size={14} strokeWidth={2.2} />
                Search Results
              </span>
              <span className="nv-search__panel-count">
                {users.length} {users.length === 1 ? "profile" : "profiles"}
              </span>
            </div>

            <div className="nv-search__list">
              {users.map((u, index) => {
                const initial = (u.fullName || u.username || "U")
                  .charAt(0)
                  .toUpperCase();
                return (
                  <Link
                    key={u._id}
                    to={`/profile/${u.username || u._id}`}
                    className="nv-user-row"
                    style={{
                      animationDelay: `${Math.min(index * 35, 300)}ms`,
                    }}
                  >
                    <Avatar className="nv-user-row__avatar">
                      <AvatarImage src={u.profilePicture} alt={u.username} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <div className="nv-user-row__meta">
                      <p className="nv-user-row__name">
                        {u.fullName || u.username}
                      </p>
                      {u.username && (
                        <p className="nv-user-row__handle">@{u.username}</p>
                      )}
                      {u.bio && <p className="nv-user-row__bio">{u.bio}</p>}
                    </div>
                    <span className="nv-user-row__arrow">
                      <ArrowRight className="size-4" strokeWidth={2.2} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )
      ) : null}

      {/* ═══════════ COMMENT DIALOG POPUP ═══════════ */}
      <CommentDialog
        open={openCommentDialog}
        setOpen={setOpenCommentDialog}
      />
    </main>
  );
};

export default SearchPage;
