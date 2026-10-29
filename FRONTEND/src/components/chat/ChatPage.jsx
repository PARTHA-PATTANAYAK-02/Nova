import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setSelectedUser, updateUserLastSeen, updateFollowing } from "@/redux/authSlice";
import {
  MessageCircle,
  Search,
  Menu,
  Send,
  X,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Mic,
  Paperclip,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckSquare,
  Check,
  Copy,
  Palette,
  AlertTriangle,
  User,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Star,
  Forward,
  Pin,
  PinOff,
  UserPlus,
  Info,
  MoreVertical,
  CheckCheck,
  UserMinus,
  Lock,
} from "lucide-react";
import {
  UserGroupIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SparklesIcon,
  MessageCircleIcon,
} from "@animateicons/react/lucide";
import { motion, AnimatePresence } from "framer-motion";
import Messages from "@/components/chat/Messages";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import GroupInfoDrawer from "@/components/chat/GroupInfoDrawer";
import axios from "axios";
import {
  setMessages,
  deleteMultipleMessagesForMe,
  clearAllMessages,
  setPinnedMessage,
  toggleStarMessageLocal,
} from "@/redux/chatSlice";
import { getDisplayName, getErrorMessage, formatLastSeen, isSameUser, formatTypingIndicator } from "@/lib/utils";
import { toast } from "sonner";
import { getSocketInstance } from "@/redux/socketSlice";
import useGetConversations from "@/hooks/useGetConversations";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { playMessageSound } from "@/lib/sound";
import ChatUserMenu from "@/components/chat/ChatUserMenu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EllipsisVerticalIcon } from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const WALLPAPERS = [
  {
    id: "default",
    name: "Cyber Grid",
    desc: "Cosmic micro-dot matrix pattern",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.22) 1.2px, transparent 1.2px)",
      backgroundSize: "22px 22px",
    },
    preview: "bg-[var(--surface-2)] border-white/20",
  },
  {
    id: "neon_circuit",
    name: "Neon Circuit",
    desc: "Futuristic digital grid lines",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage:
        "linear-gradient(to right, rgba(99, 102, 241, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.12) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    },
    preview: "bg-indigo-950/40 border-indigo-500/30",
  },
  {
    id: "aurora_glow",
    name: "Aurora Ambient",
    desc: "Soft dual-tint atmospheric glow",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage:
        "radial-gradient(circle at 15% 15%, rgba(56, 189, 248, 0.14) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.14) 0%, transparent 45%)",
    },
    preview: "bg-gradient-to-br from-cyan-950/40 via-purple-950/40 to-transparent border-cyan-500/30",
  },
  {
    id: "geometric_cross",
    name: "Isometric Cross",
    desc: "Minimal cyberpunk cross points",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage:
        "radial-gradient(rgba(139, 92, 246, 0.22) 1.5px, transparent 1.5px), radial-gradient(rgba(59, 130, 246, 0.18) 1.5px, transparent 1.5px)",
      backgroundSize: "28px 28px",
      backgroundPosition: "0 0, 14px 14px",
    },
    preview: "bg-purple-950/40 border-purple-500/30",
  },
  {
    id: "cyber_diagonal",
    name: "Carbon Matrix",
    desc: "High-tech angled micro-weave",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 1px, transparent 1px, transparent 10px)",
    },
    preview: "bg-slate-900/40 border-white/15",
  },
  {
    id: "pure_clean",
    name: "Clean Minimal",
    desc: "Seamless background surface",
    style: {
      backgroundColor: "var(--background)",
      backgroundImage: "none",
    },
    preview: "bg-[var(--surface)] border-[var(--border)]",
  },
];

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const formatLastMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ChatPage = () => {
  const { user, suggestedUsers, selectedUser } = useSelector((s) => s.auth);
  const { onlineUsers, messages, pinnedMessage, typingUsers } = useSelector((s) => s.chat);
  const dispatch = useDispatch();

  const [textMessage, setTextMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [liveLastSeen, setLiveLastSeen] = useState({});
  const [, setTick] = useState(0);

  /* ═══ In-Chat Search State ═══ */
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  /* ═══ Voice Recording State ═══ */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [liveVolumeBars, setLiveVolumeBars] = useState(() => Array(18).fill(16));
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  /* ═══ Media Attachment State ═══ */
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

  // Live timer interval to re-render relative last seen
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  /* ═══ Multi-Select & Chat Settings State ═══ */
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [wallpaperModalOpen, setWallpaperModalOpen] = useState(false);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [multiDeleteModalOpen, setMultiDeleteModalOpen] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [multiDeleting, setMultiDeleting] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState(
    () => localStorage.getItem("nova_chat_wallpaper") || "default"
  );

  /* ═══ Mute Notifications State for This Chat ═══ */
  const [thisChatMuted, setThisChatMuted] = useState(false);

  useEffect(() => {
    if (!selectedUser?._id) return;
    try {
      const mutedList = JSON.parse(localStorage.getItem("nova_muted_chats") || "[]");
      setThisChatMuted(mutedList.includes(selectedUser._id));
    } catch {
      setThisChatMuted(false);
    }
  }, [selectedUser?._id]);

  const handleToggleMuteThisChat = () => {
    if (!selectedUser?._id) return;
    try {
      const mutedList = JSON.parse(localStorage.getItem("nova_muted_chats") || "[]");
      let nextList;
      if (mutedList.includes(selectedUser._id)) {
        nextList = mutedList.filter((id) => id !== selectedUser._id);
        setThisChatMuted(false);
        toast.success(`Notifications unmuted for ${getDisplayName(selectedUser)}`);
      } else {
        nextList = [...mutedList, selectedUser._id];
        setThisChatMuted(true);
        toast.success(`Notifications muted for ${getDisplayName(selectedUser)}`);
      }
      localStorage.setItem("nova_muted_chats", JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
    }
    setChatMenuOpen(false);
  };

  /* ═══ Starred Messages State & Handlers ═══ */
  const [starredModalOpen, setStarredModalOpen] = useState(false);
  const [starredMessages, setStarredMessages] = useState([]);
  const [loadingStarred, setLoadingStarred] = useState(false);

  const handleOpenStarredModal = async () => {
    if (!selectedUser?._id) return;
    setStarredModalOpen(true);
    setLoadingStarred(true);
    try {
      const res = await axios.get(
        apiUrl(`/api/v1/message/starred/${selectedUser._id}`),
        { withCredentials: true }
      );
      if (res.data?.success) {
        setStarredMessages(res.data.messages || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load starred messages");
    } finally {
      setLoadingStarred(false);
    }
  };

  const handleUnstarFromModal = async (msgId) => {
    try {
      dispatch(toggleStarMessageLocal({ messageId: msgId, userId: user?._id }));
      setStarredMessages((prev) => prev.filter((m) => m._id !== msgId));
      await axios.post(apiUrl(`/api/v1/message/star/${msgId}`), {}, { withCredentials: true });
      toast.success("Message unstarred");
    } catch {
      toast.error("Failed to unstar message");
    }
  };

  const handleJumpToMessage = (msgId) => {
    const el = document.getElementById(`message-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/80");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/80"), 2000);
    } else {
      toast.info("Message is further up in history");
    }
  };

  /* ═══ Pin / Unpin Top Banner Handler ═══ */
  const handleUnpinPinnedMessage = async () => {
    if (!pinnedMessage?._id || !selectedUser?._id) return;
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/message/pin/${selectedUser._id}/${pinnedMessage._id}`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        dispatch(setPinnedMessage(null));
        toast.success("Message unpinned");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unpin message");
    }
  };

  /* ═══ Message Forwarding State & Handlers ═══ */
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardTargetMessageIds, setForwardTargetMessageIds] = useState([]);
  const [forwardSelectedUserIds, setForwardSelectedUserIds] = useState([]);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [forwarding, setForwarding] = useState(false);

  const handleToggleForwardUser = (uId) => {
    setForwardSelectedUserIds((prev) =>
      prev.includes(uId) ? prev.filter((id) => id !== uId) : [...prev, uId]
    );
  };

  const handleExecuteForward = async () => {
    if (!forwardTargetMessageIds.length || !forwardSelectedUserIds.length || forwarding) return;
    try {
      setForwarding(true);
      const res = await axios.post(
        apiUrl("/api/v1/message/forward"),
        {
          messageIds: forwardTargetMessageIds,
          targetUserIds: forwardSelectedUserIds,
        },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(
          `Forwarded ${forwardTargetMessageIds.length} message${
            forwardTargetMessageIds.length > 1 ? "s" : ""
          } to ${forwardSelectedUserIds.length} recipient${
            forwardSelectedUserIds.length > 1 ? "s" : ""
          }`
        );
        setForwardModalOpen(false);
        setForwardTargetMessageIds([]);
        setForwardSelectedUserIds([]);
        setSelectedMessageIds([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to forward messages");
    } finally {
      setForwarding(false);
    }
  };

  // On mobile: always show contacts side panel first unless explicitly opened for a specific user
  const [showContacts, setShowContacts] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return !location.state?.user?._id;
    }
    return true;
  });
  const [collapsed, setCollapsed] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);

  const isMobileRef = useRef(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const isConversationPushedRef = useRef(false);
  const selectedUserRef = useRef(selectedUser);

  const newGroupIconRef = useRef(null);
  const railGroupIconRef = useRef(null);
  const welcomeGroupIconRef = useRef(null);
  const expandIconRef = useRef(null);
  const collapseIconRef = useRef(null);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [chatFilter, setChatFilter] = useState("all");
  const [deleteChatModal, setDeleteChatModal] = useState({
    open: false,
    contact: null,
    isFollowing: false,
  });
  const [deletingChat, setDeletingChat] = useState(false);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const currentChatTypingUsers = useMemo(() => {
    if (!selectedUser) return [];
    const directList = typingUsers?.[selectedUser._id?.toString()] || [];
    const convList = selectedUser.conversationId
      ? typingUsers?.[selectedUser.conversationId?.toString()] || []
      : [];
    const map = new Map();
    [...directList, ...convList].forEach((u) => {
      const uid = (u?.userId || u?._id)?.toString();
      if (uid && uid !== user?._id?.toString()) {
        map.set(uid, u);
      }
    });
    return Array.from(map.values());
  }, [typingUsers, selectedUser, user?._id]);

  const currentChatTypingText = useMemo(() => {
    return formatTypingIndicator(currentChatTypingUsers, user?._id);
  }, [currentChatTypingUsers, user?._id]);

  const { isMessageDisabled, messageDisabledReason } = useMemo(() => {
    if (!selectedUser || selectedUser.isGroup) {
      return { isMessageDisabled: false, messageDisabledReason: "" };
    }
    if (selectedUser.whoCanMessage === "no_one") {
      return {
        isMessageDisabled: true,
        messageDisabledReason: `${getDisplayName(selectedUser)} has disabled direct messages.`,
      };
    }
    if (selectedUser.whoCanMessage === "followers") {
      const isFollowedByMe = (user?.following || []).some(
        (f) => (f?._id || f)?.toString() === selectedUser._id?.toString()
      );
      if (!isFollowedByMe) {
        return {
          isMessageDisabled: true,
          messageDisabledReason: `You need to follow ${getDisplayName(selectedUser)} to send messages.`,
        };
      }
    }
    return { isMessageDisabled: false, messageDisabledReason: "" };
  }, [selectedUser, user?.following]);

  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const handleFollowFromChat = async () => {
    if (!selectedUser?._id || isFollowingUser) return;
    setIsFollowingUser(true);
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${selectedUser._id}`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        dispatch(updateFollowing(selectedUser._id));
        toast.success(`You are now following ${getDisplayName(selectedUser)}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to follow user"));
    } finally {
      setIsFollowingUser(false);
    }
  };

  const handleDeleteChatConfirm = async () => {
    if (!deleteChatModal.contact || deletingChat) return;
    const target = deleteChatModal.contact;
    setDeletingChat(true);
    try {
      const res = await axios.delete(
        apiUrl(`/api/v1/message/conversation/${target.conversationId || target._id}`),
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Chat deleted");
        conversationRequest.retry();
        if (selectedUserRef.current?._id?.toString() === target._id?.toString()) {
          dispatch(setSelectedUser(null));
          dispatch(setMessages([]));
        }
        setDeleteChatModal({ open: false, contact: null, isFollowing: false });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete chat"));
    } finally {
      setDeletingChat(false);
    }
  };

  const conversationRequest = useGetConversations();
  const suggestedUserRequest = useGetSuggestedUsers();

  useEffect(() => {
    messagesRef.current = Array.isArray(messages) ? messages : [];
  }, [messages]);

  /* ═══ In-Chat Search Matches ═══ */
  const searchMatches = useMemo(() => {
    if (!inChatSearchQuery.trim() || !messages?.length) return [];
    const q = inChatSearchQuery.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.message &&
        !m.isDeletedForEveryone &&
        m.message.toLowerCase().includes(q)
    );
  }, [inChatSearchQuery, messages]);

  const activeSearchMessageId = useMemo(() => {
    if (!searchMatches.length) return null;
    const clampedIndex = Math.min(
      Math.max(0, activeMatchIndex),
      searchMatches.length - 1
    );
    return searchMatches[clampedIndex]?._id || null;
  }, [searchMatches, activeMatchIndex]);

  const handleNextSearchMatch = () => {
    if (!searchMatches.length) return;
    setActiveMatchIndex((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevSearchMatch = () => {
    if (!searchMatches.length) return;
    setActiveMatchIndex(
      (prev) => (prev - 1 + searchMatches.length) % searchMatches.length
    );
  };

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [inChatSearchQuery]);

  useEffect(() => {
    // Reset search and selection when changing user
    setShowInChatSearch(false);
    setInChatSearchQuery("");
    setActiveMatchIndex(0);
    setSelectedMessageIds([]);
  }, [selectedUser?._id]);

  /* ═══ Multi-Select Handlers ═══ */
  const handleToggleSelectMessage = useCallback((id) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  }, []);

  const handleCopySelected = useCallback(() => {
    const selectedTexts = messages
      .filter((m) => selectedMessageIds.includes(m._id) && m.message && !m.isDeletedForEveryone)
      .map((m) => m.message);
    if (selectedTexts.length === 0) {
      toast.info("No text to copy in selected messages");
      return;
    }
    navigator.clipboard.writeText(selectedTexts.join("\n\n"));
    toast.success(`Copied ${selectedTexts.length} message(s) to clipboard`);
    setSelectedMessageIds([]);
  }, [messages, selectedMessageIds]);

  const handleSelectAllToggle = useCallback(() => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map((m) => m._id));
    }
  }, [messages, selectedMessageIds]);

  const canDeleteForEveryone = useMemo(() => {
    if (!selectedMessageIds.length) return false;
    return selectedMessageIds.every((id) => {
      const m = messages.find((msg) => msg._id === id);
      return m && isSameUser(m.senderId, user?._id) && !m.isDeletedForEveryone;
    });
  }, [selectedMessageIds, messages, user?._id]);

  const handleExecuteMultiDelete = async (deleteType) => {
    if (!selectedMessageIds.length || multiDeleting) return;
    setMultiDeleting(true);
    try {
      const res = await axios.post(
        apiUrl("/api/v1/message/delete-multiple"),
        { messageIds: selectedMessageIds, deleteType },
        { withCredentials: true }
      );
      if (res.data.success) {
        dispatch(deleteMultipleMessagesForMe(selectedMessageIds));
        toast.success(res.data.message || "Messages deleted");
        setSelectedMessageIds([]);
        setMultiDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete selected messages"));
    } finally {
      setMultiDeleting(false);
    }
  };

  const handleClearChatHistory = async () => {
    if (!selectedUser?._id || clearingChat) return;
    setClearingChat(true);
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/message/clear/${selectedUser._id}`),
        { deleteForEveryone: true },
        { withCredentials: true }
      );
      if (res.data?.success) {
        dispatch(clearAllMessages());
        toast.success("Chat history permanently deleted from database and profile");
        setClearChatModalOpen(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to clear chat history"));
    } finally {
      setClearingChat(false);
    }
  };

  const handleSelectWallpaper = (wpId) => {
    setChatWallpaper(wpId);
    localStorage.setItem("nova_chat_wallpaper", wpId);
    toast.success("Chat wallpaper updated!");
    setWallpaperModalOpen(false);
  };

  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return undefined;
    const handleUserLastSeen = (data) => {
      if (data?.userId && data?.lastSeen) {
        dispatch(updateUserLastSeen(data));
        setLiveLastSeen((prev) => ({
          ...prev,
          [data.userId.toString()]: data.lastSeen,
        }));
      }
    };
    const handleConversationPinnedUpdated = (data) => {
      const currentSelectedId = selectedUserRef.current?._id?.toString();
      const targetChatId = (data?.conversationId || data?.otherUserId)?.toString();
      if (!currentSelectedId || currentSelectedId === targetChatId) {
        dispatch(setPinnedMessage(data?.pinnedMessage || null));
      }
    };
    const handleNewGroupCreated = () => {
      conversationRequest.retry();
    };
    const handleGroupUpdated = (updatedGroup) => {
      conversationRequest.retry();
      const currentSelectedId = selectedUserRef.current?._id?.toString();
      const updatedGroupId = (updatedGroup?._id || updatedGroup?.user?._id)?.toString();
      if (currentSelectedId && currentSelectedId === updatedGroupId) {
        dispatch(setSelectedUser(updatedGroup.user || updatedGroup));
      }
    };
    const handleRemovedFromGroup = ({ groupId }) => {
      conversationRequest.retry();
      const currentSelectedId = selectedUserRef.current?._id?.toString();
      if (currentSelectedId && currentSelectedId === groupId?.toString()) {
        dispatch(setSelectedUser(null));
        toast.info("You were removed from this group");
      }
    };
    const handleUserPrivacyChanged = ({ userId, whoCanMessage }) => {
      const currentSelectedId = selectedUserRef.current?._id?.toString();
      if (currentSelectedId && currentSelectedId === userId?.toString()) {
        dispatch(
          setSelectedUser({
            ...selectedUserRef.current,
            whoCanMessage,
          })
        );
      }
    };

    socket.on("userLastSeen", handleUserLastSeen);
    socket.on("conversationPinnedUpdated", handleConversationPinnedUpdated);
    socket.on("newGroupCreated", handleNewGroupCreated);
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("removedFromGroup", handleRemovedFromGroup);
    socket.on("userPrivacyChanged", handleUserPrivacyChanged);

    return () => {
      socket.off("userLastSeen", handleUserLastSeen);
      socket.off("conversationPinnedUpdated", handleConversationPinnedUpdated);
      socket.off("newGroupCreated", handleNewGroupCreated);
      socket.off("groupUpdated", handleGroupUpdated);
      socket.off("removedFromGroup", handleRemovedFromGroup);
      socket.off("userPrivacyChanged", handleUserPrivacyChanged);
    };
  }, [dispatch]);

  /* ---------- RESIZE LISTENER ---------- */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      isMobileRef.current = mobile;
      if (!mobile) {
        setShowContacts(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- POPSTATE: MOBILE BACK NAVIGATION ---------- */
  useEffect(() => {
    const handlePopState = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!showContacts) {
          setShowContacts(true);
          isConversationPushedRef.current = false;
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showContacts]);

  /* ---------- OPEN CONVERSATION (mobile-history-aware) ---------- */
  const openConversation = useCallback(
    (targetUser) => {
      if (!targetUser) return;

      dispatch(setSelectedUser(targetUser));
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!isConversationPushedRef.current) {
          window.history.pushState({ novaChatView: "conversation" }, "");
          isConversationPushedRef.current = true;
        }
        setShowContacts(false);
      }
    },
    [dispatch]
  );

  /* ---------- ROUTE CHANGE: ON MOBILE SHOW CONTACTS FIRST ---------- */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (location.state?.user?._id) {
        setShowContacts(false);
      } else {
        setShowContacts(true);
      }
    }
  }, [location.pathname, location.key, location.state]);

  /* ---------- CLOSE CONTACTS (mobile) ---------- */
  const closeContacts = useCallback(() => {
    if (selectedUser) {
      const isMobile = window.innerWidth < 768;
      if (isMobile && !isConversationPushedRef.current) {
        window.history.pushState({ novaChatView: "conversation" }, "");
        isConversationPushedRef.current = true;
      }
      setShowContacts(false);
    }
  }, [selectedUser]);

  /* ---------- LOCATION USER ---------- */
  useEffect(() => {
    if (location.state?.user?._id) {
      dispatch(setSelectedUser(location.state.user));
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!isConversationPushedRef.current) {
          window.history.pushState({ novaChatView: "conversation" }, "");
          isConversationPushedRef.current = true;
        }
        setShowContacts(false);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch, location.state, user?.following]);

  /* Reset selectedUser on initial entry so welcome screen shows */
  useEffect(() => {
    if (!location.state?.user?._id) {
      dispatch(setSelectedUser(null));
    }
  }, []);

  /* ═══ VOICE NOTE RECORDING HANDLERS ═══ */
  const stopAudioVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {
        // AudioContext already closed or ignored
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setLiveVolumeBars(Array(18).fill(16));
  }, []);

  const cancelRecording = useCallback(() => {
    stopAudioVisualizer();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      // Clear onstop so it does not trigger accidental message send
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // MediaRecorder already stopped or ignored
        }
      }
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    setIsSendingVoice(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [stopAudioVisualizer]);

  // Cleanup recording on component unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  // Cancel recording if user switches active conversation
  useEffect(() => {
    if (isRecording) {
      cancelRecording();
    }
  }, [selectedUser?._id]);

  const startRecording = async () => {
    if (isRecording || isSendingVoice) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
        return;
      }

      // Teardown any leftover stream first
      cancelRecording();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Real-time audio frequency visualizer via Web Audio API
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.65;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVisualizer = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const bars = [];
            const step = Math.max(1, Math.floor(dataArray.length / 18));
            for (let i = 0; i < 18; i++) {
              const val = dataArray[i * step] || 0;
              const pct = Math.min(100, Math.max(16, Math.round((val / 255) * 100)));
              bars.push(pct);
            }
            setLiveVolumeBars(bars);
            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          };
          animFrameRef.current = requestAnimationFrame(updateVisualizer);
        }
      } catch (visErr) {
        console.warn("AudioContext visualizer notice:", visErr);
      }

      let options = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access was denied. Please allow microphone permissions.");
      cancelRecording();
    }
  };

  const sendVoiceNote = async () => {
    if (!isRecording || !mediaRecorderRef.current || isSendingVoice) return;

    if (recordingTime < 1) {
      toast.error("Voice note is too short. Speak longer before sending.");
      cancelRecording();
      return;
    }

    setIsSendingVoice(true);
    stopAudioVisualizer();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingTime;
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        if (!audioBlob || audioBlob.size < 100) {
          toast.error("Recording was empty or too short.");
          cancelRecording();
          return;
        }

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMsg = {
          _id: tempId,
          senderId: user._id,
          receiverId: selectedUser._id,
          mediaType: "audio",
          mediaUrl: URL.createObjectURL(audioBlob),
          audioDuration: duration,
          message: "",
          createdAt: new Date().toISOString(),
          status: "sending",
          __optimistic: true,
        };

        const nextList = [...(messagesRef.current || []), optimisticMsg];
        messagesRef.current = nextList;
        dispatch(setMessages(nextList));
        playMessageSound();

        setIsRecording(false);
        setRecordingTime(0);

        const formData = new FormData();
        formData.append("file", audioBlob, "voice-note.webm");
        formData.append("audioDuration", String(duration));
        if (replyingTo?._id) {
          formData.append("replyToId", replyingTo._id);
        }

        const res = await axios.post(
          apiUrl(`/api/v1/message/send/${selectedUser._id}`),
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }
        );

        if (res.data.success) {
          const realMsg = res.data.newMessage || res.data.message;
          if (realMsg?._id) {
            const latest = messagesRef.current || [];
            const hasReal = latest.some((m) => m._id === realMsg._id);
            const updated = hasReal
              ? latest.filter((m) => m._id !== tempId)
              : latest.map((m) =>
                  m._id === tempId
                    ? { ...realMsg, status: realMsg.status || "sent" }
                    : m
                );
            messagesRef.current = updated;
            dispatch(setMessages(updated));
          }
        }
      } catch (err) {
        console.error("Voice note send error:", err);
        const latest = messagesRef.current || [];
        messagesRef.current = latest.filter((m) => !m._id.startsWith("temp-"));
        dispatch(setMessages(messagesRef.current));
        toast.error(getErrorMessage(err, "Unable to send voice note."));
      } finally {
        setIsSendingVoice(false);
        audioChunksRef.current = [];
      }
    };

    try {
      recorder.stop();
    } catch (err) {
      console.error("Error stopping recorder:", err);
      cancelRecording();
    }
  };

  /* ═══ MEDIA ATTACHMENT HANDLERS ═══ */
  const handleMediaFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB.");
      return;
    }

    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");

    if (!isImage && !isVideo) {
      toast.error("Only photos and videos can be shared.");
      return;
    }

    setSelectedMediaFile(file);
    setMediaType(isVideo ? "video" : "image");
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaCaption(textMessage);
    setTextMessage("");

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelMediaModal = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setMediaCaption("");
    setUploadingMedia(false);
  };

  const sendMediaMessage = async () => {
    if (!selectedMediaFile || !selectedUser?._id || uploadingMedia) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrl = mediaPreviewUrl;
    const currentMediaType = mediaType;
    const optimisticMsg = {
      _id: tempId,
      senderId: user._id,
      receiverId: selectedUser._id,
      mediaType: currentMediaType,
      mediaUrl: previewUrl,
      message: mediaCaption.trim(),
      createdAt: new Date().toISOString(),
      status: "sending",
      __optimistic: true,
    };

    const nextList = [...(messagesRef.current || []), optimisticMsg];
    messagesRef.current = nextList;
    dispatch(setMessages(nextList));
    playMessageSound();

    const fileToSend = selectedMediaFile;
    const captionToSend = mediaCaption.trim();
    const replyToSend = replyingTo?._id;

    // Close preview modal without revoking previewUrl so optimisticMsg renders instantly
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setMediaCaption("");
    setReplyingTo(null);

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append("file", fileToSend);
      if (captionToSend) formData.append("textMessage", captionToSend);
      if (replyToSend) formData.append("replyToId", replyToSend);

      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${selectedUser._id}`),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const realMsg = res.data.newMessage || res.data.message;
        if (realMsg?._id) {
          const latest = messagesRef.current || [];
          const hasReal = latest.some((m) => m._id === realMsg._id);
          const updated = hasReal
            ? latest.filter((m) => m._id !== tempId)
            : latest.map((m) =>
                m._id === tempId
                  ? { ...realMsg, status: realMsg.status || "sent" }
                  : m
              );
          messagesRef.current = updated;
          dispatch(setMessages(updated));
        }
      }
    } catch (err) {
      const latest = messagesRef.current || [];
      messagesRef.current = latest.filter((m) => m._id !== tempId);
      dispatch(setMessages(messagesRef.current));
      toast.error(getErrorMessage(err, "Unable to send media file."));
    } finally {
      setUploadingMedia(false);
    }
  };

  /* ---------- SEND TEXT ---------- */
  const sendMessageHandler = async (receiverId) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to send messages.");
      return;
    }
    const text = textMessage.trim();
    if (!text || !receiverId || !user?._id || sending) return;

    const replyTo = replyingTo
      ? {
          messageId: replyingTo._id,
          senderId: replyingTo.senderId,
          message: replyingTo.message,
        }
      : undefined;

    const socket = getSocketInstance();
    const stopPayload = selectedUser?.isGroup
      ? {
          conversationId: selectedUser._id,
          participantIds: (selectedUser.participants || []).map((p) => p?._id || p),
        }
      : {
          receiverId,
          conversationId: selectedUser?.conversationId || undefined,
        };
    socket?.emit("stopTyping", stopPayload);
    clearTimeout(typingTimeoutRef.current);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: user._id,
      receiverId,
      message: text,
      mediaType: "text",
      replyTo,
      createdAt: new Date().toISOString(),
      status: "sending",
      __optimistic: true,
    };

    const nextList = [...(messagesRef.current || []), optimisticMsg];
    messagesRef.current = nextList;
    dispatch(setMessages(nextList));
    playMessageSound();

    setTextMessage("");
    setReplyingTo(null);
    inputRef.current?.focus();

    try {
      setSending(true);
      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${receiverId}`),
        { textMessage: text, replyToId: replyTo?.messageId },
        { withCredentials: true }
      );

      if (res.data.success) {
        const realMsg = res.data.newMessage || res.data.message;
        if (realMsg?._id) {
          const latest = messagesRef.current || [];
          const hasReal = latest.some((m) => m._id === realMsg._id);
          const updated = hasReal
            ? latest.filter((m) => m._id !== tempId)
            : latest.map((m) =>
                m._id === tempId
                  ? { ...realMsg, status: realMsg.status || "sent" }
                  : m
              );
          messagesRef.current = updated;
          dispatch(setMessages(updated));
        }
      }
    } catch (error) {
      const latest = messagesRef.current || [];
      const updated = latest.filter((m) => m._id !== tempId);
      messagesRef.current = updated;
      dispatch(setMessages(updated));
      setTextMessage(text);
      setReplyingTo(replyingTo || null);
      toast.error(getErrorMessage(error, "Unable to send your message."));
    } finally {
      setSending(false);
    }
  };

  /* ---------- TYPING ---------- */
  const messageChangeHandler = (event) => {
    const next = event.target.value;
    setTextMessage(next);

    const socket = getSocketInstance();
    if (!selectedUser || !socket) return;

    const payload = selectedUser.isGroup
      ? {
          conversationId: selectedUser._id,
          participantIds: (selectedUser.participants || []).map((p) => p?._id || p),
        }
      : {
          receiverId: selectedUser._id,
          conversationId: selectedUser.conversationId || undefined,
        };

    clearTimeout(typingTimeoutRef.current);
    if (!next.trim()) {
      socket.emit("stopTyping", payload);
      return;
    }
    socket.emit("typing", payload);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", payload);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (selectedUserRef.current) {
        const u = selectedUserRef.current;
        const stopPayload = u.isGroup
          ? {
              conversationId: u._id,
              participantIds: (u.participants || []).map((p) => p?._id || p),
            }
          : {
              receiverId: u._id,
              conversationId: u.conversationId || undefined,
            };
        const socket = getSocketInstance();
        socket?.emit("stopTyping", stopPayload);
      }
    };
  }, [selectedUser?._id]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedUser?._id]);

  /* ---------- CONTACTS & ORDERING BY LATEST MESSAGE ---------- */
  const sortedConversations = useMemo(() => {
    return [...(conversationRequest.conversations || [])].sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [conversationRequest.conversations]);

  const contacts = useMemo(() => {
    // Only existing active conversations (1-on-1 and groups) that are not deleted
    return sortedConversations
      .map((c) => {
        if (!c.user?._id) return null;
        return {
          ...c.user,
          conversationId: c._id,
          isGroup: Boolean(c.isGroup),
          groupName: c.groupName || c.user?.groupName,
          groupAvatar: c.groupAvatar || c.user?.profilePicture,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt || c.updatedAt,
          unreadCount: c.unreadCount || 0,
          hasConversation: true,
        };
      })
      .filter(Boolean);
  }, [sortedConversations]);

  // Users the current user follows who do NOT have an active conversation yet (available when searching)
  const followingUsers = useMemo(() => {
    const convUserIds = new Set(contacts.map((u) => u._id.toString()));
    return (user?.following || [])
      .filter((f) => {
        const fId = (f?._id || f)?.toString();
        return fId && fId !== user?._id?.toString() && !convUserIds.has(fId);
      })
      .map((f) => {
        if (typeof f === "object" && f.username) {
          return { ...f, hasConversation: false, unreadCount: 0 };
        }
        const found = (suggestedUsers || []).find((s) => s._id?.toString() === f.toString());
        return found ? { ...found, hasConversation: false, unreadCount: 0 } : null;
      })
      .filter(Boolean);
  }, [contacts, user?.following, suggestedUsers, user?._id]);

  const forwardCandidates = useMemo(() => {
    const q = forwardSearchQuery.trim().toLowerCase();
    const candidatePool = [...contacts, ...followingUsers];
    return candidatePool.filter((c) => {
      if (!c?._id || c._id === user?._id) return false;
      if (!q) return true;
      return (
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.groupName && c.groupName.toLowerCase().includes(q))
      );
    });
  }, [contacts, followingUsers, forwardSearchQuery, user?._id]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // When searching, include following users so user can find and message anyone they follow
    const sourceList = q ? [...contacts, ...followingUsers] : contacts;

    let list = sourceList;
    if (chatFilter === "direct") {
      list = list.filter((u) => !u.isGroup);
    } else if (chatFilter === "groups") {
      list = list.filter((u) => u.isGroup);
    } else if (chatFilter === "unread") {
      list = list.filter((u) => (u.unreadCount || 0) > 0);
    }

    if (!q) return list;
    return list.filter((u) => {
      const name = (u.groupName || u.fullName || "").toLowerCase();
      const uname = (u.username || "").toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [contacts, followingUsers, chatFilter, searchQuery]);

  const getConversationForUser = (userId) =>
    conversationRequest.conversations.find(
      (c) => (c.user?._id || c._id)?.toString() === userId?.toString()
    );

  const getLastMessageSnippet = (u) => {
    if (!u.lastMessage) return null;
    const msg = u.lastMessage;
    if (msg.isDeletedForEveryone) return "Message was deleted";
    let prefix = "";
    if (u.isGroup && msg.senderId) {
      const senderName = isSameUser(msg.senderId, user?._id)
        ? "You"
        : typeof msg.senderId === "object"
        ? msg.senderId.fullName || msg.senderId.username
        : "Member";
      prefix = `${senderName}: `;
    } else if (isSameUser(msg.senderId, user?._id)) {
      prefix = "You: ";
    }

    if (msg.mediaType === "image") return `${prefix}📷 Photo`;
    if (msg.mediaType === "video") return `${prefix}🎥 Video`;
    if (msg.mediaType === "audio") return `${prefix}🎤 Voice note`;
    return `${prefix}${msg.message || ""}`;
  };

  return (
    <div className="nova-chat">
      {/* ═══════════ CONTACTS PANEL ═══════════ */}
      <aside
        className={`nova-chat__contacts ${showContacts ? "is-open" : ""} ${
          collapsed ? "is-collapsed" : ""
        }`}
      >
        {/* Collapsed top rail header */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 py-3.5 border-b border-[var(--border)]/40 px-2">
            <button
              type="button"
              onClick={() => {
                expandIconRef.current?.startAnimation?.();
                setCollapsed(false);
              }}
              className="shrink-0 size-9 aspect-square rounded-xl bg-[var(--surface-2)] hover:bg-[var(--primary)] text-[var(--foreground)] hover:text-white border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 group"
              aria-label="Expand sidebar"
              title="Expand Sidebar"
            >
              <AnimatedIcon
                ref={expandIconRef}
                icon={PanelLeftOpenIcon}
                size={20}
                duration={1}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                railGroupIconRef.current?.startAnimation?.();
                setCreateGroupOpen(true);
              }}
              className="shrink-0 size-9 aspect-square rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/30 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 group"
              aria-label="Create New Group"
              title="New Group"
            >
              <AnimatedIcon
                ref={railGroupIconRef}
                icon={UserGroupIcon}
                size={18}
                duration={1}
              />
            </button>
          </div>
        ) : (
          /* Expanded header */
          <div className="nova-chat__contacts-head">
            <div className="nova-chat__contacts-title-row">
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="md:hidden p-1.5 -ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] active:scale-90 transition-all rounded-full flex items-center justify-center cursor-pointer"
                  aria-label="Back to home feed"
                  title="Back to home"
                >
                  <ChevronLeft className="size-5" strokeWidth={2.4} />
                </Link>
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] shadow-xs">
                    <Sparkles className="size-4" strokeWidth={2.2} />
                  </div>
                  <h1 className="nova-chat__contacts-title">
                    <span className="nova-chat__contacts-title-text">Messages</span>
                  </h1>
                </div>
              </div>

              <div className="nova-chat__contacts-actions flex items-center gap-2">
                {/* Create Group Button with theme styling */}
                <button
                  type="button"
                  onClick={() => {
                    newGroupIconRef.current?.startAnimation?.();
                    setCreateGroupOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/30 transition-all text-xs font-semibold cursor-pointer shadow-xs active:scale-95 group shrink-0"
                  title="Create New Group"
                  aria-label="Create New Group"
                >
                  <AnimatedIcon
                    ref={newGroupIconRef}
                    icon={UserGroupIcon}
                    size={16}
                    duration={1}
                  />
                  <span className="hidden sm:inline">New Group</span>
                </button>

                {/* Collapse button on desktop: perfect aspect-square, theme-aware */}
                <button
                  type="button"
                  className="hidden md:inline-flex shrink-0 size-8 aspect-square rounded-xl bg-[var(--surface-2)] hover:bg-[var(--primary)]/15 text-[var(--muted-foreground)] hover:text-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)]/30 items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 group"
                  onClick={() => {
                    collapseIconRef.current?.startAnimation?.();
                    setCollapsed(true);
                  }}
                  aria-label="Collapse sidebar"
                  title="Collapse Sidebar"
                >
                  <AnimatedIcon
                    ref={collapseIconRef}
                    icon={PanelLeftCloseIcon}
                    size={18}
                    duration={1}
                  />
                </button>

                {/* Mobile close contacts button */}
                {selectedUser && (
                  <button
                    type="button"
                    onClick={closeContacts}
                    className="nova-chat__contacts-close md:hidden"
                    aria-label="Close contacts"
                    title="Close"
                  >
                    <X className="size-4" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>

            {/* Modern Search Input */}
            <div className="nova-chat__search focus-within:ring-2 focus-within:ring-[var(--primary)]/30">
              <Search className="nova-chat__search-icon" strokeWidth={1.9} />
              <input
                type="text"
                placeholder="Search chats or people…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="nova-chat__search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="size-5 rounded-full hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Modern Filter Tabs: All / Direct / Groups / Unread */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "all", label: "All" },
                { id: "direct", label: "Direct" },
                { id: "groups", label: "Groups" },
                { id: "unread", label: "Unread" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChatFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all shrink-0 cursor-pointer ${
                    chatFilter === tab.id
                      ? "bg-[var(--primary)] text-white shadow-xs font-semibold"
                      : "bg-[var(--surface-2)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="nova-chat__contacts-list">
          {conversationRequest.loading &&
            suggestedUserRequest.loading &&
            contacts.length === 0 && (
              <LoadingState message="Loading conversations…" />
            )}

          {!conversationRequest.loading &&
            !suggestedUserRequest.loading &&
            contacts.length === 0 &&
            (conversationRequest.error || suggestedUserRequest.error) && (
              <ErrorState
                message={conversationRequest.error || suggestedUserRequest.error}
                onRetry={() => {
                  conversationRequest.retry();
                  suggestedUserRequest.retry();
                }}
              />
            )}

          {filteredUsers.length === 0 &&
            !conversationRequest.loading &&
            !suggestedUserRequest.loading && (
              <div className="nova-chat__empty">
                <div className="nova-chat__empty-orb">
                  <Users className="size-4" strokeWidth={1.8} />
                </div>
                <p className="nova-chat__empty-title">
                  {searchQuery ? "No matches found" : "No chats yet"}
                </p>
                <p className="nova-chat__empty-sub">
                  {searchQuery ? "Try a different search" : "Select someone from your following or create a group"}
                </p>
              </div>
            )}

          {/* Render in collapsed mode vs expanded mode */}
          {collapsed ? (
            filteredUsers.map((u) => {
              const isOnline = !u.isGroup && onlineUsers.includes(u?._id);
              const isSelected = selectedUser?._id === u._id;
              const conversation = getConversationForUser(u._id);
              const unreadCount = conversation?.unreadCount || u.unreadCount || 0;

              return (
                <div
                  key={u._id}
                  className="relative flex items-center justify-center w-full py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => openConversation(u)}
                    className={`relative size-11 rounded-full transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                      isSelected
                        ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0f172a] shadow-lg"
                        : "hover:scale-105"
                    }`}
                    title={u.isGroup ? u.groupName || u.fullName : getDisplayName(u)}
                  >
                    <Avatar className="size-11">
                      <AvatarImage src={u?.profilePicture} />
                      <AvatarFallback className={u.isGroup ? "bg-[var(--primary)]/20 text-[var(--primary)] font-bold" : ""}>
                        {u.isGroup ? (
                          <Users className="size-5" />
                        ) : (
                          getDisplayName(u, "U").charAt(0).toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && <span className="nova-chat__status-dot" />}
                    {unreadCount > 0 && !isSelected && (
                      <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-[var(--background)] animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            filteredUsers.map((u, idx) => {
              const isOnline = !u.isGroup && onlineUsers.includes(u?._id);
              const isSelected = selectedUser?._id === u._id;
              const conversation = getConversationForUser(u._id);
              const unreadCount = conversation?.unreadCount || u.unreadCount || 0;
              const snippet = getLastMessageSnippet(u);
              const lastMsgTime = formatLastMessageTime(u.lastMessageAt || u.lastMessage?.createdAt);
              const isFollowingUser = (user?.following || []).some(
                (f) => (f?._id || f)?.toString() === u._id?.toString()
              );
              const contactTypingUsers = (
                (typingUsers?.[u._id?.toString()] || []).concat(
                  u.conversationId ? (typingUsers?.[u.conversationId?.toString()] || []) : []
                )
              ).filter((item) => (item?.userId || item?._id)?.toString() !== user?._id?.toString());
              const contactTypingText = formatTypingIndicator(contactTypingUsers, user?._id);

              return (
                <div
                  key={u._id}
                  className="relative group/item w-full"
                >
                  <button
                    type="button"
                    onClick={() => openConversation(u)}
                    className={`nova-chat__contact ${
                      isSelected ? "is-selected" : ""
                    } pr-8`}
                    style={{ animationDelay: `${Math.min(idx * 20, 350)}ms` }}
                    title={u.isGroup ? u.groupName || u.fullName : getDisplayName(u)}
                  >
                    <span className="nova-chat__contact-avatar">
                      <Avatar className="size-11">
                        <AvatarImage src={u?.profilePicture} />
                        <AvatarFallback className={u.isGroup ? "bg-[var(--primary)]/20 text-[var(--primary)] font-bold" : ""}>
                          {u.isGroup ? (
                            <Users className="size-5" />
                          ) : (
                            getDisplayName(u, "U").charAt(0).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && <span className="nova-chat__status-dot" />}
                    </span>

                    <span className="nova-chat__contact-meta">
                      <span className="flex items-center justify-between gap-1 w-full">
                        <span className="nova-chat__contact-name flex items-center gap-1.5 min-w-0">
                          <span className="truncate font-semibold text-[13.5px]">
                            {u.isGroup ? u.groupName || u.fullName : getDisplayName(u)}
                          </span>
                          {u.isGroup && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 shrink-0">
                              Group
                            </span>
                          )}
                        </span>
                        {lastMsgTime && (
                          <span className="text-[10px] text-[var(--muted-foreground)] font-medium shrink-0 ml-1">
                            {lastMsgTime}
                          </span>
                        )}
                      </span>

                      <span className="flex items-center justify-between gap-2 w-full mt-0.5">
                        <span
                          className={`nova-chat__contact-sub truncate text-[11.5px] ${
                            contactTypingText
                              ? "text-[var(--primary)] font-semibold italic animate-pulse"
                              : unreadCount > 0
                              ? "text-[var(--foreground)] font-semibold"
                              : "text-[var(--muted-foreground)]"
                          }`}
                        >
                          {contactTypingText ||
                            snippet ||
                            (u.isGroup
                              ? `${u.participants?.length || 0} members`
                              : isOnline
                              ? "Online"
                              : (liveLastSeen[u?._id] || u?.lastSeen)
                              ? formatLastSeen(liveLastSeen[u?._id] || u?.lastSeen)
                              : u.hasConversation
                              ? "Tap to chat"
                              : "Following")}
                        </span>

                        {unreadCount > 0 && !isSelected && (
                          <span className="nova-chat__unread shrink-0">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  {/* 3-Dots Action Popover (Delete Chat / Leave Group) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="size-7 rounded-full bg-[var(--surface-2)]/80 hover:bg-[var(--surface-3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                          title="Options"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start" className="w-48 p-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteChatModal({
                              open: true,
                              contact: u,
                              isFollowing: isFollowingUser,
                            });
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                        >
                          <Trash2 className="size-3.5 shrink-0" />
                          <span>{u.isGroup ? "Leave Group" : "Delete Chat"}</span>
                        </button>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ═══════════ CHAT AREA ═══════════ */}
      {selectedUser ? (
        <section
          className={`nova-chat__window ${!showContacts ? "is-visible" : ""}`}
        >
          {/* Header */}
          <div className="nova-chat__window-head">
            {selectedMessageIds.length > 0 ? (
              /* ═══ WHATSAPP-STYLE MULTI-SELECTION ACTION BAR ═══ */
              <div className="flex items-center justify-between w-full px-1 sm:px-2 animate-in fade-in duration-150 select-none">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMessageIds([])}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Cancel selection"
                  >
                    <X className="size-5" strokeWidth={2.2} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm sm:text-base text-white">
                      {selectedMessageIds.length}
                    </span>
                    <span className="text-xs sm:text-sm text-white/70">
                      selected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    className="px-2.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Copy selected text"
                  >
                    <Copy className="size-4 text-emerald-400" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForwardTargetMessageIds(selectedMessageIds);
                      setForwardSelectedUserIds([]);
                      setForwardSearchQuery("");
                      setForwardModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Forward selected messages"
                  >
                    <Forward className="size-4 text-sky-400" />
                    <span className="hidden sm:inline">Forward</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllToggle}
                    className="px-2.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Select all messages"
                  >
                    <CheckSquare className="size-4 text-cyan-400" />
                    <span className="hidden sm:inline">
                      {selectedMessageIds.length === messages.length
                        ? "Deselect"
                        : "Select All"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiDeleteModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Delete selected messages"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ═══ NORMAL CHAT HEADER ═══ */
              <>
                <button
                  type="button"
                  className="nova-chat__menu-btn md:hidden"
                  onClick={() => {
                    if (isConversationPushedRef.current) {
                      window.history.back();
                    } else {
                      setShowContacts(true);
                    }
                  }}
                  aria-label="Back to conversations"
                  title="Back to messages"
                >
                  <ChevronLeft className="size-5.5" strokeWidth={2.4} />
                </button>

                {selectedUser?.isGroup ? (
                  <button
                    type="button"
                    onClick={() => setGroupInfoOpen(true)}
                    className="nova-chat__window-user text-left group hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span className="nova-chat__window-avatar">
                      <Avatar className="size-10 ring-1 ring-white/10">
                        <AvatarImage src={selectedUser?.profilePicture} />
                        <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] font-bold">
                          <Users className="size-5" />
                        </AvatarFallback>
                      </Avatar>
                    </span>
                    <span className="nova-chat__window-meta">
                      <span className="nova-chat__window-name flex items-center gap-1.5">
                        <span className="truncate">{selectedUser.groupName || selectedUser.fullName}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30">
                          Group
                        </span>
                      </span>
                      {currentChatTypingText ? (
                        <span className="nova-chat__window-sub text-[var(--primary)] text-[11px] font-semibold flex items-center gap-1.5 animate-pulse">
                          <span className="inline-block size-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                          <span className="truncate">{currentChatTypingText}</span>
                        </span>
                      ) : (
                        <span className="nova-chat__window-sub text-white/50 text-[11px] group-hover:text-[var(--primary)] transition-colors">
                          {selectedUser.participants?.length || 0} members • Tap for info
                        </span>
                      )}
                    </span>
                  </button>
                ) : (
                  <ChatUserMenu user={selectedUser}>
                    <span className="nova-chat__window-user">
                      <span className="nova-chat__window-avatar">
                        <Avatar className="size-10">
                          <AvatarImage src={selectedUser?.profilePicture} />
                          <AvatarFallback>
                            {getDisplayName(selectedUser, "U")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {onlineUsers.includes(selectedUser?._id) && (
                          <span className="nova-chat__status-dot" />
                        )}
                      </span>
                      <span className="nova-chat__window-meta">
                        <span className="nova-chat__window-name">
                          {getDisplayName(selectedUser)}
                        </span>
                        <span
                          className={`nova-chat__window-sub ${
                            currentChatTypingText
                              ? "text-[var(--primary)] font-semibold animate-pulse"
                              : onlineUsers.includes(selectedUser?._id)
                              ? "is-online"
                              : ""
                          }`}
                        >
                          {currentChatTypingText
                            ? "typing…"
                            : onlineUsers.includes(selectedUser?._id)
                            ? "Online"
                            : formatLastSeen(
                                liveLastSeen[selectedUser?._id] ||
                                  selectedUser?.lastSeen ||
                                  conversationUsers.find(
                                    (c) => c._id === selectedUser?._id
                                  )?.lastSeen
                              )}
                        </span>
                      </span>
                    </span>
                  </ChatUserMenu>
                )}

                {/* Right Action Icons: Search & 3-Dots Settings */}
                <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                  {selectedUser?.isGroup && (
                    <button
                      type="button"
                      onClick={() => setGroupInfoOpen(true)}
                      className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Group Info"
                      aria-label="Group Info"
                    >
                      <Info className="size-4" strokeWidth={2.2} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowInChatSearch((prev) => !prev);
                      if (!showInChatSearch) {
                        setInChatSearchQuery("");
                      }
                    }}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      showInChatSearch
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    title="Search messages in conversation"
                    aria-label="Search messages"
                  >
                    <Search className="size-4" strokeWidth={2.2} />
                  </button>

                  {/* 3-Dots Chat Settings Popover */}
                  <Popover open={chatMenuOpen} onOpenChange={setChatMenuOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Chat options & settings"
                        aria-label="Chat options"
                      >
                        <AnimatedIcon icon={EllipsisVerticalIcon} size={16} strokeWidth={2.2} />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      side="bottom"
                      align="end"
                      sideOffset={8}
                      className="w-56 p-1.5 rounded-2xl bg-[var(--surface)]/95 backdrop-blur-2xl border border-[var(--border)] shadow-2xl shadow-black/50 z-50 flex flex-col gap-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          setWallpaperModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <Palette className="size-4 text-purple-400" />
                        <span>Change Wallpaper</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          setShowInChatSearch(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <Search className="size-4 text-cyan-400" />
                        <span>Search in Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          handleOpenStarredModal();
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <Star className="size-4 text-amber-400" />
                        <span>Starred Messages</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          if (messages?.length > 0) {
                            setSelectedMessageIds([messages[messages.length - 1]._id]);
                          }
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <CheckSquare className="size-4 text-emerald-400" />
                        <span>Select Messages</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          navigate(`/profile/${selectedUser?.username || selectedUser?._id}`);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <User className="size-4 text-indigo-400" />
                        <span>View Profile</span>
                      </button>

                      <div className="my-1 h-px bg-[var(--border)]/60" />

                      {/* ═══ Mute / Unmute Notifications for this chat ═══ */}
                      <button
                        type="button"
                        onClick={handleToggleMuteThisChat}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          {thisChatMuted ? (
                            <Bell className="size-4 text-emerald-400" />
                          ) : (
                            <BellOff className="size-4 text-amber-400" />
                          )}
                          <span>{thisChatMuted ? "Unmute Notifications" : "Mute Notifications"}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            thisChatMuted
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {thisChatMuted ? "Muted" : "Active"}
                        </span>
                      </button>

                      <div className="my-1 h-px bg-[var(--border)]/60" />

                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          setClearChatModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all text-left cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                        <span>Clear Chat History</span>
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {/* ═══ In-Chat Message Search Bar ═══ */}
          {showInChatSearch && (
            <div className="px-4 py-2 bg-[var(--surface-2)]/90 backdrop-blur-md border-b border-[var(--border)]/60 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 z-20">
              <div className="relative flex-1 flex items-center">
                <Search className="size-3.5 text-white/50 absolute left-3" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search in this chat…"
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-8 pr-16 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                {inChatSearchQuery && (
                  <span className="absolute right-3 text-[10.5px] font-semibold text-white/60 select-none">
                    {searchMatches.length > 0
                      ? `${activeMatchIndex + 1} of ${searchMatches.length}`
                      : "0 of 0"}
                  </span>
                )}
              </div>

              {searchMatches.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevSearchMatch}
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Previous match"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSearchMatch}
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Next match"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowInChatSearch(false);
                  setInChatSearchQuery("");
                }}
                className="p-1 rounded-full text-white/60 hover:text-white transition-colors"
                title="Close search"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* ═══ Pinned Message Banner ═══ */}
          {pinnedMessage && (
            <div className="px-4 py-2 bg-[var(--surface-2)]/95 backdrop-blur-xl border-b border-[var(--border)]/70 flex items-center justify-between gap-3 z-10 animate-in slide-in-from-top-2 duration-200">
              <button
                type="button"
                onClick={() => handleJumpToMessage(pinnedMessage._id)}
                className="flex-1 flex items-center gap-2.5 text-left overflow-hidden cursor-pointer group"
              >
                <div className="size-7 rounded-lg bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Pin className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                    Pinned Message
                  </span>
                  <span className="text-xs text-[var(--foreground)] truncate font-medium">
                    {pinnedMessage.message ||
                      (pinnedMessage.mediaUrl
                        ? pinnedMessage.mediaType === "audio"
                          ? "Voice Note"
                          : "Media Attachment"
                        : "Pinned message")}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleUnpinPinnedMessage}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Unpin message"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Messages container */}
          <div className="nova-chat__messages">
            <Messages
              selectedUser={selectedUser}
              onReplyMessage={(msg) => {
                setReplyingTo(msg);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
              }}
              searchQuery={inChatSearchQuery}
              activeSearchId={activeSearchMessageId}
              selectedMessageIds={selectedMessageIds}
              onToggleSelectMessage={handleToggleSelectMessage}
              currentWallpaper={chatWallpaper}
              onForwardSingleMessage={(msg) => {
                setForwardTargetMessageIds([msg._id]);
                setForwardSelectedUserIds([]);
                setForwardSearchQuery("");
                setForwardModalOpen(true);
              }}
            />
          </div>

          {/* Composer */}
          <div className="nova-chat__composer">
            {replyingTo && (
              <div className="nova-chat__reply">
                <span className="nova-chat__reply-bar" aria-hidden />
                <div className="nova-chat__reply-body">
                  <p className="nova-chat__reply-label">
                    Replying to{" "}
                    {(() => {
                      const repSenderId = (replyingTo.senderId?._id || replyingTo.senderId)?.toString();
                      if (repSenderId === user?._id?.toString()) return "yourself";
                      if (selectedUser?.isGroup) {
                        const member = selectedUser?.participants?.find(
                          (p) => (p?._id || p)?.toString() === repSenderId
                        );
                        return getDisplayName(member || replyingTo.senderId, "Member");
                      }
                      return getDisplayName(selectedUser, "User");
                    })()}
                  </p>
                  <p className="nova-chat__reply-text">
                    {replyingTo.message ||
                      (replyingTo.mediaType === "audio"
                        ? "Voice Note"
                        : replyingTo.mediaUrl
                        ? "Media Attachment"
                        : "Message")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  className="nova-chat__reply-close"
                >
                  <X className="size-3.5" strokeWidth={2.4} />
                </button>
              </div>
            )}

            {/* Hidden file input for Photo / Video attachment */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleMediaFileSelect}
            />

            {/* If recording voice, show sleek live voice recorder bar */}
            {isRecording ? (
              <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-gradient-to-r from-red-500/15 via-red-500/10 to-transparent border border-red-500/30 rounded-2xl animate-in fade-in duration-200 select-none w-full">
                {/* Blinking indicator & timer */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                  </span>
                  <span className="font-mono text-xs font-bold text-red-400 tracking-wider">
                    {formatDuration(recordingTime)}
                  </span>
                </div>

                {/* Real-time Frequency Soundwave Visualizer Bouncing to User's Voice */}
                <div className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-8 px-2 overflow-hidden">
                  {liveVolumeBars.map((heightPct, i) => (
                    <span
                      key={i}
                      className="w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-red-500 to-rose-400 transition-all duration-75"
                      style={{
                        height: `${heightPct}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Discard Recording */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  disabled={isSendingVoice}
                  className="p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  title="Discard recording"
                  aria-label="Discard recording"
                >
                  <Trash2 className="size-4" />
                </button>

                {/* Send Voice Note */}
                <button
                  type="button"
                  onClick={sendVoiceNote}
                  disabled={isSendingVoice}
                  className="nova-chat__send bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-lg shadow-emerald-600/30 shrink-0 transition-all cursor-pointer disabled:opacity-50"
                  title="Send voice note"
                  aria-label="Send voice note"
                >
                  {isSendingVoice ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" strokeWidth={2.2} />
                  )}
                </button>
              </div>
            ) : isMessageDisabled && selectedUser?.whoCanMessage === "no_one" ? (
              <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs sm:text-sm font-medium shadow-inner backdrop-blur-sm animate-in fade-in duration-200 text-center">
                <Lock className="size-4 text-amber-400 shrink-0" />
                <span>
                  {getDisplayName(selectedUser)} has disabled direct messages. Chat history is read-only.
                </span>
              </div>
            ) : isMessageDisabled && selectedUser?.whoCanMessage === "followers" ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs sm:text-sm shadow-inner backdrop-blur-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 min-w-0 text-white/80">
                  <Lock className="size-4 text-[var(--primary)] shrink-0" />
                  <span className="truncate">
                    Follow <span className="font-semibold text-white">{getDisplayName(selectedUser)}</span> to reply to this conversation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFollowFromChat}
                  disabled={isFollowingUser}
                  className="shrink-0 px-3.5 py-1.5 rounded-xl font-semibold text-xs text-white bg-[var(--primary)] hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[var(--primary)]/20 cursor-pointer disabled:opacity-50"
                >
                  {isFollowingUser ? "Following..." : "Follow"}
                </button>
              </div>
            ) : (
              <div className="nova-chat__composer-row">
                {/* Media Attachment Button */}
                <button
                  type="button"
                  disabled={isMessageDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isMessageDisabled ? messageDisabledReason : "Attach photo or video"}
                  aria-label="Attach media"
                >
                  <Paperclip className="size-4.5" strokeWidth={2.2} />
                </button>

                <div className="nova-chat__input-wrap">
                  <input
                    ref={inputRef}
                    type="text"
                    name="chat-message"
                    autoComplete="off"
                    autoCorrect="on"
                    spellCheck="true"
                    data-form-type="other"
                    value={textMessage}
                    disabled={isMessageDisabled}
                    onChange={messageChangeHandler}
                    placeholder={isMessageDisabled ? messageDisabledReason : "Write a message…"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (isMessageDisabled) {
                          toast.error(messageDisabledReason);
                          return;
                        }
                        sendMessageHandler(selectedUser?._id);
                      }
                    }}
                    className={`nova-chat__input ${
                      isMessageDisabled ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* If text is typed, show Send button; otherwise show WhatsApp-style Microphone button */}
                {textMessage.trim() ? (
                  <button
                    onClick={() => sendMessageHandler(selectedUser?._id)}
                    disabled={!textMessage.trim() || sending || isMessageDisabled}
                    aria-label="Send message"
                    className="nova-chat__send disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send
                      className={`size-4 transition-transform duration-300 ${
                        sending ? "translate-x-1 -translate-y-1 opacity-70" : ""
                      }`}
                      strokeWidth={2.2}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isMessageDisabled}
                    onClick={startRecording}
                    className="nova-chat__send bg-white/10 hover:bg-[var(--primary)] text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isMessageDisabled ? messageDisabledReason : "Record voice note"}
                    aria-label="Record voice note"
                  >
                    <Mic className="size-4" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ═══ Media Attachment Preview Modal ═══ */}
          {selectedMediaFile && mediaPreviewUrl && (
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
              onClick={cancelMediaModal}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-[#18181b] border border-white/10 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ImageIcon className="size-4 text-[var(--primary)]" />
                    <span>Send {mediaType === "video" ? "Video" : "Photo"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelMediaModal}
                    className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Media Preview Box */}
                <div className="relative rounded-xl overflow-hidden bg-black/60 flex items-center justify-center max-h-80 border border-white/10">
                  {mediaType === "video" ? (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      className="max-h-80 w-auto rounded-xl object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreviewUrl}
                      alt="Preview"
                      className="max-h-80 w-auto rounded-xl object-contain"
                    />
                  )}
                </div>

                {/* Caption Input */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Add a caption…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMediaMessage();
                      }
                    }}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelMediaModal}
                    disabled={uploadingMedia}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendMediaMessage}
                    disabled={uploadingMedia}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--primary)] hover:opacity-90 text-xs font-semibold text-white transition-opacity active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingMedia ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <motion.section
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="nova-chat__empty-window flex flex-col items-center justify-center p-8 text-center select-none"
        >
          <motion.div
            className="relative mb-6"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glowing backdrop matching dynamic theme */}
            <div className="absolute -inset-4 rounded-full bg-[var(--primary)]/20 blur-2xl pointer-events-none" />
            <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-[var(--primary)]/30 via-[var(--primary)]/10 to-pink-500/20 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl ring-1 ring-white/15 group cursor-pointer">
              <AnimatedIcon icon={MessageCircleIcon} size={36} className="text-[var(--primary)]" />
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 size-8 rounded-2xl bg-[var(--surface-2)] border border-white/10 flex items-center justify-center shadow-md cursor-pointer group"
              whileHover={{ scale: 1.15, rotate: 12 }}
            >
              <AnimatedIcon icon={SparklesIcon} size={16} className="text-amber-400" />
            </motion.div>
          </motion.div>

          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-2 font-[var(--font-display)]">
            Nova Messenger
          </h2>
          <p className="max-w-md text-sm text-[var(--muted-foreground)] leading-relaxed mb-6">
            Send and receive instant messages, share photos, and connect in real-time groups. Select a conversation to start chatting.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md mb-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <AnimatedIcon icon={UserGroupIcon} size={15} className="text-[var(--primary)]" />
              <span>Real-time Group chats</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <AnimatedIcon icon={SparklesIcon} size={15} className="text-pink-400" />
              <span>Media & Voice notes</span>
            </motion.div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => {
              welcomeGroupIconRef.current?.startAnimation?.();
              setCreateGroupOpen(true);
            }}
            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-[var(--primary)]/25 transition-all flex items-center gap-2 cursor-pointer group"
          >
            <AnimatedIcon
              ref={welcomeGroupIconRef}
              icon={UserGroupIcon}
              size={18}
              duration={1}
            />
            <span>Create New Group</span>
          </motion.button>
        </motion.section>
      )}

      {/* ═══ Multi-Delete Messages Dialog ═══ */}
      <Dialog open={multiDeleteModalOpen} onOpenChange={setMultiDeleteModalOpen}>
        <DialogContent className="max-w-sm bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Trash2 className="size-4 text-red-400" />
              Delete {selectedMessageIds.length}{" "}
              {selectedMessageIds.length === 1 ? "Message" : "Messages"}?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-[var(--muted-foreground)] pt-1">
            {canDeleteForEveryone
              ? "You can delete these messages for yourself or for everyone in this chat."
              : "Delete these messages for yourself? They will still be visible to other participants."}
          </p>

          <div className="flex flex-col gap-2 pt-3">
            {canDeleteForEveryone && (
              <button
                type="button"
                disabled={multiDeleting}
                onClick={() => handleExecuteMultiDelete("everyone")}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {multiDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete for Everyone
              </button>
            )}

            <button
              type="button"
              disabled={multiDeleting}
              onClick={() => handleExecuteMultiDelete("me")}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)] transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {multiDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete for Me
            </button>

            <button
              type="button"
              disabled={multiDeleting}
              onClick={() => setMultiDeleteModalOpen(false)}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Clear Chat History Confirmation Dialog (Double-safety Enter Protection) ═══ */}
      <Dialog open={clearChatModalOpen} onOpenChange={setClearChatModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-6 rounded-3xl shadow-2xl shadow-black/80">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Delete All Chat History?
                </DialogTitle>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Permanent Database & Profile Deletion
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed space-y-2.5">
            <p>
              Are you sure you want to permanently delete all messages in your conversation with{" "}
              <span className="font-bold text-[var(--foreground)]">
                {getDisplayName(selectedUser)}
              </span>
              ?
            </p>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">
                All messages and attachments will be deleted directly from the database and both profiles. This action cannot be reversed.
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3">
            {/* NO / CANCEL: ACTIVE & FOCUSED BY DEFAULT TO PREVENT ACCIDENTAL ENTER KEY DELETE */}
            <button
              type="button"
              autoFocus
              disabled={clearingChat}
              onClick={() => setClearChatModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/40 focus:ring-4 focus:ring-primary/60 transition-all cursor-pointer shadow-md text-center"
            >
              No, Keep Messages
            </button>

            {/* YES / DELETE BUTTON */}
            <button
              type="button"
              disabled={clearingChat}
              onClick={handleClearChatHistory}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50"
            >
              {clearingChat ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              <span>Yes, Delete Everything</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Chat Wallpaper Dialog ═══ */}
      <Dialog open={wallpaperModalOpen} onOpenChange={setWallpaperModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              Choose Chat Wallpaper
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-[var(--muted-foreground)] pt-0.5">
            Personalize your messaging background with futuristic cyberpunk themes.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 max-h-80 overflow-y-auto pr-1">
            {WALLPAPERS.map((wp) => {
              const isCurrent = chatWallpaper === wp.id;
              return (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(wp.id)}
                  className={`relative p-2.5 rounded-2xl border transition-all text-left flex flex-col gap-2 group cursor-pointer ${
                    isCurrent
                      ? "border-primary ring-2 ring-primary/40 bg-primary/10"
                      : "border-[var(--border)] hover:border-white/30 bg-[var(--surface-2)]/60"
                  }`}
                >
                  <div
                    className={`w-full h-16 rounded-xl border ${wp.preview} flex items-center justify-center relative overflow-hidden`}
                  >
                    {isCurrent && (
                      <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--foreground)] truncate">
                      {wp.name}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                      {wp.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Starred Messages Dialog ═══ */}
      <Dialog open={starredModalOpen} onOpenChange={setStarredModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-5 sm:p-6 rounded-3xl shadow-2xl shadow-black/80 max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30 flex items-center justify-center shrink-0">
                <Star className="size-5 fill-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Starred Messages
                </DialogTitle>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {starredMessages.length} starred in this conversation
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[160px] pr-1">
            {loadingStarred ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-amber-400" />
              </div>
            ) : starredMessages.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <div className="size-12 rounded-full bg-amber-500/10 text-amber-400/60 flex items-center justify-center mb-2">
                  <Star className="size-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">No starred messages</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[240px]">
                  Tap the star option on any message to save it here for fast reference.
                </p>
              </div>
            ) : (
              starredMessages.map((msg) => {
                const isMsgMine = isSameUser(msg.senderId, user?._id);
                return (
                  <div
                    key={msg._id}
                    className="p-3 rounded-2xl bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] border border-[var(--border)] transition-all flex flex-col gap-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-400">
                        {isMsgMine ? "You" : getDisplayName(selectedUser)}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(msg.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--foreground)] leading-relaxed break-words line-clamp-3">
                      {msg.message ||
                        (msg.mediaUrl
                          ? msg.mediaType === "audio"
                            ? "🎵 Voice Note"
                            : "📷 Photo/Video"
                          : "")}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setStarredModalOpen(false);
                          handleJumpToMessage(msg._id);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[var(--foreground)] hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        Go to message
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnstarFromModal(msg._id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-1"
                        title="Unstar message"
                      >
                        <Trash2 className="size-3" />
                        <span>Unstar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Forward Messages Dialog ═══ */}
      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-5 sm:p-6 rounded-3xl shadow-2xl shadow-black/80 max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30 flex items-center justify-center shrink-0">
                <Forward className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Forward Message{forwardTargetMessageIds.length > 1 ? "s" : ""}
                </DialogTitle>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Select friends or conversations to share with
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Search Box */}
          <div className="relative my-2 shrink-0">
            <Search className="size-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={forwardSearchQuery}
              onChange={(e) => setForwardSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto py-1 space-y-1 min-h-[180px] max-h-[260px] pr-1">
            {forwardCandidates.length === 0 ? (
              <p className="text-xs text-center text-[var(--muted-foreground)] py-8">
                No matching friends or conversations found.
              </p>
            ) : (
              forwardCandidates.map((c) => {
                const isSelected = forwardSelectedUserIds.includes(c._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleToggleForwardUser(c._id)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-500/15 border border-sky-500/30"
                        : "hover:bg-[var(--surface-2)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage src={c.profilePicture} />
                        <AvatarFallback>
                          {getDisplayName(c, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--foreground)] truncate">
                          {getDisplayName(c)}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                          @{c.username}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`size-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-sky-500 border-sky-500 text-white shadow-sm"
                          : "border-[var(--border)] bg-[var(--surface-2)]"
                      }`}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)] shrink-0">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              {forwardSelectedUserIds.length} recipient
              {forwardSelectedUserIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForwardModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={forwardSelectedUserIds.length === 0 || forwarding}
                onClick={handleExecuteForward}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 active:scale-95 text-white transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                {forwarding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Forward className="size-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Group Modal ═══ */}
      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        contacts={contacts}
        onGroupCreated={(group) => {
          conversationRequest.retry();
          if (group?.user || group?._id) {
            dispatch(setSelectedUser(group.user || group));
          }
        }}
      />

      {/* ═══ Group Info Drawer ═══ */}
      {selectedUser?.isGroup && (
        <GroupInfoDrawer
          open={groupInfoOpen}
          onOpenChange={setGroupInfoOpen}
          group={selectedUser}
          currentUser={user}
          allContacts={contacts}
          onGroupUpdated={(updatedGroup) => {
            conversationRequest.retry();
            if (updatedGroup) {
              dispatch(setSelectedUser(updatedGroup.user || updatedGroup));
            }
          }}
          onLeaveGroup={() => {
            conversationRequest.retry();
            dispatch(setSelectedUser(null));
          }}
        />
      )}

      {/* ═══ Delete Chat Confirmation Modal ═══ */}
      <Dialog
        open={deleteChatModal.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteChatModal({ open: false, contact: null, isFollowing: false });
        }}
      >
        <DialogContent className="max-w-sm bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Trash2 className="size-4 text-rose-400" />
              <span>
                {deleteChatModal.contact?.isGroup
                  ? "Leave Group?"
                  : "Delete Chat?"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
            {deleteChatModal.contact?.isGroup ? (
              <p>
                Are you sure you want to leave{" "}
                <strong className="text-[var(--foreground)]">{deleteChatModal.contact?.groupName}</strong>?
                You will no longer receive messages from this group.
              </p>
            ) : (
              <p>
                Do you want to delete this chat with{" "}
                <strong className="text-[var(--foreground)]">{getDisplayName(deleteChatModal.contact)}</strong>?
                <br />
                <span className="block mt-2 text-[11px] text-[var(--muted-foreground)]/80">
                  This will remove the chat from your list and delete message history for you. The other person will keep their copy. If either of you sends a message in the future, it will start fresh for you.
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]/60">
            <button
              type="button"
              disabled={deletingChat}
              onClick={() => setDeleteChatModal({ open: false, contact: null, isFollowing: false })}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingChat}
              onClick={handleDeleteChatConfirm}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {deletingChat ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>
                {deleteChatModal.contact?.isGroup ? "Leave Group" : "Delete Chat"}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
