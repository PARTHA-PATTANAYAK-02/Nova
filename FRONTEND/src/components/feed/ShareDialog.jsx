import React, { useMemo, useState } from "react";
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
  Link2,
  Search,
  Send,
  Share2,
  MessageCircle,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";
import { playMessageSound } from "@/lib/sound";

const ShareDialog = ({ open, onOpenChange, post }) => {
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [sentMap, setSentMap] = useState({});
  const [copied, setCopied] = useState(false);

  const { user, suggestedUsers } = useSelector((s) => s.auth);

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

  const handleSendToFriend = async (friend) => {
    if (sendingId || sentMap[friend._id]) return;
    try {
      setSendingId(friend._id);
      const messageText = `Check out this post: ${postUrl}`;
      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${friend._id}`),
        { textMessage: messageText },
        { withCredentials: true },
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
      <DialogContent className="max-w-[440px] p-0 overflow-hidden rounded-3xl border border-[var(--border)]/70 bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-[var(--border)]/50">
          <DialogTitle className="text-center font-display text-[17px] font-semibold tracking-tight text-[var(--foreground)]">
            Share post
          </DialogTitle>
        </DialogHeader>

        {/* Search friend */}
        <div className="px-4 pt-3 pb-2">
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
        <div className="max-h-[260px] overflow-y-auto px-3 py-1 space-y-1 scroll-hide">
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
              `Check out this post: ${postUrl}`,
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
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
