import { setUserProfile } from "@/redux/authSlice";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const useGetUserProfile = (userId) => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ loading: true, error: null, notFound: false });

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    setState({ loading: true, error: null, notFound: false });
    try {
      const res = await axios.get(apiUrl(`/api/v1/user/${userId}/profile`), {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUserProfile(res.data.user));
      }
      setState({ loading: false, error: null, notFound: false });
    } catch (error) {
      const is404 = error.response?.status === 404;
      setState({
        loading: false,
        notFound: is404,
        error: is404 ? "User not found" : getErrorMessage(error, "Unable to load this profile."),
      });
    }
  }, [dispatch, userId]);

  useEffect(() => {
    let isCurrent = true;
    if (!userId) return;

    setState({ loading: true, error: null, notFound: false });

    axios
      .get(apiUrl(`/api/v1/user/${userId}/profile`), {
        withCredentials: true,
      })
      .then((res) => {
        if (!isCurrent) return;
        if (res.data?.success) {
          dispatch(setUserProfile(res.data.user));
        }
        setState({ loading: false, error: null, notFound: false });
      })
      .catch((error) => {
        if (!isCurrent) return;
        const is404 = error.response?.status === 404;
        setState({
          loading: false,
          notFound: is404,
          error: is404 ? "User not found" : getErrorMessage(error, "Unable to load this profile."),
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [dispatch, userId]);

  return { ...state, retry: fetchUserProfile };
};
export default useGetUserProfile;
