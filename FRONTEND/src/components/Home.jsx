// import React, { useEffect } from "react";
// import Feed from "./Feed";
// import { Outlet } from "react-router-dom";
// import RightSidebar from "./RightSidebar";
// import useGetAllPost from "@/hooks/useGetAllPost";
// import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
// import { useLocation } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { setSelectedPost, updatePost } from "@/redux/postSlice";
// import axios from "axios";
// import { apiUrl } from "@/lib/api";

// const Home = () => {
//   const postsState = useGetAllPost();
//   useGetSuggestedUsers();
//   const location = useLocation();
//   const dispatch = useDispatch();
//   const { posts } = useSelector((store) => store.post);

//   /* ---------- LOGIC (UNCHANGED) ---------- */
//   useEffect(() => {
//     const postId = location.state?.notificationPostId;
//     if (!postId) return;

//     const cached = posts.find((item) => item._id === postId);
//     if (cached?.comments) {
//       dispatch(setSelectedPost(cached));
//       window.history.replaceState({}, document.title, window.location.pathname);
//       return;
//     }

//     let cancelled = false;
//     axios
//       .get(apiUrl(`/api/v1/post/${postId}/detail`), { withCredentials: true })
//       .then((res) => {
//         if (!cancelled && res.data.success && res.data.post) {
//           dispatch(updatePost(res.data.post));
//           dispatch(setSelectedPost(res.data.post));
//           window.history.replaceState(
//             {},
//             document.title,
//             window.location.pathname,
//           );
//         }
//       })
//       .catch(() => undefined);
//     return () => {
//       cancelled = true;
//     };
//   }, [dispatch, location.state, posts]);

//   return (
//     <div className="flex min-h-screen w-full">
//       {/* Feed column */}
//       <div className="flex-1 min-w-0">
//         <Feed requestState={postsState} />
//         <Outlet />
//       </div>

//       {/* Right sidebar — desktop only */}
//       <aside className="hidden lg:block w-[320px] xl:w-[340px] shrink-0 pr-3 py-3">
//         <div className="sticky top-3 max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
//           <RightSidebar />
//         </div>
//       </aside>
//     </div>
//   );
// };

// export default Home;

import React, { useEffect } from "react";
import Feed from "./Feed";
import { Outlet } from "react-router-dom";
import RightSidebar from "./RightSidebar";
import MobileSuggested from "./MobileSuggested";
import useGetAllPost from "@/hooks/useGetAllPost";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedPost, updatePost } from "@/redux/postSlice";
import axios from "axios";
import { apiUrl } from "@/lib/api";

const Home = () => {
  const postsState = useGetAllPost();
  useGetSuggestedUsers();
  const location = useLocation();
  const dispatch = useDispatch();
  const { posts } = useSelector((store) => store.post);

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    const postId = location.state?.notificationPostId;
    if (!postId) return;

    const cached = posts.find((item) => item._id === postId);
    if (cached?.comments) {
      dispatch(setSelectedPost(cached));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    let cancelled = false;
    axios
      .get(apiUrl(`/api/v1/post/${postId}/detail`), { withCredentials: true })
      .then((res) => {
        if (!cancelled && res.data.success && res.data.post) {
          dispatch(updatePost(res.data.post));
          dispatch(setSelectedPost(res.data.post));
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dispatch, location.state, posts]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Feed column */}
      <div className="flex-1 min-w-0">
        <Feed requestState={postsState} />

        {/* Mobile suggested users — feed er niche (story bar top e jayga free) */}
        <MobileSuggested />

        <Outlet />
      </div>

      {/* Right sidebar — desktop only */}
      <aside className="hidden lg:block w-[340px] xl:w-[380px] shrink-0 pr-4 py-4">
        <div className="sticky top-4 max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <RightSidebar />
        </div>
      </aside>
    </div>
  );
};

export default Home;
