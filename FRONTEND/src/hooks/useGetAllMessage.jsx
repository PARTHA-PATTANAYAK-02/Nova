import { setMessages } from "@/redux/chatSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const useGetAllMessage = () => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((store) => store.auth);
  const [state, setState] = useState({ loading: false, error: null });

  const fetchAllMessage = useCallback(async () => {
    if (!selectedUser?._id) return;
    setState({ loading: true, error: null });
    try {
      const res = await axios.get(
        apiUrl(`/api/v1/message/all/${selectedUser._id}`),
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setMessages(res.data.messages));
        await axios.patch(
          apiUrl(`/api/v1/message/read/${selectedUser._id}`),
          {},
          { withCredentials: true },
        );
      }
      setState({ loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        error: getErrorMessage(error, "Unable to load messages."),
      });
    }
  }, [dispatch, selectedUser]);

  useEffect(() => {
    fetchAllMessage();
  }, [fetchAllMessage]);

  return { ...state, retry: fetchAllMessage };
};
export default useGetAllMessage;
