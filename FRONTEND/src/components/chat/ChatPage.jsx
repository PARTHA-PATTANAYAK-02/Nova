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
} from "lucide-react";
import Messages from "@/components/chat/Messages";
import axios from "axios";
import { setMessages } from "@/redux/chatSlice";
import { getDisplayName, getErrorMessage, formatLastSeen } from "@/lib/utils";
import { toast } from "sonner";
import { getSocketInstance } from "@/redux/socketSlice";
import useGetConversations from "@/hooks/useGetConversations";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { useLocation } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { playMessageSound } from "@/lib/sound";
import ChatUserMenu from "@/components/chat/ChatUserMenu";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const ChatPage = () => {
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

  const { user, suggestedUsers, selectedUser } = useSelector((s) => s.auth);
  const { onlineUsers, messages } = useSelector((s) => s.chat);

  const conversationRequest = useGetConversations();
  const suggestedUserRequest = useGetSuggestedUsers();
  const dispatch = useDispatch();

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
    // Reset search when changing user
    setShowInChatSearch(false);
    setInChatSearchQuery("");
    setActiveMatchIndex(0);
  }, [selectedUser?._id]);

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
    socket.on("userLastSeen", handleUserLastSeen);
    return () => {
      socket.off("userLastSeen", handleUserLastSeen);
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

            {/* In-Chat Search Toggle Button */}
            <div className="ml-auto flex items-center gap-2">
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
            </div>
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

          {/* Messages container */}
          <div className="nova-chat__messages">
            <Messages
              selectedUser={selectedUser}
              onReplyMessage={setReplyingTo}
              searchQuery={inChatSearchQuery}
              activeSearchId={activeSearchMessageId}
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
    </div>
  );
};

export default ChatPage;
