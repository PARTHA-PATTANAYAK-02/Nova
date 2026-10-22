import { prependMessages, setMessages } from "@/redux/chatSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { removeConversationNotifications } from "@/redux/rtnSlice";

const useGetAllMessage = () => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((store) => store.auth);
  const [state, setState] = useState({ loading: false, error: null });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAllMessage = useCallback(async () => {
    if (!selectedUser?._id) return;
    setState({ loading: true, error: null });
    try {
      const res = await axios.get(
        apiUrl(`/api/v1/message/all/${selectedUser._id}?limit=30`),
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setMessages(res.data.messages || []));
        setHasMore(Boolean(res.data.hasMore));
        await axios.patch(
          apiUrl(`/api/v1/message/read/${selectedUser._id}`),
          {},
          { withCredentials: true },
        );
        dispatch(removeConversationNotifications({ userId: selectedUser._id }));
      }
      setState({ loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        error: getErrorMessage(error, "Unable to load messages."),
      });
    }
  }, [dispatch, selectedUser]);

  const loadOlderMessages = useCallback(
    async (oldestMessageId) => {
      if (!selectedUser?._id || !oldestMessageId || loadingMore || !hasMore) {
        return false;
      }
      setLoadingMore(true);
      try {
        const res = await axios.get(
          apiUrl(
            `/api/v1/message/all/${selectedUser._id}?limit=30&before=${oldestMessageId}`,
          ),
          { withCredentials: true },
        );
        if (res.data.success && Array.isArray(res.data.messages)) {
          dispatch(prependMessages(res.data.messages));
          setHasMore(Boolean(res.data.hasMore));
          return true;
        }
        return false;
      } catch (error) {
        console.error("loadOlderMessages error:", error);
        return false;
      } finally {
        setLoadingMore(false);
      }
    },
    [dispatch, hasMore, loadingMore, selectedUser],
  );

  useEffect(() => {
    setHasMore(false);
    setLoadingMore(false);
    fetchAllMessage();
  }, [fetchAllMessage]);

  return {
    ...state,
    hasMore,
    loadingMore,
    loadOlderMessages,
    retry: fetchAllMessage,
  };
};
export default useGetAllMessage;
