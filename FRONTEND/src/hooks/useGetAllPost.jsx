import { appendPosts, setPosts } from "@/redux/postSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const useGetAllPost = () => {
  const dispatch = useDispatch();
  const [state, setState] = useState({
    loading: true,
    loadingMore: false,
    error: null,
    page: 0,
    hasMore: true,
  });

  const fetchAllPost = useCallback(
    async (nextPage = 1) => {
      setState((current) => ({
        ...current,
        ...(nextPage === 1 ? { loading: true } : { loadingMore: true }),
        error: null,
      }));
      try {
        const res = await axios.get(
          apiUrl(`/api/v1/post/all?page=${nextPage}&limit=10`),
          { withCredentials: true },
        );
        if (res.data.success) {
          if (nextPage === 1) dispatch(setPosts(res.data.posts));
          else dispatch(appendPosts(res.data.posts));
        }
        setState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error: null,
          page: nextPage,
          hasMore: res.data.hasMore,
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error: getErrorMessage(error, "Unable to load posts."),
        }));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    fetchAllPost();
  }, [fetchAllPost]);

  return {
    ...state,
    retry: () => fetchAllPost(1),
    loadMore: () => {
      if (!state.loading && !state.loadingMore && state.hasMore) {
        fetchAllPost(state.page + 1);
      }
    },
  };
};
export default useGetAllPost;
