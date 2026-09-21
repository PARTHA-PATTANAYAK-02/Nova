import { getErrorMessage } from "@/lib/utils";
import { getSocketInstance } from "@/redux/socketSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiUrl } from "@/lib/api";

const useGetConversations = () => {
  const { connected } = useSelector((store) => store.socketio);
  const [state, setState] = useState({
    conversations: [],
    loading: true,
    error: null,
  });

  const fetchConversations = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const res = await axios.get(apiUrl("/api/v1/message/conversations"), {
        withCredentials: true,
      });
      setState({
        conversations: res.data.conversations || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, "Unable to load conversations."),
      }));
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return undefined;

    socket.on("conversationUpdated", fetchConversations);
    return () => socket.off("conversationUpdated", fetchConversations);
  }, [fetchConversations, connected]);

  return { ...state, retry: fetchConversations };
};

export default useGetConversations;
