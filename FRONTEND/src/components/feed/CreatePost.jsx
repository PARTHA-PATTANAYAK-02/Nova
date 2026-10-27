import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ImagePlus,
  Video,
  X,
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
  UserPlus,
} from "lucide-react";
import { TagIcon } from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const CAPTION_MAX = 500;
const MAX_FILES = 5;

const AI_TONES = [
  { id: "trending", label: "🔥 Trending" },
  { id: "aesthetic", label: "🌸 Aesthetic" },
  { id: "genz", label: "⚡ Gen-Z" },
  { id: "deep", label: "💭 Deep & Quotes" },
  { id: "minimal", label: "✨ Minimal" },
  { id: "humor", label: "😂 Humor" },
];

const CreatePost = ({ open, setOpen }) => {
  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);
  const [files, setFiles] = useState([]); // [{ id, file, url, isVideo, name }]
  const [activeIdx, setActiveIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // AI Caption states
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState("trending");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Tagging states
  const [taggedUsers, setTaggedUsers] = useState([]); // [{ user: { _id, username, fullName, profilePicture }, x, y, mediaIndex }]
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [pendingTagCoords, setPendingTagCoords] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Collaborator states ("is with" / Co-author)
  const [collaborators, setCollaborators] = useState([]); // [{ _id, username, fullName, profilePicture }]
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabSearchQuery, setCollabSearchQuery] = useState("");
  const [collabSearchResults, setCollabSearchResults] = useState([]);
  const [collabSuggestedUsers, setCollabSuggestedUsers] = useState([]);
  const [searchingCollab, setSearchingCollab] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { posts } = useSelector((s) => s.post);

  // Fetch suggested users for tagging when tag modal opens
  useEffect(() => {
    if (!tagModalOpen) return;
    axios
      .get(apiUrl("/api/v1/user/suggested?type=tag"), { withCredentials: true })
      .then((res) => {
        if (res.data?.success) setSuggestedUsers(res.data.users || []);
      })
      .catch(() => {});
  }, [tagModalOpen]);

  // Search users for tagging with debounce
  useEffect(() => {
    if (!tagModalOpen) return;
    const q = tagSearchQuery.trim();
    if (q.length < 2) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await axios.get(
          apiUrl(`/api/v1/user/search?type=tag&q=${encodeURIComponent(q)}`),
          { withCredentials: true }
        );
        if (res.data?.success) {
          setUserSearchResults(res.data.users || []);
        }
      } catch (err) {
        console.error("Search users error:", err);
      } finally {
        setSearchingUsers(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [tagSearchQuery, tagModalOpen]);

  // Fetch suggested users for collaboration (mutual followers) when collab modal opens
  useEffect(() => {
    if (!collabModalOpen) return;
    axios
      .get(apiUrl("/api/v1/user/suggested?type=collab"), { withCredentials: true })
      .then((res) => {
        if (res.data?.success) setCollabSuggestedUsers(res.data.users || []);
      })
      .catch(() => {});
  }, [collabModalOpen]);

  // Search users for collaboration (mutual followers) with debounce
  useEffect(() => {
    if (!collabModalOpen) return;
    const q = collabSearchQuery.trim();
    if (q.length < 2) {
      setCollabSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCollab(true);
      try {
        const res = await axios.get(
          apiUrl(`/api/v1/user/search?type=collab&q=${encodeURIComponent(q)}`),
          { withCredentials: true }
        );
        if (res.data?.success) {
          setCollabSearchResults(res.data.users || []);
        }
      } catch (err) {
        console.error("Search collab error:", err);
      } finally {
        setSearchingCollab(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [collabSearchQuery, collabModalOpen]);

  const handleAddCollaborator = (userToCollab) => {
    if (!userToCollab) return;
    const userId = userToCollab._id || userToCollab.id;
    if (collaborators.some((c) => (c._id || c) === userId)) {
      toast.info(`@${userToCollab.username} is already invited as collaborator.`);
      setCollabModalOpen(false);
      return;
    }
    setCollaborators((prev) => [
      ...prev,
      {
        _id: userId,
        username: userToCollab.username,
        fullName: userToCollab.fullName,
        profilePicture: userToCollab.profilePicture,
      },
    ]);
    toast.success(`Added @${userToCollab.username} as co-author 🤝`);
    setCollabModalOpen(false);
    setCollabSearchQuery("");
  };

  const handleRemoveCollaborator = (userIdToRemove) => {
    setCollaborators((prev) =>
      prev.filter((c) => (c._id || c) !== userIdToRemove)
    );
  };

  const handleAddTag = (userToTag) => {
    if (!userToTag) return;
    const userId = userToTag._id || userToTag.id;
    const alreadyTagged = taggedUsers.some(
      (t) => (t.user._id || t.user) === userId && t.mediaIndex === activeIdx
    );
    if (alreadyTagged) {
      toast.info(`@${userToTag.username} is already tagged on this item.`);
      setTagModalOpen(false);
      setPendingTagCoords(null);
      return;
    }

    const coords = pendingTagCoords || { x: 50, y: 50 };
    setTaggedUsers((prev) => [
      ...prev,
      {
        user: {
          _id: userId,
          username: userToTag.username,
          fullName: userToTag.fullName,
          profilePicture: userToTag.profilePicture,
        },
        x: coords.x,
        y: coords.y,
        mediaIndex: activeIdx,
      },
    ]);
    toast.success(`Tagged @${userToTag.username} ✨`);
    setTagModalOpen(false);
    setPendingTagCoords(null);
    setTagSearchQuery("");
  };

  const removeTag = (userIdToRemove, mediaIdx) => {
    setTaggedUsers((prev) =>
      prev.filter(
        (t) =>
          !(
            (t.user._id || t.user) === userIdToRemove &&
            (mediaIdx === undefined || t.mediaIndex === mediaIdx)
          )
      )
    );
  };

  // Clean up blob URLs on unmount or when files change
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    };
  }, []);

  const addFilesToState = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const availableSlots = MAX_FILES - files.length;
    if (availableSlots <= 0) {
      toast.error(`Maximum ${MAX_FILES} photos or videos allowed per post.`);
      return;
    }

    const filesToProcess = Array.from(selectedFiles).slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      toast.info(`Only ${availableSlots} more file(s) can be added (max ${MAX_FILES}).`);
    }

    const validNewItems = [];
    for (const f of filesToProcess) {
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");
      if (!isImage && !isVideo) {
        toast.error(`"${f.name}" is not a supported image or video.`);
        continue;
      }
      if (isVideo && f.size > 50 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 50 MB video limit.`);
        continue;
      }
      if (isImage && f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 10 MB image limit.`);
        continue;
      }

      const url = URL.createObjectURL(f);
      validNewItems.push({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        url,
        isVideo,
        name: f.name,
      });
    }

    if (validNewItems.length > 0) {
      setFiles((prev) => {
        const next = [...prev, ...validNewItems];
        setActiveIdx(next.length - 1);
        return next;
      });
    }
  };

  const removeFile = (idToRemove, e) => {
    e?.stopPropagation?.();
    setFiles((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target?.url) URL.revokeObjectURL(target.url);
      const next = prev.filter((item) => item.id !== idToRemove);
      if (activeIdx >= next.length) {
        setActiveIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const clearAllFiles = () => {
    files.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    setFiles([]);
    setActiveIdx(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

  const fileChangeHandler = (e) => {
    const list = e.target.files;
    if (list && list.length > 0) {
      addFilesToState(list);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const list = e.dataTransfer.files;
    if (list && list.length > 0) {
      addFilesToState(list);
    }
  };

  const resetForm = () => {
    clearAllFiles();
    setCaption("");
    setLoading(false);
    setDragging(false);
    setAiPanelOpen(false);
    setAiSuggestion(null);
    setAiCustomPrompt("");
    setTaggedUsers([]);
    setPendingTagCoords(null);
    setTagModalOpen(false);
    setTagSearchQuery("");
    setCollaborators([]);
    setCollabModalOpen(false);
    setCollabSearchQuery("");
  };

  const handleClose = () => {
    if (loading || generatingAi) return;
    setOpen(false);
    resetForm();
  };

  const handleGenerateAiCaption = async (toneOverride) => {
    try {
      setGeneratingAi(true);
      const toneToUse = toneOverride || selectedTone;
      const fd = new FormData();
      fd.append("tone", toneToUse);

      const promptText = aiCustomPrompt.trim() || caption.trim();
      if (promptText) {
        fd.append("prompt", promptText);
      }

      // If active media is an image, or first media is an image, use it for Gemini vision
      const activeFile = files[activeIdx]?.file;
      const imageToUse = (activeFile && activeFile.type?.startsWith("image/"))
        ? activeFile
        : files.find((f) => f.file.type?.startsWith("image/"))?.file;

      if (imageToUse) {
        fd.append("image", imageToUse);
      }

      const res = await axios.post(apiUrl("/api/v1/post/ai-caption"), fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.success) {
        setAiSuggestion(res.data);
        const isGemini = res.data.model && res.data.model.includes("gemini");
        toast.success(
          isGemini
            ? "✨ Generated with Gemini Vision!"
            : "✨ AI Caption & Hashtags ready!",
        );
      }
    } catch (err) {
      console.error("AI Caption error:", err);
      toast.error(
        err?.response?.data?.message || "Could not generate AI caption.",
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApplyAiCaption = () => {
    if (!aiSuggestion) return;
    const textToApply =
      aiSuggestion.fullText ||
      `${aiSuggestion.caption || ""}\n\n${(aiSuggestion.hashtags || []).join(" ")}`.trim();
    setCaption(textToApply.slice(0, CAPTION_MAX));
    toast.success("AI Caption applied to post! ✨");
    setAiPanelOpen(false);
  };

  const createPostHandler = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to share posts.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please select at least one photo or video.");
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("caption", caption);

      // Append all selected files to 'media' array
      files.forEach((item) => {
        fd.append("media", item.file);
      });

      // Append tagged users
      if (taggedUsers.length > 0) {
        fd.append(
          "taggedUsers",
          JSON.stringify(
            taggedUsers.map((t) => ({
              user: t.user._id || t.user,
              x: t.x,
              y: t.y,
              mediaIndex: t.mediaIndex,
            }))
          )
        );
      }

      // Append collaborators ("is with" / co-authors)
      if (collaborators.length > 0) {
        fd.append(
          "collaborators",
          JSON.stringify(collaborators.map((c) => c._id || c.id))
        );
      }

      const res = await axios.post(apiUrl("/api/v1/post/addpost"), fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.post) {
        dispatch(setPosts([res.data.post, ...posts]));
      }
      toast.success(
        files.length > 1
          ? `Carousel post with ${files.length} items shared!`
          : "Post shared successfully!"
      );
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to share post.");
    } finally {
      setLoading(false);
    }
  };

  const currentMedia = files[activeIdx];

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : null)}>
        <DialogContent
          className="p-0 overflow-hidden w-full max-w-[95vw] md:max-w-4xl lg:max-w-5xl h-[92vh] max-h-[740px] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_32px_80px_-24px_rgba(0,0,0,.5),0_8px_30px_-10px_var(--glow)] select-none"
          showCloseButton={false}
          onInteractOutside={(e) => {
            if (loading || generatingAi) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (loading || generatingAi) e.preventDefault();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
            <div>
              <DialogTitle className="text-base font-bold text-[var(--foreground)] tracking-tight">
                Create new post
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                {files.length > 1
                  ? `Carousel post · ${files.length} of ${MAX_FILES} items`
                  : "Share a photo, video or carousel with your community"}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || generatingAi}
              className="size-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body Container */}
          <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
            {/* ═══════════ LEFT COLUMN: MEDIA PREVIEW & CAROUSEL (7 cols on desktop) ═══════════ */}
            <div className="md:col-span-7 bg-[#0a0a0f] flex flex-col items-center justify-between relative overflow-hidden select-none h-[40vh] md:h-full border-b md:border-b-0 border-[var(--border)]">
              {files.length > 0 && currentMedia ? (
                <>
                  {/* Media Viewport */}
                  <div
                    className={`flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden bg-black/85 select-none ${
                      !currentMedia.isVideo ? "cursor-crosshair" : ""
                    }`}
                    onClick={(e) => {
                      if (currentMedia.isVideo) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                      setPendingTagCoords({ x, y });
                      setTagModalOpen(true);
                    }}
                  >
                    {currentMedia.isVideo ? (
                      <video
                        key={currentMedia.url}
                        src={currentMedia.url}
                        aria-label="Post video preview"
                        controls
                        playsInline
                        className="max-h-full max-w-full object-contain mx-auto"
                      />
                    ) : (
                      <img
                        key={currentMedia.url}
                        src={currentMedia.url}
                        alt="Post preview"
                        className="max-h-full max-w-full object-contain mx-auto pointer-events-none"
                      />
                    )}

                    {/* Tag Chips on Photo Preview */}
                    {taggedUsers
                      .filter((t) => t.mediaIndex === activeIdx)
                      .map((tag) => (
                        <div
                          key={tag.user._id || tag.user.username}
                          style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-full mb-1.5 z-30 pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/25 text-white text-[11px] font-semibold shadow-xl select-none">
                            <Avatar className="size-4 shrink-0">
                              <AvatarImage src={tag.user.profilePicture} />
                              <AvatarFallback className="text-[9px]">
                                {tag.user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>@{tag.user.username}</span>
                            <button
                              type="button"
                              title="Remove tag"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag.user._id, tag.mediaIndex);
                              }}
                              className="size-3.5 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
                            >
                              <X size={9} strokeWidth={2.5} />
                            </button>
                          </div>
                          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black/85 mx-auto" />
                        </div>
                      ))}

                    {/* Slide Counter Badge */}
                    {files.length > 1 && (
                      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider shadow-md border border-white/10">
                        {activeIdx + 1} / {files.length}
                      </div>
                    )}

                    {/* Clear All Media Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllFiles();
                      }}
                      title="Remove all media"
                      aria-label="Remove all media"
                      className="absolute top-3 right-3 z-20 size-7 rounded-full bg-black/70 hover:bg-red-500/90 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all shadow-md active:scale-90 cursor-pointer"
                    >
                      <X size={14} strokeWidth={2.2} />
                    </button>

                    {/* Tag People Pill Button on Preview */}
                    {!currentMedia.isVideo && (
                      <button
                        type="button"
                        title="Tag People"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingTagCoords({ x: 50, y: 50 });
                          setTagModalOpen(true);
                        }}
                        className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-md border border-white/25 text-white text-[11px] font-semibold shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <AnimatedIcon icon={TagIcon} size={13} className="text-pink-400" />
                        <span>
                          {taggedUsers.filter((t) => t.mediaIndex === activeIdx).length > 0
                            ? `${taggedUsers.filter((t) => t.mediaIndex === activeIdx).length} Tagged`
                            : "Tap photo to tag"}
                        </span>
                      </button>
                    )}

                    {/* Carousel Arrow Navigation */}
                    {files.length > 1 && (
                      <>
                        {activeIdx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveIdx((i) => Math.max(0, i - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90 shadow-lg cursor-pointer"
                            aria-label="Previous slide"
                          >
                            <ChevronLeft size={18} />
                          </button>
                        )}
                        {activeIdx < files.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveIdx((i) => Math.min(files.length - 1, i + 1));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90 shadow-lg cursor-pointer"
                            aria-label="Next slide"
                          >
                            <ChevronRight size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Docked Thumbnail Strip at Bottom of Left Column */}
                  <div className="w-full px-3 py-2 bg-black/70 backdrop-blur-md border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {files.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => setActiveIdx(idx)}
                        className={`group/thumb relative size-12 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          activeIdx === idx
                            ? "border-[var(--primary)] shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] scale-105"
                            : "border-white/15 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {item.isVideo ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        )}
                        <button
                          type="button"
                          title="Remove item"
                          onClick={(e) => removeFile(item.id, e)}
                          className="absolute top-0.5 right-0.5 size-3.5 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <X size={9} strokeWidth={2.4} />
                        </button>
                        {item.isVideo && (
                          <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/80 text-white text-[7px] font-bold">
                            VID
                          </span>
                        )}
                      </div>
                    ))}

                    {files.length < MAX_FILES && (
                      <>
                        <button
                          type="button"
                          onClick={() => addMoreInputRef.current?.click()}
                          title={`Add more (${files.length}/${MAX_FILES})`}
                          className="size-12 shrink-0 rounded-xl border border-dashed border-white/25 hover:border-[var(--primary)] hover:bg-white/5 text-white/60 hover:text-[var(--primary)] flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                        >
                          <Plus size={15} />
                          <span className="text-[8px] font-semibold">
                            +{MAX_FILES - files.length}
                          </span>
                        </button>
                        <input
                          ref={addMoreInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={fileChangeHandler}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Empty Upload Dropzone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full h-full flex flex-col items-center justify-center p-8 text-center transition-colors ${
                    dragging ? "bg-[var(--primary)]/10" : ""
                  }`}
                >
                  <div className="size-16 rounded-3xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-4 text-[var(--primary)] shadow-lg">
                    {dragging ? (
                      <Upload className="size-7 animate-bounce" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <ImagePlus size={22} />
                        <Video size={22} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {dragging ? "Drop files to upload" : "Drag photos and videos here"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)] max-w-[260px]">
                    Share up to 5 photos or videos in a swipeable carousel
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-grad-btn text-white text-xs font-semibold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <ImagePlus size={14} />
                    <span>Select from computer</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={fileChangeHandler}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* ═══════════ RIGHT COLUMN: AUTHOR, COLLABORATE, CAPTION & FOOTER (5 cols) ═══════════ */}
            <div className="md:col-span-5 flex flex-col h-full overflow-hidden border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--surface)]">
              {/* Author Header */}
              <div className="px-4 py-3 border-b border-[var(--border)]/60 flex items-center gap-2.5 shrink-0 bg-[var(--surface)]">
                <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-grad-btn p-[1.5px]">
                  <Avatar className="size-full">
                    <AvatarImage
                      src={user?.profilePicture}
                      alt={getDisplayName(user, "You")}
                    />
                    <AvatarFallback className="text-xs font-semibold">
                      {getDisplayName(user, "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                    {getDisplayName(user, "You")}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Post to everyone
                  </p>
                </div>
              </div>

              {/* Scrollable Right Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3 custom-scrollbar">
                {/* ── COLLABORATE / CO-AUTHOR ("is with") CARD ── */}
                <div className="p-3.5 rounded-2xl bg-[var(--surface-2)]/70 border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                        <Users size={12} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--foreground)]">
                          Collaborate / Co-author
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400">
                          is with
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    Invite a friend to co-author. The post appears on both feeds, and the header credits: <span className="font-semibold text-[var(--foreground)]">You with @friend</span>
                  </p>

                  {collaborators.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {collaborators.map((c) => (
                        <div
                          key={c._id || c.username}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-3)] border border-[var(--border)] text-xs shadow-sm"
                        >
                          <Avatar className="size-4 border border-[var(--border)]">
                            <AvatarImage src={c.profilePicture} />
                            <AvatarFallback className="text-[8px]">
                              {c.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-[var(--foreground)]">
                            @{c.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(c._id)}
                            className="size-4 rounded-full hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
                            title="Remove collaborator"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {collaborators.length < 3 && (
                        <button
                          type="button"
                          onClick={() => setCollabModalOpen(true)}
                          className="text-xs text-[var(--primary)] hover:underline font-semibold px-1 py-1 cursor-pointer"
                        >
                          + Add another
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCollabModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
                    >
                      <UserPlus size={14} className="text-[var(--primary)]" />
                      <span>Invite Collaborator (is with)</span>
                    </button>
                  )}
                </div>

                {/* ── CAPTION & AI MAGIC ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Caption
                      </label>
                      <button
                        type="button"
                        onClick={() => setAiPanelOpen((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          aiPanelOpen
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                            : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--border)]"
                        }`}
                        title="Generate AI Caption & Hashtags"
                      >
                        <Sparkles className="size-3 text-amber-400 animate-pulse" />
                        <span>AI Magic</span>
                      </button>
                    </div>
                    <span
                      className={`text-[11px] tabular-nums ${
                        caption.length > CAPTION_MAX - 50
                          ? "text-[var(--danger)]"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {caption.length}/{CAPTION_MAX}
                    </span>
                  </div>

                  {/* AI MAGIC PANEL */}
                  {aiPanelOpen && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                          <Wand2 className="size-3.5 text-[var(--primary)]" />
                          <span>AI Caption & Hashtags</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--primary)]/15 text-[var(--primary)]">
                          {files.some((f) => !f.isVideo) ? "Gemini Vision 👁️" : "Smart Text ✨"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {AI_TONES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTone(t.id);
                              handleGenerateAiCaption(t.id);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                              selectedTone === t.id
                                ? "bg-grad-btn text-white border-transparent shadow-sm"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--border)]"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={aiCustomPrompt}
                          onChange={(e) => setAiCustomPrompt(e.target.value)}
                          placeholder="Optional vibe, mood or idea..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleGenerateAiCaption();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleGenerateAiCaption()}
                          disabled={generatingAi}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-grad-btn text-white text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {generatingAi ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3" />
                          )}
                          <span>{generatingAi ? "..." : "Generate"}</span>
                        </button>
                      </div>

                      {aiSuggestion && (
                        <div className="p-2.5 rounded-xl bg-[var(--surface-3)]/90 border border-[var(--border)] space-y-2">
                          <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                            {aiSuggestion.caption}
                          </p>
                          {aiSuggestion.hashtags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {aiSuggestion.hashtags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] text-[var(--primary)] font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleApplyAiCaption}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Check size={12} />
                            <span>Apply this caption</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
                    placeholder="Write a caption... (use #hashtags and @mentions)"
                    rows={4}
                    className="w-full rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] resize-none"
                  />
                </div>

                {/* ── TAGGED PEOPLE SUMMARY ── */}
                {files.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                        <AnimatedIcon icon={TagIcon} size={13} className="text-pink-400" />
                        <span>Tagged on Photos</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingTagCoords({ x: 50, y: 50 });
                          setTagModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface-3)] hover:bg-[var(--primary)]/20 hover:text-[var(--primary)] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer"
                      >
                        <Plus size={11} />
                        <span>Tag Person</span>
                      </button>
                    </div>

                    {taggedUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {taggedUsers.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface-3)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] shadow-sm"
                          >
                            <Avatar className="size-3.5">
                              <AvatarImage src={t.user.profilePicture} />
                              <AvatarFallback className="text-[8px]">
                                {t.user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>@{t.user.username}</span>
                            {files.length > 1 && (
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                #{t.mediaIndex + 1}
                              </span>
                            )}
                            <button
                              type="button"
                              title="Remove tag"
                              onClick={() => removeTag(t.user._id, t.mediaIndex)}
                              className="hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        No one tagged yet · click on any photo or use "+ Tag Person"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky Footer Bar */}
              <div className="p-3.5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createPostHandler}
                  disabled={loading || files.length === 0}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-grad-btn text-white text-xs font-semibold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>
                        {files.length > 1
                          ? `Uploading (${files.length})...`
                          : "Sharing..."}
                      </span>
                    </>
                  ) : (
                    <span>
                      {files.length > 1
                        ? `Share Carousel (${files.length})`
                        : "Share Post"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════════ TAG PEOPLE SEARCH MODAL ═════════ */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-[var(--foreground)]">
              <AnimatedIcon icon={TagIcon} size={16} className="text-pink-400" />
              <span>Tag People</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Search for friends and creators to tag them in this photo
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] transition-colors"
              autoFocus
            />
            {tagSearchQuery && (
              <button
                type="button"
                onClick={() => setTagSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {searchingUsers ? (
              <div className="py-6 flex items-center justify-center text-xs text-[var(--muted-foreground)] gap-2">
                <Loader2 className="size-4 animate-spin text-[var(--primary)]" />
                <span>Searching users...</span>
              </div>
            ) : (tagSearchQuery.trim().length >= 2 ? userSearchResults : suggestedUsers).length > 0 ? (
              (tagSearchQuery.trim().length >= 2 ? userSearchResults : suggestedUsers).map((u) => {
                const isAlreadyTagged = taggedUsers.some(
                  (t) => (t.user._id || t.user) === u._id && t.mediaIndex === activeIdx
                );
                return (
                  <div
                    key={u._id}
                    onClick={() => handleAddTag(u)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-9 border border-[var(--border)]">
                        <AvatarImage src={u.profilePicture} />
                        <AvatarFallback className="text-xs font-semibold">
                          {getDisplayName(u, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {getDisplayName(u, "Unknown")}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAlreadyTagged}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        isAlreadyTagged
                          ? "bg-white/10 text-[var(--muted-foreground)] cursor-not-allowed"
                          : "bg-grad-btn text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                      }`}
                    >
                      {isAlreadyTagged ? "Tagged" : "Tag"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                {tagSearchQuery.trim().length >= 2
                  ? "No users found"
                  : "Type at least 2 characters to search"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════════ COLLABORATOR / CO-AUTHOR SEARCH MODAL ("is with") ═════════ */}
      <Dialog open={collabModalOpen} onOpenChange={setCollabModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-[var(--foreground)]">
              <Users size={18} className="text-purple-400" />
              <span>Invite Collaborator (is with)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Select a friend to co-author this post. Only mutual followers can collaborate. The post will appear on both profiles with dual credits.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={collabSearchQuery}
              onChange={(e) => setCollabSearchQuery(e.target.value)}
              placeholder="Search mutual followers..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] transition-colors"
              autoFocus
            />
            {collabSearchQuery && (
              <button
                type="button"
                onClick={() => setCollabSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {searchingCollab ? (
              <div className="py-6 flex items-center justify-center text-xs text-[var(--muted-foreground)] gap-2">
                <Loader2 className="size-4 animate-spin text-[var(--primary)]" />
                <span>Searching mutual followers...</span>
              </div>
            ) : (collabSearchQuery.trim().length >= 2 ? collabSearchResults : collabSuggestedUsers).length > 0 ? (
              (collabSearchQuery.trim().length >= 2 ? collabSearchResults : collabSuggestedUsers).map((u) => {
                const isAlreadyCollab = collaborators.some(
                  (c) => (c._id || c) === u._id
                );
                return (
                  <div
                    key={u._id}
                    onClick={() => handleAddCollaborator(u)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-9 border border-[var(--border)]">
                        <AvatarImage src={u.profilePicture} />
                        <AvatarFallback className="text-xs font-semibold">
                          {getDisplayName(u, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {getDisplayName(u, "Unknown")}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAlreadyCollab}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        isAlreadyCollab
                          ? "bg-white/10 text-[var(--muted-foreground)] cursor-not-allowed"
                          : "bg-grad-btn text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                      }`}
                    >
                      {isAlreadyCollab ? "Added" : "Invite"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                {collabSearchQuery.trim().length >= 2
                  ? "No mutual followers found matching your search"
                  : "Only friends who follow you and you follow back can be invited"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatePost;
