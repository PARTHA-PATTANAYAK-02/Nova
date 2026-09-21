import React, { useEffect } from "react";
import Feed from "./Feed";
import { Outlet } from "react-router-dom";
import RightSidebar from "./RightSidebar";
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
      {/* Feed Column */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        <Feed requestState={postsState} />
        <Outlet />
      </div>

      {/* Right Sidebar — glass panel, desktop only */}
      <aside className="hidden lg:block w-[340px] shrink-0 p-4 pl-0">
        <div className="sticky top-4 h-[calc(100vh-2rem)] glass rounded-[28px] overflow-y-auto shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <RightSidebar />
        </div>
      </aside>
    </div>
  );
};

export default Home;
