import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setSelectedUser, updateUserLastSeen } from "@/redux/authSlice";
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
} from "lucide-react";
import Messages from "@/components/chat/Messages";
import axios from "axios";
import {
  setMessages,
  deleteMultipleMessagesForMe,
  clearAllMessages,
  setPinnedMessage,
  toggleStarMessageLocal,
} from "@/redux/chatSlice";
import { getDisplayName, getErrorMessage, formatLastSeen, isSameUser } from "@/lib/utils";
import { toast } from "sonner";
import { getSocketInstance } from "@/redux/socketSlice";
import useGetConversations from "@/hooks/useGetConversations";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { useLocation, useNavigate } from "react-router-dom";
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

const ChatPage = () => {
  const { user, suggestedUsers, selectedUser } = useSelector((s) => s.auth);
  const { onlineUsers, messages, pinnedMessage } = useSelector((s) => s.chat);
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
      dispatch(setPinnedMessage(data?.pinnedMessage || null));
    };
    socket.on("userLastSeen", handleUserLastSeen);
    socket.on("conversationPinnedUpdated", handleConversationPinnedUpdated);
    return () => {
      socket.off("userLastSeen", handleUserLastSeen);
      socket.off("conversationPinnedUpdated", handleConversationPinnedUpdated);
    };
  }, [dispatch]);

  const othersOnline = (onlineUsers || []).filter((id) => id !== user?._id);
  const othersOnlineCount = othersOnline.length;

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
  }, [dispatch, location.state]);

  /* ---------- AUTO SELECT LATEST (desktop only) ---------- */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (
      !isMobile &&
      !selectedUser &&
      !location.state?.user?._id &&
      !conversationRequest.loading &&
      conversationRequest.conversations.length > 0
    ) {
      const latest = conversationRequest.conversations[0].user;
      if (latest?._id) dispatch(setSelectedUser(latest));
    }
  }, [
    conversationRequest.conversations,
    conversationRequest.loading,
    dispatch,
    location.state,
    selectedUser,
  ]);

  /* ═══ VOICE NOTE RECORDING HANDLERS ═══ */
  const stopAudioVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (_) {}
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
        } catch (_) {}
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
    socket?.emit("stopTyping", { receiverId });
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

    clearTimeout(typingTimeoutRef.current);
    if (!next.trim()) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
      return;
    }
    socket.emit("typing", { receiverId: selectedUser._id });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }, 1200);
  };

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [selectedUser]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedUser?._id]);

  /* ---------- CONTACTS ---------- */
  const conversationUsers = conversationRequest.conversations
    .map((c) => c.user)
    .filter((u) => u?._id);
  const conversationUserIds = new Set(
    conversationUsers.map((u) => u._id.toString())
  );
  const contacts = [
    ...conversationUsers,
    ...suggestedUsers.filter((u) => !conversationUserIds.has(u._id?.toString())),
  ];

  const forwardCandidates = useMemo(() => {
    const q = forwardSearchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!c?._id || c._id === user?._id) return false;
      if (!q) return true;
      return (
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q))
      );
    });
  }, [contacts, forwardSearchQuery, user?._id]);

  const filteredUsers = contacts.filter((u) =>
    `${u.fullName || ""} ${u.username}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getConversationForUser = (userId) =>
    conversationRequest.conversations.find((c) => c.user?._id === userId);

  return (
    <div className="nova-chat">
      {/* ═══════════ CONTACTS PANEL ═══════════ */}
      <aside
        className={`nova-chat__contacts ${showContacts ? "is-open" : ""} ${
          collapsed ? "is-collapsed" : ""
        }`}
      >
        <button
          type="button"
          className="nova-chat__collapse"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand contacts" : "Collapse contacts"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" strokeWidth={2.4} />
          ) : (
            <ChevronLeft className="size-4" strokeWidth={2.4} />
          )}
        </button>

        <div className="nova-chat__contacts-head">
          <div className="nova-chat__contacts-title-row">
            <h1 className="nova-chat__contacts-title">
              <Sparkles className="size-4" strokeWidth={2.2} />
              <span className="nova-chat__contacts-title-text">Messages</span>
            </h1>

            <div className="nova-chat__contacts-actions">
              {othersOnlineCount > 0 ? (
                <span className="nova-chat__online-pill">
                  <span className="nova-chat__online-dot" />
                  <span>{othersOnlineCount}</span>
                </span>
              ) : (
                <span className="nova-chat__solo-pill">Solo</span>
              )}

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

          <div className="nova-chat__search">
            <Search className="nova-chat__search-icon" strokeWidth={1.9} />
            <input
              type="text"
              placeholder="Search people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nova-chat__search-input"
            />
          </div>
        </div>

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
                <p className="nova-chat__empty-title">No one matches</p>
                <p className="nova-chat__empty-sub">Try a different search</p>
              </div>
            )}

          {filteredUsers.map((u, idx) => {
            const isOnline = onlineUsers.includes(u?._id);
            const isSelected = selectedUser?._id === u._id;
            const conversation = getConversationForUser(u._id);
            const hasConversation = Boolean(conversation);

            return (
              <button
                key={u._id}
                onClick={() => openConversation(u)}
                className={`nova-chat__contact ${
                  isSelected ? "is-selected" : ""
                }`}
                style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
                title={getDisplayName(u)}
              >
                <span className="nova-chat__contact-avatar">
                  <Avatar className="size-11">
                    <AvatarImage src={u?.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(u, "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && <span className="nova-chat__status-dot" />}
                </span>

                <span className="nova-chat__contact-meta">
                  <span className="nova-chat__contact-name">
                    {getDisplayName(u)}
                  </span>
                  <span
                    className={`nova-chat__contact-sub ${
                      isOnline ? "is-online" : ""
                    }`}
                  >
                    {isOnline
                      ? "Online"
                      : (liveLastSeen[u?._id] || u?.lastSeen)
                      ? formatLastSeen(liveLastSeen[u?._id] || u?.lastSeen)
                      : hasConversation
                      ? "Tap to chat"
                      : "Suggested"}
                  </span>
                </span>

                {conversation?.unreadCount > 0 && !isSelected && (
                  <span className="nova-chat__unread">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}

                {!conversation?.unreadCount &&
                  !isSelected &&
                  hasConversation && (
                    <span className="nova-chat__contact-chevron" aria-hidden>
                      ›
                    </span>
                  )}
              </button>
            );
          })}
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
                  aria-label="Open chats menu"
                  title="Menu"
                >
                  <Menu className="size-5" strokeWidth={2.2} />
                </button>

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
                          onlineUsers.includes(selectedUser?._id) ? "is-online" : ""
                        }`}
                      >
                        {onlineUsers.includes(selectedUser?._id)
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

                {/* Right Action Icons: Search & 3-Dots Settings */}
                <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
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
              onReplyMessage={setReplyingTo}
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
                    {replyingTo.senderId?.toString() === user?._id?.toString()
                      ? "yourself"
                      : getDisplayName(selectedUser, "User")}
                  </p>
                  <p className="nova-chat__reply-text">{replyingTo.message}</p>
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
            ) : (
              <div className="nova-chat__composer-row">
                {/* Media Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Attach photo or video"
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
                    onChange={messageChangeHandler}
                    placeholder="Write a message…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageHandler(selectedUser?._id);
                      }
                    }}
                    className="nova-chat__input"
                  />
                </div>

                {/* If text is typed, show Send button; otherwise show WhatsApp-style Microphone button */}
                {textMessage.trim() ? (
                  <button
                    onClick={() => sendMessageHandler(selectedUser?._id)}
                    disabled={!textMessage.trim() || sending}
                    aria-label="Send message"
                    className="nova-chat__send"
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
                    onClick={startRecording}
                    className="nova-chat__send bg-white/10 hover:bg-[var(--primary)] text-white transition-all cursor-pointer"
                    title="Record voice note"
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
        <section className="nova-chat__empty-window">
          <div className="nova-chat__empty-window-orb">
            <MessageCircle className="size-6" strokeWidth={1.8} />
            <span className="nova-chat__empty-window-glow" aria-hidden />
          </div>
          <h2 className="nova-chat__empty-window-title">Your messages</h2>
          <p className="nova-chat__empty-window-sub">
            Pick a conversation to start chatting. Fast, private, and alive.
          </p>
        </section>
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
    </div>
  );
};

export default ChatPage;
