// import { useEffect, useRef } from "react";
// import ChatPage from "./components/ChatPage";
// import EditProfile from "./components/EditProfile";
// import Home from "./components/Home";
// import Login from "./components/Login";
// import MainLayout from "./components/MainLayout";
// import Profile from "./components/Profile";
// import Signup from "./components/Signup";
// import SearchPage from "./components/SearchPage";
// import { createBrowserRouter, RouterProvider } from "react-router-dom";
// import { io } from "socket.io-client";
// import { useDispatch, useSelector } from "react-redux";
// import { setSocketConnected, setSocketInstance } from "./redux/socketSlice";
// import { appendMessage, setOnlineUsers } from "./redux/chatSlice";
// import { setLikeNotification } from "./redux/rtnSlice";
// import { setNotifications } from "./redux/rtnSlice";
// import axios from "axios";
// import { removePost, setSelectedPost, updatePost } from "./redux/postSlice";
// import ProtectedRoutes from "./components/ProtectedRoutes";
// import { Toaster } from "react-hot-toast";
// import { useTheme } from "./hooks/useTheme";
// import { API_BASE_URL, apiUrl } from "./lib/api";

// const browserRouter = createBrowserRouter([
//   {
//     path: "/",
//     element: (
//       <ProtectedRoutes>
//         <MainLayout />
//       </ProtectedRoutes>
//     ),
//     children: [
//       {
//         path: "/",
//         element: (
//           <ProtectedRoutes>
//             <Home />
//           </ProtectedRoutes>
//         ),
//       },
//       {
//         path: "/profile/:id",
//         element: (
//           <ProtectedRoutes>
//             <Profile />
//           </ProtectedRoutes>
//         ),
//       },
//       {
//         path: "/account/edit",
//         element: (
//           <ProtectedRoutes>
//             <EditProfile />
//           </ProtectedRoutes>
//         ),
//       },
//       {
//         path: "/chat",
//         element: (
//           <ProtectedRoutes>
//             <ChatPage />
//           </ProtectedRoutes>
//         ),
//       },
//       {
//         path: "/search",
//         element: (
//           <ProtectedRoutes>
//             <SearchPage />
//           </ProtectedRoutes>
//         ),
//       },
//     ],
//   },
//   {
//     path: "/login",
//     element: <Login />,
//   },
//   {
//     path: "/signup",
//     element: <Signup />,
//   },
// ]);

// function App() {
//   const { user, selectedUser } = useSelector((store) => store.auth);
//   const dispatch = useDispatch();
//   const { dark } = useTheme();
//   const selectedUserRef = useRef(selectedUser);

//   useEffect(() => {
//     selectedUserRef.current = selectedUser;
//   }, [selectedUser]);

//   useEffect(() => {
//     dispatch(setSelectedPost(null));
//   }, [dispatch]);

//   useEffect(() => {
//     if (user) {
//       const socketio = io(API_BASE_URL, {
//         query: {
//           userId: user?._id,
//         },
//         transports: ["polling", "websocket"],
//         withCredentials: true,
//       });
//       setSocketInstance(socketio);

//       axios
//         .get(apiUrl("/api/v1/user/notifications"), { withCredentials: true })
//         .then((response) => {
//           if (response.data.success) {
//             dispatch(
//               setNotifications({ notifications: response.data.notifications }),
//             );
//           }
//         })
//         .catch(() => undefined);

//       socketio.on("connect", () => {
//         dispatch(setSocketConnected(true));
//       });

//       socketio.on("disconnect", () => {
//         dispatch(setSocketConnected(false));
//       });

//       // listen all the events
//       socketio.on("getOnlineUsers", (onlineUsers) => {
//         dispatch(setOnlineUsers(onlineUsers));
//       });

//       socketio.on("newMessage", (message) => {
//         dispatch(appendMessage(message));
//       });

//       socketio.on("notification", (notification) => {
//         const isOpenConversationMessage =
//           notification.type === "message" &&
//           window.location.pathname === "/chat" &&
//           selectedUserRef.current?._id === notification.userId;

//         if (isOpenConversationMessage) return;
//         dispatch(setLikeNotification(notification));
//       });

//       // Realtime post updates (likes, comments, new posts) from any user.
//       socketio.on("postUpdated", (post) => {
//         if (post?._id) dispatch(updatePost(post));
//       });

//       socketio.on("postDeleted", (postId) => {
//         if (postId) dispatch(removePost(postId));
//       });

//       return () => {
//         socketio.close();
//         setSocketInstance(null);
//         dispatch(setSocketConnected(false));
//       };
//     }
//   }, [user, dispatch]);

//   return (
//     <div className={dark ? "dark min-h-screen" : "min-h-screen"}>
//       {/* Notification Toaster */}
//       <Toaster
//         position="top-center"
//         toastOptions={{
//           className:
//             "glass-strong text-sm font-medium !rounded-2xl !text-white !border-white/10",
//           style: {
//             background: "rgba(20, 20, 35, 0.75)",
//             backdropFilter: "blur(20px)",
//             color: "#fff",
//           },
//           success: {
//             iconTheme: { primary: "#7C5CFF", secondary: "#0B0B18" },
//           },
//           error: {
//             iconTheme: { primary: "#FF4D6D", secondary: "#0B0B18" },
//           },
//         }}
//       />

//       {/* Main App Content */}
//       <RouterProvider router={browserRouter} />

//       {/* Socket Connection Status Indicator */}
//       {/* {user && (
//         <div className="fixed bottom-4 right-4 z-50">
//           <div
//             className={`w-3 h-3 rounded-full shadow-md ${
//               socket ? "bg-green-500" : "bg-red-500"
//             }`}
//             title={socket ? "Connected to server" : "Disconnected from server"}
//           />
//         </div>
//       )} */}
//     </div>
//   );
// }

// export default App;

import { useEffect, useRef } from "react";
import ChatPage from "./components/ChatPage";
import EditProfile from "./components/EditProfile";
import Home from "./components/Home";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout";
import Profile from "./components/Profile";
import Signup from "./components/Signup";
import SearchPage from "./components/SearchPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setSocketConnected, setSocketInstance } from "./redux/socketSlice";
import { appendMessage, setOnlineUsers } from "./redux/chatSlice";
import { setLikeNotification, setNotifications } from "./redux/rtnSlice";
import axios from "axios";
import { removePost, setSelectedPost, updatePost } from "./redux/postSlice";
import ProtectedRoutes from "./components/ProtectedRoutes";
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
]);

function App() {
  const { user, selectedUser } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const selectedUserRef = useRef(selectedUser);

  /* ---------- SOCKET + NOTIFICATIONS (UNCHANGED) ---------- */
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    dispatch(setSelectedPost(null));
  }, [dispatch]);

  useEffect(() => {
    if (user) {
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

        if (isOpenConversationMessage) return;
        dispatch(setLikeNotification(notification));
      });

      socketio.on("postUpdated", (post) => {
        if (post?._id) dispatch(updatePost(post));
      });

      socketio.on("postDeleted", (postId) => {
        if (postId) dispatch(removePost(postId));
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
      <RouterProvider router={browserRouter} />
    </div>
  );
}

export default App;
