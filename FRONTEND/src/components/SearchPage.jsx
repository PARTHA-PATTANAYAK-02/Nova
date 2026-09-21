// import { Search, UserRound, X, ArrowRight, Sparkles } from "lucide-react";
// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import axios from "axios";
// import { useDispatch, useSelector } from "react-redux";
// import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// import { Input } from "./ui/input";
// import { ErrorState, LoadingState } from "./RequestState";
// import { getErrorMessage } from "@/lib/utils";
// import { updateFollowing } from "@/redux/authSlice";
// import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
// import { apiUrl } from "@/lib/api";
// import { toast } from "sonner";

// const SearchPage = () => {
//   const [query, setQuery] = useState("");
//   const [users, setUsers] = useState([]);
//   const [state, setState] = useState({ loading: false, error: null });

//   const dispatch = useDispatch();
//   const { user, suggestedUsers } = useSelector((store) => store.auth);

//   useGetSuggestedUsers();

//   /* ---------- SEARCH ---------- */
//   useEffect(() => {
//     const normalizedQuery = query.trim();
//     if (normalizedQuery.length < 2) {
//       setUsers([]);
//       setState({ loading: false, error: null });
//       return undefined;
//     }

//     const controller = new AbortController();
//     const timer = setTimeout(async () => {
//       setState({ loading: true, error: null });
//       try {
//         const res = await axios.get(
//           apiUrl(
//             `/api/v1/user/search?q=${encodeURIComponent(normalizedQuery)}&limit=20`,
//           ),
//           { withCredentials: true, signal: controller.signal },
//         );
//         setUsers(res.data.users || []);
//         setState({ loading: false, error: null });
//       } catch (error) {
//         if (error.code === "ERR_CANCELED") return;
//         setState({
//           loading: false,
//           error: getErrorMessage(error, "Unable to search users."),
//         });
//       }
//     }, 350);

//     return () => {
//       clearTimeout(timer);
//       controller.abort();
//     };
//   }, [query]);

//   const clearSearch = () => setQuery("");

//   /* ---------- FOLLOW ---------- */
//   const handleFollowToggle = async (userId, e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     try {
//       const res = await axios.post(
//         apiUrl(`/api/v1/user/followorunfollow/${userId}`),
//         {},
//         { withCredentials: true },
//       );
//       if (res.data.success) {
//         toast.success(res.data.message);
//         dispatch(updateFollowing(userId));
//       }
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Something went wrong");
//     }
//   };

//   const isQueryActive = query.trim().length >= 2;
//   const suggestedList = suggestedUsers || [];

//   /* ============================================================
//      UI
//      ============================================================ */
//   return (
//     <main className="mx-auto max-w-2xl px-3 sm:px-4 py-5 animate-fade-in">
//       {/* ============ HEADER ============ */}
//       <header className="mb-5">
//         <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
//           Discover
//         </p>
//         <h1
//           className="mt-1 text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight"
//           style={{ fontFamily: "var(--font-display)" }}
//         >
//           Find your people
//         </h1>
//         <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
//           Search by username or full name.
//         </p>
//       </header>

//       {/* ============ SEARCH BAR ============ */}
//       <div className="relative mb-5">
//         <Search
//           className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
//           strokeWidth={1.8}
//         />
//         <Input
//           autoFocus
//           value={query}
//           onChange={(event) => setQuery(event.target.value)}
//           placeholder="Try a username or name..."
//           className="pl-10 pr-11 h-11"
//           aria-label="Search users"
//         />
//         {query && (
//           <button
//             type="button"
//             onClick={clearSearch}
//             aria-label="Clear search"
//             className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
//           >
//             <X className="h-3.5 w-3.5" strokeWidth={2} />
//           </button>
//         )}
//       </div>

//       {/* ============ BODY ============ */}
//       {!isQueryActive ? (
//         /* ---------- SUGGESTIONS (bounded box, internal scroll) ---------- */
//         <div>
//           {/* Header row */}
//           <div className="flex items-center justify-between mb-2.5 px-1">
//             <div className="flex items-center gap-2">
//               <Sparkles
//                 className="w-3.5 h-3.5 text-[var(--primary)]"
//                 strokeWidth={2}
//               />
//               <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
//                 Suggested for you
//               </h2>
//             </div>
//             {suggestedList.length > 0 && (
//               <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
//                 {suggestedList.length}{" "}
//                 {suggestedList.length === 1 ? "person" : "people"}
//               </span>
//             )}
//           </div>

//           {suggestedList.length === 0 ? (
//             <div className="card py-12 px-6 flex flex-col items-center justify-center text-center">
//               <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
//                 <UserRound
//                   className="w-5 h-5 text-[var(--muted-foreground)]"
//                   strokeWidth={1.8}
//                 />
//               </div>
//               <p className="font-semibold text-sm text-[var(--foreground)]">
//                 No suggestions right now
//               </p>
//               <p className="mt-1 text-xs text-[var(--muted-foreground)] max-w-xs">
//                 Start typing above to search for people.
//               </p>
//             </div>
//           ) : (
//             /* Bounded box with internal scroll */
//             <div
//               className="
//                 card p-1.5
//                 max-h-[calc(100vh-320px)]
//                 overflow-y-auto
//                 overscroll-contain
//                 [scrollbar-width:thin]
//               "
//             >
//               <div className="space-y-0.5">
//                 {suggestedList.map((suggestedUser) => {
//                   const isFollowing = user?.following?.includes(
//                     suggestedUser._id,
//                   );

//                   return (
//                     <div
//                       key={suggestedUser._id}
//                       className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
//                     >
//                       <Link
//                         to={`/profile/${suggestedUser._id}`}
//                         className="flex items-center gap-3 min-w-0 flex-1"
//                       >
//                         <Avatar className="h-11 w-11 shrink-0">
//                           <AvatarImage
//                             src={suggestedUser.profilePicture}
//                             alt={
//                               suggestedUser.fullName || suggestedUser.username
//                             }
//                           />
//                           <AvatarFallback>
//                             {(suggestedUser.fullName || suggestedUser.username)
//                               ?.charAt(0)
//                               .toUpperCase()}
//                           </AvatarFallback>
//                         </Avatar>

//                         <div className="min-w-0 flex-1">
//                           <p className="font-semibold text-sm text-[var(--foreground)] truncate leading-tight">
//                             {suggestedUser.fullName || suggestedUser.username}
//                           </p>
//                           <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
//                             @{suggestedUser.username}
//                           </p>
//                           {suggestedUser.bio && (
//                             <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-0.5 opacity-80">
//                               {suggestedUser.bio}
//                             </p>
//                           )}
//                         </div>
//                       </Link>

//                       <button
//                         onClick={(e) =>
//                           handleFollowToggle(suggestedUser._id, e)
//                         }
//                         className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95 ${
//                           isFollowing
//                             ? "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
//                             : ""
//                         }`}
//                         style={
//                           !isFollowing
//                             ? {
//                                 background: "var(--primary)",
//                                 color: "var(--primary-foreground)",
//                               }
//                             : undefined
//                         }
//                       >
//                         {isFollowing ? "Following" : "Follow"}
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}
//         </div>
//       ) : state.loading ? (
//         <LoadingState />
//       ) : state.error ? (
//         <ErrorState message={state.error} />
//       ) : users.length === 0 ? (
//         /* No results */
//         <div className="card py-12 px-6 flex flex-col items-center justify-center text-center">
//           <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
//             <Search
//               className="w-5 h-5 text-[var(--muted-foreground)]"
//               strokeWidth={1.8}
//             />
//           </div>
//           <p className="font-semibold text-sm text-[var(--foreground)]">
//             No profiles found
//           </p>
//           <p className="mt-1 text-xs text-[var(--muted-foreground)] max-w-xs">
//             Try a different username or full name.
//           </p>
//         </div>
//       ) : (
//         /* Search results */
//         <div className="space-y-1.5">
//           {users.map((profile, index) => (
//             <Link
//               key={profile._id}
//               to={`/profile/${profile._id}`}
//               className="group flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition-all animate-slide-up opacity-0"
//               style={{
//                 animationDelay: `${Math.min(index * 35, 300)}ms`,
//                 animationFillMode: "forwards",
//               }}
//             >
//               <Avatar className="h-12 w-12 shrink-0">
//                 <AvatarImage
//                   src={profile.profilePicture}
//                   alt={profile.username}
//                 />
//                 <AvatarFallback>
//                   {profile.username?.charAt(0).toUpperCase()}
//                 </AvatarFallback>
//               </Avatar>

//               <div className="min-w-0 flex-1">
//                 <p className="font-semibold text-sm text-[var(--foreground)] truncate leading-tight">
//                   {profile.fullName || profile.username}
//                 </p>
//                 <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
//                   @{profile.username}
//                 </p>
//                 {profile.bio && (
//                   <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-1 opacity-80">
//                     {profile.bio}
//                   </p>
//                 )}
//               </div>

//               <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)] transition-colors">
//                 <ArrowRight
//                   className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
//                   strokeWidth={2}
//                 />
//               </div>
//             </Link>
//           ))}
//         </div>
//       )}
//     </main>
//   );
// };

// export default SearchPage;

import { Search, UserRound, X, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { ErrorState, LoadingState } from "./RequestState";
import { getErrorMessage } from "@/lib/utils";
import { updateFollowing } from "@/redux/authSlice";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({
    loading: false,
    error: null,
  });

  const dispatch = useDispatch();
  const { user, suggestedUsers } = useSelector((store) => store.auth);

  useGetSuggestedUsers();

  /* ---------- SEARCH ---------- */
  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setState({
        loading: false,
        error: null,
      });
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState({
        loading: true,
        error: null,
      });

      try {
        const res = await axios.get(
          apiUrl(
            `/api/v1/user/search?q=${encodeURIComponent(
              normalizedQuery,
            )}&limit=20`,
          ),
          {
            withCredentials: true,
            signal: controller.signal,
          },
        );

        setUsers(res.data.users || []);

        setState({
          loading: false,
          error: null,
        });
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
        {
          withCredentials: true,
        },
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

  /* ============================================================
     UI
     ============================================================ */
  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 py-5 animate-fade-in">
      {/* ============ HEADER ============ */}
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Discover
        </p>

        <h1
          className="mt-1 text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Find your people
        </h1>

        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Search by username or full name.
        </p>
      </header>

      {/* ============ SEARCH BAR ============ */}
      <div className="relative mb-5">
        <Search
          className="
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
            h-4
            w-4
            text-[var(--muted-foreground)]
            pointer-events-none
          "
          strokeWidth={1.8}
        />

        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try a username or name..."
          className="pl-10 pr-11 h-11"
          aria-label="Search users"
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="
              absolute
              right-2.5
              top-1/2
              -translate-y-1/2
              w-7
              h-7
              rounded-full
              flex
              items-center
              justify-center
              text-[var(--muted-foreground)]
              hover:text-[var(--foreground)]
              hover:bg-[var(--surface-2)]
              transition-colors
            "
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ============ BODY ============ */}
      {!isQueryActive ? (
        /* ---------- SUGGESTIONS ---------- */
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <Sparkles
                className="w-3.5 h-3.5 text-[var(--primary)]"
                strokeWidth={2}
              />

              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Suggested for you
              </h2>
            </div>

            {suggestedList.length > 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                {suggestedList.length}{" "}
                {suggestedList.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {suggestedList.length === 0 ? (
            <div className="card py-12 px-6 flex flex-col items-center justify-center text-center">
              <div
                className="
                  w-12
                  h-12
                  rounded-full
                  bg-[var(--surface-2)]
                  flex
                  items-center
                  justify-center
                  mb-3
                "
              >
                <UserRound
                  className="w-5 h-5 text-[var(--muted-foreground)]"
                  strokeWidth={1.8}
                />
              </div>

              <p className="font-semibold text-sm text-[var(--foreground)]">
                No suggestions right now
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)] max-w-xs">
                Start typing above to search for people.
              </p>
            </div>
          ) : (
            /* =====================================================
               SUGGESTED USERS BOX
               ~4 USERS VISIBLE
               ===================================================== */
            <div
              className="
                rounded-2xl
                border
                border-[var(--border)]
                bg-[var(--surface)]
                p-2
                shadow-[var(--shadow-sm)]

                h-[300px]
                sm:h-[300px]

                overflow-y-auto
                overscroll-contain

                [scrollbar-width:thin]
                [scrollbar-color:var(--border-strong)_transparent]
              "
            >
              <div className="space-y-2">
                {suggestedList.map((suggestedUser, index) => {
                  const isFollowing = user?.following?.includes(
                    suggestedUser._id,
                  );

                  return (
                    <div
                      key={suggestedUser._id}
                      className="
                        group
                        flex
                        items-center
                        gap-3
                        min-h-[84px]
                        p-3
                        rounded-xl

                        bg-[var(--surface)]

                        border
                        border-[var(--border)]

                        hover:border-[var(--border-strong)]
                        hover:bg-[var(--surface-2)]
                        hover:-translate-y-[1px]

                        transition-all
                        duration-200

                        animate-slide-up
                        opacity-0
                      "
                      style={{
                        animationDelay: `${Math.min(index * 45, 350)}ms`,
                        animationFillMode: "forwards",
                      }}
                    >
                      {/* USER PROFILE */}
                      <Link
                        to={`/profile/${suggestedUser._id}`}
                        className="
                          flex
                          items-center
                          gap-3
                          min-w-0
                          flex-1
                        "
                      >
                        {/* Avatar */}
                        <Avatar
                          className="
                            h-12
                            w-12
                            shrink-0
                            border
                            border-[var(--border)]
                          "
                        >
                          <AvatarImage
                            src={suggestedUser.profilePicture}
                            alt={
                              suggestedUser.fullName || suggestedUser.username
                            }
                          />

                          <AvatarFallback>
                            {(suggestedUser.fullName || suggestedUser.username)
                              ?.charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* User info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className="
                              font-semibold
                              text-sm
                              text-[var(--foreground)]
                              truncate
                              leading-tight
                            "
                          >
                            {suggestedUser.fullName || suggestedUser.username}
                          </p>

                          <p
                            className="
                              text-xs
                              text-[var(--muted-foreground)]
                              truncate
                              leading-tight
                              mt-0.5
                            "
                          >
                            @{suggestedUser.username}
                          </p>

                          {suggestedUser.bio && (
                            <p
                              className="
                                text-xs
                                text-[var(--muted-foreground)]
                                truncate
                                leading-tight
                                mt-1
                                opacity-80
                              "
                            >
                              {suggestedUser.bio}
                            </p>
                          )}
                        </div>
                      </Link>

                      {/* FOLLOW BUTTON */}
                      <button
                        onClick={(e) =>
                          handleFollowToggle(suggestedUser._id, e)
                        }
                        className={`
                          shrink-0
                          min-w-[94px]
                          text-xs
                          font-semibold
                          px-4
                          py-2
                          rounded-full
                          transition-all
                          duration-200
                          active:scale-95

                          ${
                            isFollowing
                              ? `
                                border
                                border-[var(--border-strong)]
                                text-[var(--foreground)]
                                hover:bg-[var(--surface-2)]
                              `
                              : ""
                          }
                        `}
                        style={
                          !isFollowing
                            ? {
                                background: "var(--primary)",
                                color: "var(--primary-foreground)",
                              }
                            : undefined
                        }
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} />
      ) : users.length === 0 ? (
        /* ---------- NO RESULTS ---------- */
        <div className="card py-12 px-6 flex flex-col items-center justify-center text-center">
          <div
            className="
              w-12
              h-12
              rounded-full
              bg-[var(--surface-2)]
              flex
              items-center
              justify-center
              mb-3
            "
          >
            <Search
              className="w-5 h-5 text-[var(--muted-foreground)]"
              strokeWidth={1.8}
            />
          </div>

          <p className="font-semibold text-sm text-[var(--foreground)]">
            No profiles found
          </p>

          <p className="mt-1 text-xs text-[var(--muted-foreground)] max-w-xs">
            Try a different username or full name.
          </p>
        </div>
      ) : (
        /* ---------- SEARCH RESULTS ---------- */
        <div className="space-y-1.5">
          {users.map((profile, index) => (
            <Link
              key={profile._id}
              to={`/profile/${profile._id}`}
              className="
                group
                flex
                items-center
                gap-3
                p-2.5
                rounded-xl
                bg-[var(--surface)]
                border
                border-[var(--border)]
                hover:border-[var(--border-strong)]
                hover:bg-[var(--surface-2)]
                transition-all
                animate-slide-up
                opacity-0
              "
              style={{
                animationDelay: `${Math.min(index * 35, 300)}ms`,
                animationFillMode: "forwards",
              }}
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage
                  src={profile.profilePicture}
                  alt={profile.username}
                />

                <AvatarFallback>
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-[var(--foreground)] truncate leading-tight">
                  {profile.fullName || profile.username}
                </p>

                <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
                  @{profile.username}
                </p>

                {profile.bio && (
                  <p className="text-xs text-[var(--muted-foreground)] truncate leading-tight mt-1 opacity-80">
                    {profile.bio}
                  </p>
                )}
              </div>

              <div
                className="
                  shrink-0
                  w-8
                  h-8
                  rounded-full
                  flex
                  items-center
                  justify-center
                  text-[var(--muted-foreground)]
                  group-hover:bg-[var(--primary)]
                  group-hover:text-[var(--primary-foreground)]
                  transition-colors
                "
              >
                <ArrowRight
                  className="
                    w-4
                    h-4
                    group-hover:translate-x-0.5
                    transition-transform
                  "
                  strokeWidth={2}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
