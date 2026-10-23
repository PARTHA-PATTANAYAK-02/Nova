import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import Home from "@/components/feed/Home";
import Login from "@/components/auth/Login";
import MainLayout from "@/components/layout/MainLayout";
import Signup from "@/components/auth/Signup";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setSocketConnected, setSocketInstance } from "./redux/socketSlice";
import { setAuthUser, updateUserLastSeen } from "./redux/authSlice";
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
  const currentUserId = user?._id;
  const hasUser = Boolean(user);

  // Silent background session synchronization
  useEffect(() => {
    if (!currentUserId) {
      if (hasUser) dispatch(setAuthUser(null));
      return undefined;
    }

    const checkSession = () => {
      // If client is known to be offline, skip request until network is restored
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      axios
        .get(apiUrl("/api/v1/user/me"), { withCredentials: true })
        .then((response) => {
          if (!response.data?.user?._id) {
            dispatch(setAuthUser(null));
            return;
          }
          dispatch(setAuthUser(response.data.user));
        })
        .catch((error) => {
          // Only invalidate session if backend explicitly rejected with 401/404
          if (error.response?.status === 401 || error.response?.status === 404) {
            dispatch(setAuthUser(null));
          }
          // Network errors or offline failures keep cached session active
        });
    };

    checkSession();

    // Re-validate session whenever the browser regains internet connectivity
    window.addEventListener("online", checkSession);
    return () => {
      window.removeEventListener("online", checkSession);
    };
  }, [currentUserId, dispatch, hasUser]);

  // Proactive background silent refresh every 15 minutes so sessions never expire
  useEffect(() => {
    if (!currentUserId) return undefined;

    const refreshInterval = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      axios
        .post(apiUrl("/api/v1/user/refresh-token"), {}, { withCredentials: true })
        .then((res) => {
          if (res.data?.user) dispatch(setAuthUser(res.data.user));
        })
        .catch(() => {});
    }, 15 * 60 * 1000);

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
  }, [currentUserId, dispatch]);

  /* ---------- SOCKET + NOTIFICATIONS ---------- */
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    dispatch(setSelectedPost(null));
  }, [dispatch]);

  useEffect(() => {
    if (user?._id) {
      const socketio = io(API_BASE_URL, {
        query: {
          userId: user?._id,
        },
        transports: ["polling", "websocket"],
        withCredentials: true,
      });
      setSocketInstance(socketio);

      if (typeof navigator === "undefined" || navigator.onLine) {
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
      }

      socketio.on("connect", () => {
        dispatch(setSocketConnected(true));
      });

      socketio.on("disconnect", () => {
        dispatch(setSocketConnected(false));
      });

      socketio.on("getOnlineUsers", (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketio.on("userLastSeen", (data) => {
        if (data?.userId) {
          dispatch(updateUserLastSeen(data));
        }
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
  }, [user, dispatch]);

  return (
    <div className="min-h-screen">
      <NetworkStatusBanner />
      <RouterProvider router={browserRouter} />
    </div>
  );
}

export default App;
