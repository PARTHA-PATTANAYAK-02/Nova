import { Search, UserRound, X, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { ErrorState, LoadingState } from "./RequestState";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ loading: false, error: null });

  /* ---------- LOGIC (UNCHANGED) ---------- */
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
            `/api/v1/user/search?q=${encodeURIComponent(normalizedQuery)}&limit=20`,
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

  /* ---------- UI ---------- */
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:py-12 animate-fade-in">
      {/* ============ HEADER ============ */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-white/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white/70" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Discover
          </p>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          <span className="text-gradient">Find your orbit</span>
        </h1>
        <p className="mt-2 text-sm text-white/45 max-w-md">
          Search by username or full name. Every connection starts with a hello.
        </p>
      </header>

      {/* ============ SEARCH BAR ============ */}
      <div className="relative mb-8 group">
        <div className="absolute -inset-0.5 rounded-[24px] bg-gradient-to-r from-violet-500/40 to-cyan-500/40 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
        <div className="relative flex items-center glass-strong rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <Search className="absolute left-5 h-5 w-5 text-white/40 group-focus-within:text-violet-300 transition-colors pointer-events-none" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for someone..."
            className="h-14 pl-14 pr-14 bg-transparent border-0 text-white text-base placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-[24px]"
            aria-label="Search users"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ============ BODY ============ */}
      {query.trim().length < 2 ? (
        /* EMPTY STATE — before typing */
        <div className="glass rounded-[32px] py-16 px-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-25 blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
              <UserRound className="w-7 h-7 text-white/60" />
            </div>
          </div>
          <p className="font-display text-lg font-semibold text-white">
            Start with at least 2 characters
          </p>
          <p className="mt-1.5 text-sm text-white/40 max-w-xs">
            Results will appear here as you type.
          </p>
        </div>
      ) : state.loading ? (
        <LoadingState message="Searching profiles..." />
      ) : state.error ? (
        <ErrorState message={state.error} />
      ) : users.length === 0 ? (
        /* EMPTY — no results */
        <div className="glass rounded-[32px] py-16 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-white/40" />
          </div>
          <p className="font-display text-lg font-semibold text-white">
            No profiles found
          </p>
          <p className="mt-1.5 text-sm text-white/40 max-w-xs">
            Try a different username or full name.
          </p>
        </div>
      ) : (
        /* RESULTS */
        <div className="space-y-2">
          {users.map((profile, index) => (
            <Link
              key={profile._id}
              to={`/profile/${profile._id}`}
              className="group relative flex items-center gap-4 rounded-[22px] p-3.5 glass hover:bg-white/8 hover:border-white/15 transition-all duration-300 animate-slide-up opacity-0"
              style={{
                animationDelay: `${Math.min(index * 45, 350)}ms`,
                animationFillMode: "forwards",
              }}
            >
              {/* Avatar with gradient ring */}
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Avatar className="relative h-14 w-14 ring-2 ring-[#0a0a18]">
                  <AvatarImage
                    src={profile.profilePicture}
                    alt={profile.username}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-base font-semibold">
                    {profile.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display font-semibold text-base text-white group-hover:text-violet-200 transition-colors">
                  {profile.fullName || profile.username}
                </h2>
                <p className="truncate text-xs text-white/45 mt-0.5">
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p className="mt-1 truncate text-xs text-white/35">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Arrow — slides on hover */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/40 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-cyan-500 group-hover:text-white group-hover:border-transparent group-hover:shadow-[0_0_16px_rgba(124,92,255,0.5)] transition-all duration-300">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
