import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Search,
  Send,
  Share2,
  MessageCircle,
  Sparkles,
  Loader2,
  ArrowLeft,
  Globe,
  Users,
  Bookmark,
  Plus,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";
import { playMessageSound } from "@/lib/sound";

const STORY_QUICK_EMOJIS = ["🔥", "❤️", "😍", "😂", "✨", "💯", "👏"];

const ShareDialog = ({ open, onOpenChange, post }) => {
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [sentMap, setSentMap] = useState({});
  const [copied, setCopied] = useState(false);
  const [sharingToStory, setSharingToStory] = useState(false);

  // Story Customizer State
  const [isCustomizingStory, setIsCustomizingStory] = useState(false);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyAudience, setStoryAudience] = useState("public");
  const [storySaveToHighlight, setStorySaveToHighlight] = useState(false);
  const [userHighlights, setUserHighlights] = useState([]);
  const [selectedHighlightId, setSelectedHighlightId] = useState("");
  const [newHighlightName, setNewHighlightName] = useState("");
  const [loadingHighlights, setLoadingHighlights] = useState(false);

  const { user, suggestedUsers } = useSelector((s) => s.auth);

  // Reset customizer state when dialog opens or closes
  useEffect(() => {
    if (!open) {
      setIsCustomizingStory(false);
      setStoryCaption("");
      setStoryAudience("public");
      setStorySaveToHighlight(false);
      setSelectedHighlightId("");
      setNewHighlightName("");
    }
  }, [open]);

  // Load existing highlights when entering story customizer
  useEffect(() => {
    if (isCustomizingStory && user?._id) {
      setLoadingHighlights(true);
      axios
        .get(apiUrl(`/api/v1/story/highlights/user/${user._id}`), {
          withCredentials: true,
        })
        .then((res) => {
          if (res.data?.success) {
            setUserHighlights(res.data.highlights || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHighlights(false));
    }
  }, [isCustomizingStory, user?._id]);

  // Combine suggested users and following
  const candidateUsers = useMemo(() => {
    const list = [...(suggestedUsers || [])];
    const userFollowing = user?.following || [];
    userFollowing.forEach((item) => {
      const u = typeof item === "object" ? item : null;
      if (u?._id && !list.some((existing) => existing._id === u._id)) {
        list.push(u);
      }
    });
    return list.filter((u) => u?._id && u._id !== user?._id);
  }, [suggestedUsers, user]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return candidateUsers;
    const q = search.toLowerCase();
    return candidateUsers.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const uname = (u.username || "").toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [candidateUsers, search]);

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/post/${post?._id}`
      : "";

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = postUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      playMessageSound();
      toast.success("Post link copied to clipboard!");
      setTimeout(() => setCopied(false), 2400);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Post by ${getDisplayName(post?.author, "User")}`,
          text: post?.caption || "Check out this post on Nova!",
          url: postUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Unable to share");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  /* ═══ SHARE POST TO STORY WITH CUSTOM SETTINGS ═══ */
  const handleShareToStory = async () => {
    if (!post?._id || sharingToStory) return;
    try {
      setSharingToStory(true);
      const res = await axios.post(
        apiUrl("/api/v1/story/share-post"),
        {
          postId: post._id,
          caption: storyCaption.trim(),
          audience: storyAudience,
          highlightId: storySaveToHighlight && selectedHighlightId ? selectedHighlightId : undefined,
          highlightName: storySaveToHighlight && !selectedHighlightId && newHighlightName.trim() ? newHighlightName.trim() : undefined,
        },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Post shared to your story! 🌟");
        window.dispatchEvent(
          new CustomEvent("nova:story-created", { detail: res.data.story })
        );
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to share to story.");
    } finally {
      setSharingToStory(false);
    }
  };

  const handleSendToFriend = async (friend) => {
    if (sendingId || sentMap[friend._id]) return;
    try {
      setSendingId(friend._id);
      const messageText = `Check out this post: ${postUrl}`;
      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${friend._id}`),
        { textMessage: messageText },
        { withCredentials: true }
      );
      if (res.data.success) {
        setSentMap((prev) => ({ ...prev, [friend._id]: true }));
        playMessageSound();
        toast.success(`Sent to ${getDisplayName(friend, "user")}!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send message.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden rounded-3xl border border-[var(--border)]/70 bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl !z-[60]">
        {!isCustomizingStory ? (
          /* ══════════════ STANDARD SHARE VIEW ══════════════ */
          <>
            <DialogHeader className="px-5 pt-4 pb-3 border-b border-[var(--border)]/50">
              <DialogTitle className="text-center font-display text-[17px] font-semibold tracking-tight text-[var(--foreground)]">
                Share post
              </DialogTitle>
            </DialogHeader>

            {/* ═══ ADD POST TO STORY BUTTON (OPENS CUSTOMIZER) ═══ */}
            <div className="px-4 pt-3.5 pb-1">
              <button
                type="button"
                onClick={() => setIsCustomizingStory(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-indigo-500/15 border border-pink-500/30 hover:border-pink-500/50 text-[var(--foreground)] active:scale-[0.99] transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shrink-0">
                    <div className="size-full rounded-full bg-[var(--surface)] flex items-center justify-center">
                      <Sparkles className="size-4 text-pink-500 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs sm:text-[13px] font-semibold text-[var(--foreground)]">
                      Add post to your story
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Customize caption, audience & highlights
                    </p>
                  </div>
                </div>

                <div className="px-3.5 py-1.5 rounded-full bg-grad-btn text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 shrink-0">
                  <span>Share</span>
                </div>
              </button>
            </div>

            {/* Search friend */}
            <div className="px-4 pt-2.5 pb-2">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--border)]/60 text-sm">
                <Search className="size-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people to send…"
                  className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--muted-foreground)] text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Friends list */}
            <div className="max-h-[240px] overflow-y-auto px-3 py-1 space-y-1 scroll-hide">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((candidate) => {
                  const name = getDisplayName(candidate);
                  const username = candidate.username ? `@${candidate.username}` : "";
                  const initial = name.charAt(0).toUpperCase();
                  const isSent = !!sentMap[candidate._id];
                  const isSending = sendingId === candidate._id;

                  return (
                    <div
                      key={candidate._id}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-[var(--surface-2)]/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-10 border border-[var(--border)]">
                          <AvatarImage src={candidate.profilePicture} />
                          <AvatarFallback>{initial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium text-[var(--foreground)] truncate">
                            {name}
                          </p>
                          {username && (
                            <p className="text-[12px] text-[var(--muted-foreground)] truncate">
                              {username}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendToFriend(candidate)}
                        disabled={isSent || isSending}
                        className={`
                          px-3.5 py-1.5 rounded-full text-[12.5px] font-medium
                          transition-all duration-200 outline-none flex items-center gap-1.5
                          ${
                            isSent
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : "bg-grad-btn text-white hover:opacity-90 active:scale-95 shadow-sm"
                          }
                        `}
                      >
                        {isSent ? (
                          <>
                            <Check className="size-3.5" strokeWidth={2.5} />
                            Sent
                          </>
                        ) : isSending ? (
                          <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <Send className="size-3" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-[var(--muted-foreground)]">
                  {search ? "No users found" : "No friends available to send to"}
                </div>
              )}
            </div>

            {/* Quick action buttons footer */}
            <div className="px-4 py-3.5 border-t border-[var(--border)]/50 bg-[var(--surface-2)]/40 flex items-center justify-around gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]"
              >
                <div className="size-9 rounded-full flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] shadow-sm">
                  {copied ? (
                    <Check className="size-4 text-emerald-500" strokeWidth={2.5} />
                  ) : (
                    <Copy className="size-4" strokeWidth={2} />
                  )}
                </div>
                <span className="text-[11.5px] font-medium text-[var(--foreground)]/80">
                  {copied ? "Copied" : "Copy link"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]"
              >
                <div className="size-9 rounded-full flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] shadow-sm">
                  <Share2 className="size-4" strokeWidth={2} />
                </div>
                <span className="text-[11.5px] font-medium text-[var(--foreground)]/80">
                  Share via…
                </span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Check out this post: ${postUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]"
              >
                <div className="size-9 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm">
                  <MessageCircle className="size-4" strokeWidth={2} />
                </div>
                <span className="text-[11.5px] font-medium text-[var(--foreground)]/80">
                  WhatsApp
                </span>
              </a>
            </div>
          </>
        ) : (
          /* ══════════════ STORY RESHARE CUSTOMIZER VIEW ══════════════ */
          <div className="animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/50 bg-[var(--surface-2)]/30">
              <button
                type="button"
                onClick={() => setIsCustomizingStory(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded-lg"
              >
                <ArrowLeft className="size-4" />
                <span>Back</span>
              </button>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Share to Story
              </h3>
              <div className="size-6" /> {/* spacer */}
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto scroll-hide">
              {/* Instagram-style Post Reshare Card Preview */}
              <div className="p-3 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--border)]/70 shadow-sm flex items-center gap-3">
                <Avatar className="size-10 border border-[var(--border)] shrink-0">
                  <AvatarImage src={post?.author?.profilePicture} />
                  <AvatarFallback>
                    {post?.author?.fullName?.[0] || post?.author?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                    {post?.author?.fullName || post?.author?.username}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                    @{post?.author?.username || "user"} • Post
                  </p>
                  {post?.caption && (
                    <p className="text-[11px] text-[var(--foreground)]/70 line-clamp-1 mt-0.5">
                      {post.caption}
                    </p>
                  )}
                </div>
                {post?.image && (
                  <div className="size-12 rounded-xl overflow-hidden shrink-0 border border-[var(--border)] bg-black/30">
                    <img src={post.image} alt="Post preview" className="size-full object-cover" />
                  </div>
                )}
              </div>

              {/* Add your thought / caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Add a caption or thought (optional)
                </label>
                <textarea
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value.slice(0, 150))}
                  placeholder="Say something about this post..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none"
                />
                {/* Emoji quick suggestions */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {STORY_QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setStoryCaption((prev) => (prev ? `${prev} ${emoji}` : emoji))}
                      className="size-7 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-sm flex items-center justify-center hover:scale-120 active:scale-95 transition-all cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience Selector (Public vs Followers) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStoryAudience("public")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                      storyAudience === "public"
                        ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)] shadow-sm font-semibold"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Globe className="size-3.5" />
                    <span>Public (Everyone)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoryAudience("followers")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                      storyAudience === "followers"
                        ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)] shadow-sm font-semibold"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Users className="size-3.5" />
                    <span>Followers Only</span>
                  </button>
                </div>
              </div>

              {/* Save to Highlight toggle */}
              <div className="pt-2 border-t border-[var(--border)]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="size-3.5 text-pink-500" />
                    <span className="text-xs font-medium text-[var(--foreground)]">
                      Save as Profile Highlight
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={storySaveToHighlight}
                    onChange={(e) => setStorySaveToHighlight(e.target.checked)}
                    className="size-4 accent-[var(--primary)] cursor-pointer"
                  />
                </div>

                {storySaveToHighlight && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]/60 space-y-2.5 animate-in fade-in duration-150">
                    {loadingHighlights ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] py-1">
                        <Loader2 className="size-3 animate-spin text-[var(--primary)]" />
                        <span>Loading highlights...</span>
                      </div>
                    ) : userHighlights.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5">
                          Add to existing highlight:
                        </p>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide">
                          {userHighlights.map((hl) => {
                            const isChosen = selectedHighlightId === hl._id;
                            return (
                              <button
                                key={hl._id}
                                type="button"
                                onClick={() => {
                                  setSelectedHighlightId(isChosen ? "" : hl._id);
                                  if (!isChosen) setNewHighlightName("");
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shrink-0 ${
                                  isChosen
                                    ? "bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-pink-500 text-pink-400 font-bold shadow-sm"
                                    : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground)]/80 hover:border-white/30"
                                }`}
                              >
                                {hl.cover ? (
                                  <img src={hl.cover} alt="" className="size-4 rounded-full object-cover" />
                                ) : (
                                  <Sparkles className="size-3 text-pink-400" />
                                )}
                                <span>{hl.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Or create new highlight name */}
                    {!selectedHighlightId && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                          {userHighlights.length > 0 ? "Or create new highlight:" : "Create new highlight:"}
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={30}
                            value={newHighlightName}
                            onChange={(e) => setNewHighlightName(e.target.value)}
                            placeholder="e.g. Favorites, Vibes..."
                            className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="px-4 py-3 border-t border-[var(--border)]/50 bg-[var(--surface-2)]/40 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCustomizingStory(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareToStory}
                disabled={sharingToStory}
                className="px-5 py-2 rounded-xl bg-grad-btn text-white text-xs font-semibold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sharingToStory ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Sharing…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Share to Story</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
