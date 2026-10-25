import React, { useEffect, useState, useCallback } from "react";
import {
  FolderPlus,
  Check,
  Plus,
  X,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Folder,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  setCollections as setReduxCollections,
  addCollection,
  updateCollectionInList,
  updateBookmarks,
} from "@/redux/authSlice";

const SaveToCollectionModal = ({ isOpen, onClose, post, onSaved, onUnsaved }) => {
  const dispatch = useDispatch();
  const { collections: reduxCollections, user } = useSelector((store) => store.auth);
  const [collections, setCollections] = useState(reduxCollections || []);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [unsaving, setUnsaving] = useState(false);

  // Sync from Redux when available
  useEffect(() => {
    if (reduxCollections && reduxCollections.length > 0) {
      setCollections(reduxCollections);
    }
  }, [reduxCollections]);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await axios.get(apiUrl("/api/v1/collection/all"), {
        withCredentials: true,
      });
      if (res.data?.success) {
        setCollections(res.data.collections || []);
        dispatch(setReduxCollections(res.data.collections || []));
      }
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    if (!reduxCollections || reduxCollections.length === 0) {
      setLoading(true);
    }
    fetchCollections();

    const handleSync = () => fetchCollections();
    window.addEventListener("nova:collections-updated", handleSync);
    return () => window.removeEventListener("nova:collections-updated", handleSync);
  }, [isOpen, fetchCollections, reduxCollections]);

  if (!isOpen || !post) return null;

  const isPostBookmarked =
    user?.bookmarks?.some((item) => (item?._id || item) === post._id) || false;

  const handleToggle = async (collection) => {
    if (togglingId) return;
    setTogglingId(collection._id);

    try {
      const res = await axios.post(
        apiUrl(`/api/v1/collection/${collection._id}/toggle-post`),
        { postId: post._id },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        const updatedCol = res.data.collection;

        setCollections((prev) =>
          prev.map((c) => (c._id === collection._id ? updatedCol : c))
        );
        dispatch(updateCollectionInList(updatedCol));

        // If added, ensure user's bookmarks slice has this post
        if (res.data.action === "added" && !isPostBookmarked) {
          dispatch(updateBookmarks({ postId: post._id }));
        }

        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        onSaved?.();
      }
    } catch (err) {
      toast.error("Failed to update collection.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    const trimmed = newCollectionName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const res = await axios.post(
        apiUrl("/api/v1/collection/create"),
        {
          name: trimmed,
          initialPostId: post._id,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        setCollections((prev) => [res.data.collection, ...prev]);
        dispatch(addCollection(res.data.collection));
        if (!isPostBookmarked) {
          dispatch(updateBookmarks({ postId: post._id }));
        }
        setNewCollectionName("");
        setShowCreate(false);
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        onSaved?.();
      }
    } catch (err) {
      toast.error("Failed to create collection.");
    } finally {
      setCreating(false);
    }
  };

  const handleUnsaveCompletely = async () => {
    if (unsaving) return;
    try {
      setUnsaving(true);
      const res = await axios.get(apiUrl(`/api/v1/post/${post._id}/bookmark`), {
        withCredentials: true,
      });
      if (res.data?.success) {
        dispatch(updateBookmarks({ postId: post._id }));
        toast.success("Post removed from saved");
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        onUnsaved?.();
        onClose();
      }
    } catch (err) {
      toast.error("Unable to remove from saved.");
    } finally {
      setUnsaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-[#0f1222] border border-white/10 p-5 shadow-2xl flex flex-col space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bookmark className="size-4 fill-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Save to Collection</h3>
              <p className="text-[11px] text-white/50">Organize your saved posts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Default All Saved Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <BookmarkCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Saved to All Posts
              </p>
              <p className="text-[10px] text-white/50">
                Visible in your profile Saved tab
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Saved
          </span>
        </div>

        {/* Collections Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
            Your Collections ({collections.length})
          </span>
        </div>

        {/* Collections List */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {loading && collections.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-white/50 gap-2">
              <Loader2 className="size-4 animate-spin text-indigo-400" />
              <span className="text-xs">Loading collections…</span>
            </div>
          ) : collections.length === 0 && !showCreate ? (
            <div className="py-6 text-center text-xs text-white/50">
              <Folder className="size-8 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p>No custom collections yet.</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Create folders like "Gym", "Quotes", "Tech", or "Design"!
              </p>
            </div>
          ) : (
            collections.map((col) => {
              const isSaved = (col.posts || []).some(
                (p) => (p._id || p).toString() === post._id.toString()
              );
              const isToggling = togglingId === col._id;

              return (
                <button
                  key={col._id}
                  type="button"
                  onClick={() => handleToggle(col)}
                  disabled={isToggling}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isSaved
                      ? "bg-indigo-600/25 border border-indigo-500/40 text-white"
                      : "bg-white/5 hover:bg-white/10 border border-white/5 text-white/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                      {col.coverImage ? (
                        <img
                          src={col.coverImage}
                          alt={col.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Folder className="size-4 text-white/40" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold truncate text-white">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-white/50">
                        {col.posts?.length || 0} {col.posts?.length === 1 ? "post" : "posts"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`size-6 rounded-full flex items-center justify-center border transition-all ${
                      isSaved
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="size-3 animate-spin text-white" />
                    ) : (
                      <Check className="size-3.5 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Inline Create Collection */}
        {showCreate ? (
          <form onSubmit={handleCreateCollection} className="space-y-2 pt-2 border-t border-white/10">
            <input
              type="text"
              autoFocus
              maxLength={50}
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g. Gym, Tech, Quotes, Travel"
              className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-white/40 outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!newCollectionName.trim() || creating}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 className="size-3 animate-spin" /> : <FolderPlus className="size-3.5" />}
                <span>Create & Save</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewCollectionName("");
                }}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-dashed border-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="size-4 text-indigo-400" />
            <span>New Collection</span>
          </button>
        )}

        {/* Bottom Unsave Action */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleUnsaveCompletely}
            disabled={unsaving}
            className="text-[11px] font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {unsaving ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            <span>Remove from Saved</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-white/80 hover:text-white px-3 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveToCollectionModal;
