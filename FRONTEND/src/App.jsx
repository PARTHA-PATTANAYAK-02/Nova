import { useEffect, useRef, useState } from "react";
import ChatPage from "@/components/chat/ChatPage";
import EditProfile from "@/components/profile/EditProfile";
import AccountSecurity from "@/components/profile/AccountSecurity";
import ForgotPassword from "@/components/auth/ForgotPassword";
import Home from "@/components/feed/Home";
import Login from "@/components/auth/Login";
import MainLayout from "@/components/layout/MainLayout";
import Profile from "@/components/profile/Profile";
import Signup from "@/components/auth/Signup";
import SearchPage from "@/components/search/SearchPage";
import NotFound from "@/components/common/NotFound";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setSocketConnected, setSocketInstance } from "./redux/socketSlice";
import { setAuthUser } from "./redux/authSlice";
import { appendMessage, setOnlineUsers } from "./redux/chatSlice";
import {
  removeNotification,
  setLikeNotification,
  setNotifications,
} from "./redux/rtnSlice";
import axios from "axios";
import { removePost, setSelectedPost, updatePost } from "./redux/postSlice";
import ProtectedRoutes from "@/components/common/ProtectedRoutes";
import { API_BASE_URL, apiUrl } from "./lib/api";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoutes>
        <MainLayout />
      </ProtectedRoutes>
    ),
    children: [
      {
        path: "/",
        element: (
          <ProtectedRoutes>
            <Home />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/profile/:id",
        element: (
          <ProtectedRoutes>
            <Profile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/edit",
        element: (
          <ProtectedRoutes>
            <EditProfile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/security",
        element: (
          <ProtectedRoutes>
            <AccountSecurity />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/chat",
        element: (
          <ProtectedRoutes>
            <ChatPage />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/search",
        element: (
          <ProtectedRoutes>
            <SearchPage />
          </ProtectedRoutes>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/welcome/setup",
    element: (
      <ProtectedRoutes>
        <ProfileSetup />
      </ProtectedRoutes>
    ),
  },
  {
    path: "/welcome",
    element: (
      <ProtectedRoutes>
        <WelcomeScreen />
      </ProtectedRoutes>
    ),
  },
  /* ---------- CATCH-ALL 404 ---------- */
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  const { user, selectedUser } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const selectedUserRef = useRef(selectedUser);
  const [sessionState, setSessionState] = useState({
    userId: null,
    status: "checking",
  });
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const currentUserId = user?._id;
  const hasUser = Boolean(user);
  const sessionVerified =
    !hasUser ||
    (Boolean(currentUserId) &&
      sessionState.userId === currentUserId &&
      sessionState.status === "ready");

  useEffect(() => {
    if (!currentUserId) {
      if (hasUser) dispatch(setAuthUser(null));
      setSessionState({ userId: null, status: "ready" });
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const userId = currentUserId;
    setSessionState({ userId, status: "checking" });

    axios
      .get(apiUrl("/api/v1/user/me"), {
        withCredentials: true,
        signal: controller.signal,
      })
      .then((response) => {
        if (!active) return;
        if (!response.data?.user?._id) {
          dispatch(setAuthUser(null));
          setSessionState({ userId: null, status: "ready" });
          return;
        }
        dispatch(setAuthUser(response.data.user));
        setSessionState({ userId, status: "ready" });
      })
      .catch((error) => {
        if (!active || axios.isCancel(error)) return;
        if (error.response?.status === 401 || error.response?.status === 404) {
          dispatch(setAuthUser(null));
          setSessionState({ userId: null, status: "ready" });
          return;
        }
        setSessionState({ userId, status: "error" });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [currentUserId, dispatch, hasUser, sessionAttempt]);

  useEffect(() => {
    if (!currentUserId || !sessionVerified) return undefined;

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message?.toLowerCase();
        const isExpiredSession =
          error.response?.status === 401 &&
          (message === "user not authenticated" ||
            message === "invalid" ||
            message === "invalid or expired authentication token" ||
            message?.includes("session is no longer valid"));

        if (isExpiredSession) dispatch(setAuthUser(null));
        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, [currentUserId, dispatch, sessionVerified]);

  /* ---------- SOCKET + NOTIFICATIONS ---------- */
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    dispatch(setSelectedPost(null));
  }, [dispatch]);

  useEffect(() => {
    if (user?._id && sessionVerified) {
      const socketio = io(API_BASE_URL, {
        query: {
          userId: user?._id,
        },
        transports: ["polling", "websocket"],
        withCredentials: true,
      });
      setSocketInstance(socketio);

      axios
        .get(apiUrl("/api/v1/user/notifications"), { withCredentials: true })
        .then((response) => {
          if (response.data.success) {
            dispatch(
              setNotifications({ notifications: response.data.notifications }),
            );
          }
        })
        .catch(() => undefined);

      socketio.on("connect", () => {
        dispatch(setSocketConnected(true));
      });

      socketio.on("disconnect", () => {
        dispatch(setSocketConnected(false));
      });

      socketio.on("getOnlineUsers", (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketio.on("newMessage", (message) => {
        dispatch(appendMessage(message));
      });

      socketio.on("notification", (notification) => {
        const isOpenConversationMessage =
          notification.type === "message" &&
          window.location.pathname === "/chat" &&
          selectedUserRef.current?._id === notification.userId;

        if (isOpenConversationMessage) {
          dispatch(
            removeNotification(notification.notificationId || notification._id),
          );
          axios
            .patch(
              apiUrl(`/api/v1/message/read/${notification.userId}`),
              {},
              { withCredentials: true },
            )
            .catch((error) => {
              console.error(
                "Unable to clear an active-chat notification:",
                error,
              );
            });
          return;
        }
        dispatch(setLikeNotification(notification));
      });

      socketio.on("postUpdated", (post) => {
        if (post?._id) dispatch(updatePost(post));
      });

      socketio.on("postDeleted", (postId) => {
        if (postId) dispatch(removePost(postId));
      });

      socketio.on("accountDeleted", ({ postIds = [] } = {}) => {
        postIds.forEach((postId) => dispatch(removePost(postId)));
      });

      return () => {
        socketio.close();
        setSocketInstance(null);
        dispatch(setSocketConnected(false));
      };
    }
  }, [user, dispatch, sessionVerified]);

  if (user && !sessionVerified) {
    if (
      !currentUserId ||
      sessionState.userId !== currentUserId ||
      sessionState.status === "checking"
    ) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Verifying your Nova session…
          </p>
        </main>
      );
    }

    if (sessionState.status === "error") {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-5 text-center">
          <p className="max-w-md text-sm text-[var(--muted-foreground)]">
            We couldn't verify your session because Nova's server could not be
            reached. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setSessionAttempt((attempt) => attempt + 1)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Try again
          </button>
        </main>
      );
    }
  }

  return (
    <div className="min-h-screen">
      <RouterProvider router={browserRouter} />
    </div>
  );
}

export default App;
