import { setUserProfile } from "@/redux/authSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const useGetUserProfile = (userId) => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ loading: true, error: null });

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    setState({ loading: true, error: null });
    try {
      const res = await axios.get(apiUrl(`/api/v1/user/${userId}/profile`), {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUserProfile(res.data.user));
      }
      setState({ loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        error: getErrorMessage(error, "Unable to load this profile."),
      });
    }
  }, [dispatch, userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return { ...state, retry: fetchUserProfile };
};
export default useGetUserProfile;
