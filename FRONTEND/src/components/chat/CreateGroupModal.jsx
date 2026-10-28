import React, { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Camera,
  Search,
  Check,
  X,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";
import { UserGroupIcon } from "@animateicons/react/lucide";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const CreateGroupModal = ({ open, onOpenChange, contacts = [], onGroupCreated }) => {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Group photo size should be under 10MB");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter contacts (excluding existing groups and search)
  const candidateUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts
      .filter((c) => !c.isGroup && c._id)
      .filter((u) => {
        if (!q) return true;
        const name = (u.fullName || "").toLowerCase();
        const uname = (u.username || "").toLowerCase();
        return name.includes(q) || uname.includes(q);
      });
  }, [contacts, searchQuery]);

  const selectedUsers = useMemo(() => {
    return contacts.filter((c) => selectedUserIds.includes(c._id));
  }, [contacts, selectedUserIds]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || groupName.trim().length < 2) {
      toast.error("Please enter a group name (at least 2 characters)");
      return;
    }

    if (selectedUserIds.length < 1) {
      toast.error("Please select at least 1 member for the group");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("groupName", groupName.trim());
      formData.append("groupDescription", groupDescription.trim());
      formData.append("participantIds", JSON.stringify(selectedUserIds));

      if (avatarFile) {
        formData.append("groupAvatar", avatarFile);
      }

      const res = await axios.post(apiUrl("/api/v1/message/group/create"), formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(`Group "${groupName}" created!`);
        onGroupCreated?.(res.data.group);
        handleClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setAvatarFile(null);
    setAvatarPreview("");
    setSelectedUserIds([]);
    setSearchQuery("");
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white shadow-sm">
              <UserGroupIcon size={18} duration={1} color="currentColor" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
                New Group
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                Chat, share posts & connect with friends together
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreateGroup} className="flex flex-col max-h-[75vh]">
          {/* Group Photo & Name Inputs */}
          <div className="px-5 py-4 flex items-center gap-4 bg-[var(--surface-2)]/30 border-b border-[var(--border)]/50">
            {/* Avatar upload */}
            <div className="relative group shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="group-avatar-upload"
              />
              <label
                htmlFor="group-avatar-upload"
                className="relative size-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] bg-[var(--surface-2)] cursor-pointer transition-colors shadow-inner"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Group preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                    <Camera className="size-5" />
                    <span className="text-[9px] mt-0.5 font-medium">Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="size-5 text-white" />
                </div>
              </label>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                  title="Remove photo"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Inputs */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (required)"
                maxLength={45}
                required
                className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none transition-colors text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <input
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Group topic or description (optional)"
                maxLength={100}
                className="w-full px-3 py-1 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none transition-colors text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
          </div>

          {/* Member Search & Selection Header */}
          <div className="px-5 pt-3 pb-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--foreground)]">
                Add Members ({selectedUserIds.length} selected)
              </span>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 size-3.5 text-[var(--muted-foreground)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends by name or username..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none transition-colors text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>

            {/* Selected Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {selectedUsers.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[11px] font-semibold text-[var(--foreground)] shrink-0 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <Avatar className="size-4">
                      <AvatarImage src={u.profilePicture} />
                      <AvatarFallback className="text-[7px]">
                        {getDisplayName(u, "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[80px] truncate">{u.fullName || u.username}</span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u._id)}
                      className="text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-4 py-1 divide-y divide-[var(--border)]/40 max-h-56">
            {candidateUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                No users found.
              </div>
            ) : (
              candidateUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUserSelection(u._id)}
                    className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-[var(--surface-2)]/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 ring-1 ring-[var(--border)]">
                        <AvatarImage src={u.profilePicture} />
                        <AvatarFallback className="text-xs font-bold">
                          {getDisplayName(u, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {getDisplayName(u)}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--surface)] text-transparent"
                      }`}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-[var(--border)]/70 flex items-center justify-end gap-2 bg-[var(--surface)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedUserIds.length === 0}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;

