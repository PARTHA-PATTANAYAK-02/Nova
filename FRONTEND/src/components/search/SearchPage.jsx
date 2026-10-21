import {
  Search,
  UserRound,
  X,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { getErrorMessage } from "@/lib/utils";
import { updateFollowing } from "@/redux/authSlice";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ loading: false, error: null });

  const dispatch = useDispatch();
  const { user, suggestedUsers } = useSelector((store) => store.auth);

  useGetSuggestedUsers();

  /* ---------- SEARCH ---------- */
  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setState({ loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState({ loading: true, error: null });
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
        setState({ loading: false, error: null });
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;
        setState({
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

  /* ---------- FOLLOW ---------- */
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

  const isQueryActive = query.trim().length >= 2;
  const suggestedList = suggestedUsers || [];

  return (
    <main className="nv-search">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="nv-search__head">
        <span className="nv-search__eyebrow">
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          Discover
        </span>
        <h1 className="nv-search__title">
          Find your <em>people.</em>
        </h1>
        <p className="nv-search__sub">
          Search by username or full name — follow the ones that matter.
        </p>
      </header>

      {/* ═══════════ SEARCH BAR ═══════════ */}
      <div className="nv-search__bar">
        <span className="nv-search__bar-icon">
          <Search className="size-4" strokeWidth={2} />
        </span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try a username or name…"
          aria-label="Search users"
          className="nv-search__input"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="nv-search__clear"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* ═══════════ BODY ═══════════ */}
      {!isQueryActive ? (
        <section className="nv-search__panel">
          <div className="nv-search__panel-head">
            <span className="nv-search__panel-title">
              <Sparkles className="size-3.5" strokeWidth={2.2} />
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
                      to={`/profile/${u._id}`}
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
      ) : state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} />
      ) : users.length === 0 ? (
        <div className="nv-search__empty">
          <span className="nv-search__empty-orb">
            <Search className="size-5" strokeWidth={1.8} />
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
              <Users className="size-3.5" strokeWidth={2.2} />
              Results
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
                  to={`/profile/${u._id}`}
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
      )}
    </main>
  );
};

export default SearchPage;
