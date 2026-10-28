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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  Camera,
  Edit2,
  Check,
  X,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  MoreVertical,
  User,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const GroupInfoDrawer = ({
  open,
  onOpenChange,
  group,
  currentUser,
  allContacts = [],
  onGroupUpdated,
  onLeaveGroup,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group?.groupName || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(group?.groupDescription || "");
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Add members modal state
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [addMemberFilter, setAddMemberFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const isAdmin = useMemo(() => {
    if (!group || !currentUser) return false;
    const myId = currentUser._id?.toString();
    const adminIds = (group.admins || []).map((a) => (a?._id || a)?.toString());
    const creatorId = (group.creator?._id || group.creator)?.toString();
    return adminIds.includes(myId) || creatorId === myId;
  }, [group, currentUser]);

  const isCreator = useMemo(() => {
    if (!group || !currentUser) return false;
    const myId = currentUser._id?.toString();
    const creatorId = (group.creator?._id || group.creator)?.toString();
    return creatorId === myId;
  }, [group, currentUser]);

  // Sync edits when group changes
  React.useEffect(() => {
    if (group) {
      setEditedName(group.groupName || "");
      setEditedDesc(group.groupDescription || "");
    }
  }, [group]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !group?._id) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("groupAvatar", file);
      const res = await axios.patch(apiUrl(`/api/v1/message/group/${group._id}/update`), formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        toast.success("Group photo updated");
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update group photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.patch(
        apiUrl(`/api/v1/message/group/${group._id}/update`),
        { groupName: editedName.trim() },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Group name updated");
        setIsEditingName(false);
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update name");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        apiUrl(`/api/v1/message/group/${group._id}/update`),
        { groupDescription: editedDesc.trim() },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Group description updated");
        setIsEditingDesc(false);
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update description");
    } finally {
      setActionLoading(false);
    }
  };

  // Add members handler
  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/message/group/${group._id}/members`),
        { memberIds: selectedToAdd },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Members added to group");
        setSelectedToAdd([]);
        setAddMembersOpen(false);
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add members");
    } finally {
      setActionLoading(false);
    }
  };

  // Promote to admin
  const handlePromoteAdmin = async (memberId) => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        apiUrl(`/api/v1/message/group/${group._id}/admins/promote/${memberId}`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Member promoted to Admin");
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to promote member");
    } finally {
      setActionLoading(false);
    }
  };

  // Demote admin
  const handleDemoteAdmin = async (memberId) => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        apiUrl(`/api/v1/message/group/${group._id}/admins/demote/${memberId}`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Admin role removed");
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to demote admin");
    } finally {
      setActionLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId) => {
    setActionLoading(true);
    try {
      const res = await axios.delete(
        apiUrl(`/api/v1/message/group/${group._id}/members/${memberId}`),
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Member removed from group");
        onGroupUpdated?.(res.data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/message/group/${group._id}/leave`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("You left the group");
        onOpenChange?.(false);
        onLeaveGroup?.(group._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group");
    } finally {
      setActionLoading(false);
      setLeaveConfirmOpen(false);
    }
  };

  // Candidate users to add (contacts not already in group)
  const currentParticipantIds = useMemo(() => {
    return (group?.participants || []).map((p) => (p?._id || p)?.toString());
  }, [group?.participants]);

  const addCandidates = useMemo(() => {
    const q = addMemberFilter.trim().toLowerCase();
    return allContacts
      .filter((c) => !c.isGroup && c._id && !currentParticipantIds.includes(c._id.toString()))
      .filter((u) => {
        if (!q) return true;
        return (
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q)
        );
      });
  }, [allContacts, currentParticipantIds, addMemberFilter]);

  // Filtered current members
  const filteredParticipants = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    const list = group?.participants || [];
    if (!q) return list;
    return list.filter((p) => {
      const name = (p.fullName || "").toLowerCase();
      const uname = (p.username || "").toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [group?.participants, memberSearchQuery]);

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-[var(--border)]/70 shrink-0">
            <DialogTitle className="text-sm font-semibold text-[var(--foreground)]">
              Group Info
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              {group.participants?.length || 0} members in this group
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/50">
            {/* Top Avatar & Name Section */}
            <div className="px-5 py-5 flex flex-col items-center text-center bg-[var(--surface-2)]/20">
              {/* Avatar */}
              <div className="relative group mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="drawer-group-avatar"
                  disabled={!isAdmin}
                />
                <label
                  htmlFor={isAdmin ? "drawer-group-avatar" : undefined}
                  className={`relative size-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-[var(--border)] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 shadow-md ${
                    isAdmin ? "cursor-pointer group-hover:border-[var(--primary)]" : ""
                  }`}
                >
                  {group.groupAvatar || group.profilePicture ? (
                    <img
                      src={group.groupAvatar || group.profilePicture}
                      alt={group.groupName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Users className="size-8 text-[var(--primary)]" />
                  )}

                  {isAdmin && (
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      {avatarLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Camera className="size-5" />
                      )}
                    </div>
                  )}
                </label>
              </div>

              {/* Group Name */}
              {isEditingName ? (
                <div className="flex items-center gap-1.5 w-full max-w-xs mb-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    maxLength={45}
                    className="flex-1 px-3 py-1 text-sm font-semibold rounded-lg bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none text-[var(--foreground)]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={actionLoading}
                    className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 cursor-pointer"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(group.groupName || "");
                    }}
                    className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-1 group/name">
                  <h3 className="text-base font-bold text-[var(--foreground)] break-words max-w-[280px]">
                    {group.groupName}
                  </h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)] p-1 rounded-md opacity-0 group-hover/name:opacity-100 transition-opacity cursor-pointer"
                      title="Edit group name"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Group Description */}
              {isEditingDesc ? (
                <div className="flex items-center gap-1.5 w-full max-w-xs mt-1">
                  <input
                    type="text"
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    placeholder="Add group topic..."
                    maxLength={100}
                    className="flex-1 px-3 py-1 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none text-[var(--foreground)]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    disabled={actionLoading}
                    className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 cursor-pointer"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDesc(false);
                      setEditedDesc(group.groupDescription || "");
                    }}
                    className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 group/desc">
                  <p className="text-xs text-[var(--muted-foreground)] max-w-xs break-words">
                    {group.groupDescription || (isAdmin ? "Add a description..." : "")}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDesc(true)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)] p-0.5 rounded opacity-0 group-hover/desc:opacity-100 transition-opacity cursor-pointer"
                      title="Edit description"
                    >
                      <Edit2 className="size-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Members ({group.participants?.length || 0})
                  </span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setAddMembersOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Add Members</span>
                  </button>
                )}
              </div>

              {/* Member Search filter */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 size-3.5 text-[var(--muted-foreground)] pointer-events-none" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Filter members..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--foreground)]"
                />
              </div>

              {/* Members List */}
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                {filteredParticipants.map((member) => {
                  const mId = (member?._id || member)?.toString();
                  const isMemberAdmin = (group.admins || []).some(
                    (a) => (a?._id || a)?.toString() === mId
                  );
                  const isMemberCreator =
                    (group.creator?._id || group.creator)?.toString() === mId;
                  const isMe = currentUser?._id?.toString() === mId;

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[var(--surface-2)]/60 transition-colors group/row"
                    >
                      <div
                        onClick={() => {
                          onOpenChange?.(false);
                          navigate(`/profile/${member.username || mId}`);
                        }}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                      >
                        <Avatar className="size-9 ring-1 ring-[var(--border)]">
                          <AvatarImage src={member.profilePicture} />
                          <AvatarFallback className="text-xs font-bold">
                            {getDisplayName(member, "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                              {getDisplayName(member)}
                            </span>
                            {isMe && (
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                (You)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                            @{member.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isMemberCreator ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                            <ShieldCheck className="size-2.5" />
                            Creator
                          </span>
                        ) : isMemberAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 flex items-center gap-1">
                            <Shield className="size-2.5" />
                            Admin
                          </span>
                        ) : null}

                        {/* Admin Action Menu for this member */}
                        {isAdmin && !isMe && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                                title="Member actions"
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-44 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50 text-xs"
                            >
                              {!isMemberAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteAdmin(mId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                                >
                                  <Shield className="size-3.5 text-[var(--primary)]" />
                                  <span>Make Group Admin</span>
                                </button>
                              ) : !isMemberCreator ? (
                                <button
                                  type="button"
                                  onClick={() => handleDemoteAdmin(mId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                                >
                                  <ShieldAlert className="size-3.5 text-amber-500" />
                                  <span>Dismiss as Admin</span>
                                </button>
                              ) : null}

                              {!isMemberCreator && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(mId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Remove from Group</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  onOpenChange?.(false);
                                  navigate(`/profile/${member.username || mId}`);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                              >
                                <User className="size-3.5 text-[var(--muted-foreground)]" />
                                <span>View Profile</span>
                              </button>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Zone: Leave Group */}
            <div className="p-4 bg-[var(--surface-2)]/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-500">Leave Conversation</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  You won't receive new messages from this group
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Sub-Dialog */}
      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent className="max-w-sm p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold text-[var(--foreground)]">
              Add Members
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Select contacts to add to "{group?.groupName}"
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex items-center my-2">
            <Search className="absolute left-3 size-3.5 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              type="text"
              value={addMemberFilter}
              onChange={(e) => setAddMemberFilter(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
            />
          </div>

          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto py-1 divide-y divide-[var(--border)]/30">
            {addCandidates.length === 0 ? (
              <p className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                No new contacts available to add.
              </p>
            ) : (
              addCandidates.map((u) => {
                const isSelected = selectedToAdd.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() =>
                      setSelectedToAdd((prev) =>
                        prev.includes(u._id)
                          ? prev.filter((id) => id !== u._id)
                          : [...prev, u._id]
                      )
                    }
                    className="flex items-center justify-between py-2 px-1 cursor-pointer hover:bg-[var(--surface-2)]/60 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarImage src={u.profilePicture} />
                        <AvatarFallback className="text-[10px]">
                          {getDisplayName(u, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold text-[var(--foreground)]">
                          {getDisplayName(u)}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`size-4.5 rounded border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                          : "border-[var(--border)] text-transparent"
                      }`}
                    >
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]/60 mt-2">
            <button
              type="button"
              onClick={() => setAddMembersOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--foreground)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMembers}
              disabled={selectedToAdd.length === 0 || actionLoading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {actionLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <UserPlus className="size-3" />
              )}
              <span>Add ({selectedToAdd.length})</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="max-w-xs p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl text-center">
          <div className="size-11 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="size-6" />
          </div>
          <DialogTitle className="text-sm font-bold text-[var(--foreground)]">
            Leave Group?
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-1 mb-4">
            Are you sure you want to leave "{group?.groupName}"? You will not be able to send or receive messages in this group.
          </DialogDescription>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setLeaveConfirmOpen(false)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-2)] text-[var(--foreground)] hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLeaveGroup}
              disabled={actionLoading}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {actionLoading ? <Loader2 className="size-3 animate-spin" /> : "Leave"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroupInfoDrawer;

