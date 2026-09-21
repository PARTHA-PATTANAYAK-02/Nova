import { setSuggestedUsers } from "@/redux/authSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const useGetSuggestedUsers = () => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ loading: true, error: null });

  const fetchSuggestedUsers = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const res = await axios.get(apiUrl("/api/v1/user/suggested"), {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setSuggestedUsers(res.data.users));
      }
      setState({ loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        error: getErrorMessage(error, "Unable to load suggested users."),
      });
    }
  }, [dispatch]);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  return { ...state, retry: fetchSuggestedUsers };
};
export default useGetSuggestedUsers;
