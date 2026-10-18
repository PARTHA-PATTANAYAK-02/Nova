import React, { useEffect } from "react";
import Feed from "@/components/feed/Feed";
import { Outlet, useLocation } from "react-router-dom";
import RightSidebar from "@/components/layout/RightSidebar";
import MobileSuggested from "@/components/users/MobileSuggested";
import useGetAllPost from "@/hooks/useGetAllPost";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedPost, updatePost } from "@/redux/postSlice";
import axios from "axios";
import { apiUrl } from "@/lib/api";

const Home = () => {
  const postsState = useGetAllPost();
  useGetSuggestedUsers();
  const location = useLocation();
  const dispatch = useDispatch();
  const { posts } = useSelector((s) => s.post);

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
    <div className="flex min-h-dvh w-full">
      <div className="flex-1 min-w-0">
        <Feed requestState={postsState} />
        <MobileSuggested />
        <Outlet />
      </div>

      <aside className="hidden lg:block w-[340px] xl:w-[380px] shrink-0 pr-4 py-4">
        <div className="sticky top-4 max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl bg-[var(--surface)]/60 backdrop-blur-xl border border-[var(--border)]/60 shadow-[0_12px_40px_-20px_rgba(0,0,0,.2)]">
          <RightSidebar />
        </div>
      </aside>
    </div>
  );
};

export default Home;
