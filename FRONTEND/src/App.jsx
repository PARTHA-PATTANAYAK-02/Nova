import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import Home from "@/components/feed/Home";
import Login from "@/components/auth/Login";
import MainLayout from "@/components/layout/MainLayout";
import Signup from "@/components/auth/Signup";
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
import { appendPost, removePost, setSelectedPost, updatePost } from "./redux/postSlice";
import ProtectedRoutes from "@/components/common/ProtectedRoutes";
import { API_BASE_URL, apiUrl } from "./lib/api";
import { playMessageSound, playReactionSound } from "./lib/sound";
import NetworkStatusBanner from "@/components/common/NetworkStatusBanner";

// Code-split route components for optimized bundle size & fast initial paint
const ChatPage = lazy(() => import("@/components/chat/ChatPage"));
const Profile = lazy(() => import("@/components/profile/Profile"));
const EditProfile = lazy(() => import("@/components/profile/EditProfile"));
const AccountSecurity = lazy(() => import("@/components/profile/AccountSecurity"));
const SearchPage = lazy(() => import("@/components/search/SearchPage"));
const ForgotPassword = lazy(() => import("@/components/auth/ForgotPassword"));
const NotFound = lazy(() => import("@/components/common/NotFound"));
const ProfileSetup = lazy(() => import("@/components/onboarding/ProfileSetup"));
const WelcomeScreen = lazy(() => import("@/components/onboarding/WelcomeScreen"));

const RouteSuspense = ({ children }) => (
  <Suspense
    fallback={
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
);

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
            <RouteSuspense>
              <Profile />
            </RouteSuspense>
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/edit",
        element: (
          <ProtectedRoutes>
            <RouteSuspense>
              <EditProfile />
            </RouteSuspense>
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/security",
        element: (
          <ProtectedRoutes>
            <RouteSuspense>
              <AccountSecurity />
            </RouteSuspense>
          </ProtectedRoutes>
        ),
      },
      {
        path: "/chat",
        element: (
          <ProtectedRoutes>
            <RouteSuspense>
              <ChatPage />
            </RouteSuspense>
          </ProtectedRoutes>
        ),
      },
      {
        path: "/search",
        element: (
          <ProtectedRoutes>
            <RouteSuspense>
              <SearchPage />
            </RouteSuspense>
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
    element: (
      <RouteSuspense>
        <ForgotPassword />
      </RouteSuspense>
    ),
  },
  {
    path: "/welcome/setup",
    element: (
      <ProtectedRoutes>
        <RouteSuspense>
          <ProfileSetup />
        </RouteSuspense>
      </ProtectedRoutes>
    ),
  },
  {
    path: "/welcome",
    element: (
      <ProtectedRoutes>
        <RouteSuspense>
          <WelcomeScreen />
        </RouteSuspense>
      </ProtectedRoutes>
    ),
  },
  /* ---------- CATCH-ALL 404 ---------- */
  {
    path: "*",
    element: (
      <RouteSuspense>
        <NotFound />
      </RouteSuspense>
    ),
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

    // Proactive background silent refresh every 15 minutes so sessions never expire
    const refreshInterval = setInterval(() => {
      axios
        .post(apiUrl("/api/v1/user/refresh-token"), {}, { withCredentials: true })
        .then((res) => {
          if (res.data?.user) dispatch(setAuthUser(res.data.user));
        })
        .catch(() => {
          // If refresh fails, normal interceptors will handle subsequent expired calls
        });
    }, 15 * 60 * 1000);

    // Only clear auth user if the refresh token endpoint itself failed with 401
    // or if a retried request still returned 401
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isRefreshUrl = error.config?.url?.includes("/api/v1/user/refresh-token");
        const isFinal401 = error.response?.status === 401 && (isRefreshUrl || error.config?._retry);

        if (isFinal401) {
          dispatch(setAuthUser(null));
        }
        return Promise.reject(error);
      },
    );

    return () => {
      clearInterval(refreshInterval);
      axios.interceptors.response.eject(interceptorId);
    };
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
        const activeUserId = selectedUserRef.current?._id;
        const belongsToActiveChat =
          activeUserId &&
          (message.senderId === activeUserId || message.receiverId === activeUserId);

        if (belongsToActiveChat) {
          dispatch(appendMessage(message));
        }
        if (message.senderId !== user?._id) {
          playMessageSound();
        }
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

      socketio.on("newPost", (newPost) => {
        if (newPost?._id) dispatch(appendPost(newPost));
      });

      socketio.on("postUpdated", (post) => {
        if (post?._id) dispatch(updatePost(post));
      });

      socketio.on("messageReactionUpdated", (update) => {
        const otherId =
          update?.senderId === user?._id
            ? update?.receiverId
            : update?.senderId;
        const isCurrentChatOpen =
          window.location.pathname === "/chat" &&
          selectedUserRef.current?._id === otherId;

        if (
          !isCurrentChatOpen &&
          update?.actorId &&
          update.actorId !== user?._id &&
          update?.emoji
        ) {
          playReactionSound();
        }
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
        <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Verifying your Nova session…
          </p>
        </main>
      );
    }

    if (sessionState.status === "error") {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-5 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            We couldn't verify your session because Nova's server could not be
            reached. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setSessionAttempt((attempt) => attempt + 1)}
            className="btn-base bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow-sm"
          >
            Try again
          </button>
        </main>
      );
    }
  }

  return (
    <div className="min-h-screen">
      <NetworkStatusBanner />
      <RouterProvider router={browserRouter} />
    </div>
  );
}

export default App;
