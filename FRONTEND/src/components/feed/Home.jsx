import React, { useEffect, useRef } from "react";
import Feed from "@/components/feed/Feed";
import { Outlet, useLocation } from "react-router-dom";
import RightSidebar from "@/components/layout/RightSidebar";
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
      <div className="flex-1 min-w-0 lg:pr-[364px] xl:pr-[408px]">
        <Feed requestState={postsState} />
        <Outlet />
      </div>

      <aside className="hidden lg:block fixed right-3 xl:right-4 top-3 bottom-3 z-30 w-[340px] xl:w-[380px] pointer-events-none">
        <div className="max-h-full overflow-y-auto pr-1 scrollbar-none overscroll-y-auto pointer-events-auto">
          <RightSidebar />
        </div>
      </aside>
    </div>
  );
};

export default Home;
