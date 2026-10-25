import React, { useEffect, useState, useCallback } from "react";
import {
  Folder,
  FolderPlus,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  ArrowLeft,
  Bookmark,
  Play,
  Heart,
  MessageCircle,
  Loader2,
  Images,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  setCollections as setReduxCollections,
  addCollection,
  removeCollection,
  updateCollectionInList,
} from "@/redux/authSlice";
import SaveToCollectionModal from "@/components/feed/SaveToCollectionModal";

const SavedCollectionsSection = ({
  allBookmarks = [],
  isLoggedInUser = false,
  onOpenPost,
}) => {
  const dispatch = useDispatch();
  const { collections: reduxCollections } = useSelector((store) => store.auth);
  const [collections, setCollections] = useState(reduxCollections || []);
  const [loading, setLoading] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null); // null = overview, "all" = All Posts, or collection object
  const [activeCollectionPosts, setActiveCollectionPosts] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Collection Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [creating, setCreating] = useState(false);

  // Rename Modal State
  const [renamingCol, setRenamingCol] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Post targeted for SaveToCollectionModal from profile grid
  const [organizingPost, setOrganizingPost] = useState(null);

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
    if (!reduxCollections || reduxCollections.length === 0) {
      setLoading(true);
    }
    fetchCollections();

    const handleSync = () => fetchCollections();
    window.addEventListener("nova:collections-updated", handleSync);
    return () => window.removeEventListener("nova:collections-updated", handleSync);
  }, [fetchCollections, reduxCollections]);

  const handleOpenCollection = (col) => {
    if (col === "all") {
      setActiveCollection("all");
      setActiveCollectionPosts(allBookmarks);
      return;
    }

    setActiveCollection(col);
    setLoadingDetail(true);

    axios
      .get(apiUrl(`/api/v1/collection/${col._id}`), { withCredentials: true })
      .then((res) => {
        if (res.data?.success) {
          setActiveCollectionPosts(res.data.collection?.posts || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load collection details:", err);
        toast.error("Could not load collection.");
      })
      .finally(() => setLoadingDetail(false));
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const res = await axios.post(
        apiUrl("/api/v1/collection/create"),
        { name: trimmed },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(res.data.message);
        setCollections((prev) => [res.data.collection, ...prev]);
        dispatch(addCollection(res.data.collection));
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        setNewColName("");
        setShowCreateModal(false);
      }
    } catch {
      toast.error("Failed to create collection.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (colId, e) => {
    e?.stopPropagation();
    try {
      const res = await axios.delete(apiUrl(`/api/v1/collection/${colId}`), {
        withCredentials: true,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setCollections((prev) => prev.filter((c) => c._id !== colId));
        dispatch(removeCollection(colId));
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        if (activeCollection?._id === colId) {
          setActiveCollection(null);
        }
      }
    } catch {
      toast.error("Failed to delete collection.");
    }
  };

  const handleRenameCollection = async (e) => {
    e.preventDefault();
    if (!renamingCol || !renameValue.trim()) return;

    try {
      const res = await axios.put(
        apiUrl(`/api/v1/collection/${renamingCol._id}`),
        { name: renameValue.trim() },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Collection renamed.");
        const updated = { ...renamingCol, name: renameValue.trim() };
        setCollections((prev) =>
          prev.map((c) => (c._id === renamingCol._id ? updated : c))
        );
        dispatch(updateCollectionInList(updated));
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
        if (activeCollection?._id === renamingCol._id) {
          setActiveCollection((prev) => ({ ...prev, name: renameValue.trim() }));
        }
        setRenamingCol(null);
        setRenameValue("");
      }
    } catch {
      toast.error("Failed to rename collection.");
    }
  };

  const handleRemovePostFromCurrent = async (postId, e) => {
    e?.stopPropagation();
    if (!activeCollection || activeCollection === "all") return;

    try {
      const res = await axios.post(
        apiUrl(`/api/v1/collection/${activeCollection._id}/toggle-post`),
        { postId },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Removed from collection");
        setActiveCollectionPosts((prev) =>
          prev.filter((p) => (p._id || p) !== postId)
        );
        fetchCollections();
        window.dispatchEvent(new CustomEvent("nova:collections-updated"));
      }
    } catch {
      toast.error("Failed to remove post.");
    }
  };

  const getImageUrl = (item) => {
    if (!item) return "";
    if (typeof item === "string") {
      return item.startsWith("http") || item.startsWith("/") ? item : "";
    }
    return item.image || item.coverImage || item.thumbnail || item.repostOf?.image || "";
  };

  const renderFourPreview = (postsList, fallbackCover) => {
    const validItems = (Array.isArray(postsList) ? postsList : []).filter(Boolean);
    const validCovers = validItems
      .map(getImageUrl)
      .filter((url) => Boolean(url) && typeof url === "string" && (url.startsWith("http") || url.startsWith("/")));

    if (validCovers.length === 0 && fallbackCover) {
      return (
        <img
          src={fallbackCover}
          alt="Cover"
          className="size-full object-cover group-hover:scale-105 transition-all duration-300"
        />
      );
    }

    if (validCovers.length === 0) {
      return (
        <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/50 via-purple-950/20 to-slate-900/80 p-4 select-none">
          <div className="size-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-indigo-500/25 transition-all duration-300">
            <Folder className="size-6 text-indigo-400 stroke-[1.8]" />
          </div>
          <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase mt-2">
            Empty
          </span>
        </div>
      );
    }

    if (validCovers.length === 1) {
      return (
        <img
          src={validCovers[0]}
          alt="Preview"
          className="size-full object-cover group-hover:scale-105 transition-all duration-300"
        />
      );
    }

    return (
      <div className="grid grid-cols-2 size-full gap-0.5 bg-black/50">
        {validCovers.slice(0, 4).map((url, i) => (
          <img
            key={i}
            src={url}
            alt="Preview"
            className="size-full object-cover"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ════════════ HORIZONTAL FILTER PILLS ════════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveCollection(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            activeCollection === null
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
          }`}
        >
          🗂️ All Collections
        </button>
        <button
          type="button"
          onClick={() => handleOpenCollection("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            activeCollection === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
          }`}
        >
          🌟 All Posts ({allBookmarks.length})
        </button>
        {collections.map((col) => (
          <button
            key={col._id}
            type="button"
            onClick={() => handleOpenCollection(col)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeCollection?._id === col._id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
            }`}
          >
            📁 {col.name} ({col.posts?.length || 0})
          </button>
        ))}
        {isLoggedInUser && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="size-3.5" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* ════════════ VIEW: INSIDE A COLLECTION / ALL POSTS ════════════ */}
      {activeCollection ? (
        <div className="space-y-4">
          {/* Back Bar & Title */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setActiveCollection(null)}
              className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="size-4" />
              <span>All Collections</span>
            </button>

            <div className="text-right">
              <h3 className="text-sm font-bold text-white flex items-center justify-end gap-1.5">
                <span>{activeCollection === "all" ? "All Posts" : activeCollection.name}</span>
              </h3>
              <p className="text-[11px] text-white/50">
                {activeCollection === "all"
                  ? `${allBookmarks.length} ${allBookmarks.length === 1 ? "saved post" : "saved posts"}`
                  : `${activeCollectionPosts.length} ${activeCollectionPosts.length === 1 ? "saved post" : "saved posts"}`}
              </p>
            </div>
          </div>

          {/* Posts Grid */}
          {loadingDetail ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 py-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-white/5 animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : (activeCollection === "all" ? allBookmarks : activeCollectionPosts).length === 0 ? (
            <div className="py-16 text-center text-white/50 text-xs">
              <Bookmark className="size-8 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p className="font-semibold text-white/80">No posts in this collection yet.</p>
              <p className="text-[11px] text-white/40 mt-1">
                Tap the bookmark icon on any post to save it here!
              </p>
            </div>
          ) : (
            <div className="nova-profile__grid">
              {(activeCollection === "all" ? allBookmarks : activeCollectionPosts).map((post, idx) => (
                <div
                  key={post._id}
                  className="nova-profile__tile group/coltile"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenPost(post)}
                    className="nova-profile__tile-btn"
                    aria-label="Open post"
                  >
                    {post.mediaType === "video" ? (
                      <video
                        src={post.image}
                        className="nova-profile__tile-media"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.image}
                        alt="Saved post"
                        className="nova-profile__tile-media"
                      />
                    )}

                    {post.mediaType === "video" && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                        <Play className="size-3 fill-white" />
                      </div>
                    )}

                    <div className="nova-profile__tile-overlay">
                      <span className="nova-profile__tile-stat">
                        <Heart className="size-4 fill-current" />
                        {post.likes?.length || 0}
                      </span>
                      <span className="nova-profile__tile-stat">
                        <MessageCircle className="size-4" strokeWidth={2} />
                        {post.comments?.length || 0}
                      </span>
                    </div>
                  </button>

                  {/* Quick Organize: Save to collection button on post tile */}
                  {isLoggedInUser && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrganizingPost(post);
                      }}
                      className="absolute top-2 right-2 size-7 rounded-full bg-black/75 backdrop-blur-md text-white/80 hover:text-indigo-400 hover:bg-black/95 flex items-center justify-center opacity-0 group-hover/coltile:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                      title="Add to a collection"
                    >
                      <FolderPlus className="size-3.5" />
                    </button>
                  )}

                  {/* Remove from custom collection button */}
                  {activeCollection !== "all" && isLoggedInUser && (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePostFromCurrent(post._id, e)}
                      className="absolute top-2 left-2 size-7 rounded-full bg-black/75 backdrop-blur-md text-white/70 hover:text-red-400 hover:bg-black/95 flex items-center justify-center opacity-0 group-hover/coltile:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                      title="Remove from this collection"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ════════════ VIEW: COLLECTIONS OVERVIEW CARDS ════════════ */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Default "All Posts" */}
            <div
              onClick={() => handleOpenCollection("all")}
              className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[#0f1222] border border-white/10 hover:border-indigo-500/50 transition-all shadow-md flex flex-col justify-end p-3.5"
            >
              {/* Collage Preview */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {renderFourPreview(allBookmarks, "")}
              </div>

              <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-white drop-shadow-md flex items-center gap-1.5">
                  <Bookmark className="size-3.5 fill-indigo-400 text-indigo-400" />
                  <span>All Posts</span>
                </h4>
                <p className="text-[11px] text-white/70 font-medium drop-shadow-sm">
                  {allBookmarks.length} {allBookmarks.length === 1 ? "post" : "posts"}
                </p>
              </div>
            </div>

            {/* Custom Collection Cards */}
            {collections.map((col) => (
              <div
                key={col._id}
                onClick={() => handleOpenCollection(col)}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[#0f1222] border border-white/10 hover:border-indigo-500/50 transition-all shadow-md flex flex-col justify-end p-3.5"
              >
                {/* Collage Preview */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  {renderFourPreview(col.posts || [], col.coverImage)}
                </div>

                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                {/* Menu Dropdown Trigger */}
                {isLoggedInUser && (
                  <div
                    className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="size-7 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-36 p-1 bg-[#181a2e] border-white/10 text-white">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCol(col);
                            setRenameValue(col.name);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors text-left"
                        >
                          <Edit2 className="size-3" />
                          <span>Rename</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCollection(col._id, e)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-colors text-left"
                        >
                          <Trash2 className="size-3" />
                          <span>Delete</span>
                        </button>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="relative z-10">
                  <h4 className="text-sm font-bold text-white drop-shadow-md truncate flex items-center gap-1.5">
                    <Folder className="size-3.5 text-indigo-400" />
                    <span>{col.name}</span>
                  </h4>
                  <p className="text-[11px] text-white/70 font-medium drop-shadow-sm">
                    {col.posts?.length || 0} {col.posts?.length === 1 ? "post" : "posts"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════ MODALS ════════════ */}
      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#111425] border border-white/10 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <FolderPlus className="size-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">New Collection</h3>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-3">
              <input
                type="text"
                autoFocus
                maxLength={50}
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Collection name (e.g. Gym, Travel, Tech)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-white/40 outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim() || creating}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="size-3 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Collection Modal */}
      {renamingCol && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setRenamingCol(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#111425] border border-white/10 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Edit2 className="size-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Rename Collection</h3>
            </div>

            <form onSubmit={handleRenameCollection} className="space-y-3">
              <input
                type="text"
                autoFocus
                maxLength={50}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingCol(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organize / Add to Collection Modal from Profile */}
      <SaveToCollectionModal
        isOpen={Boolean(organizingPost)}
        onClose={() => setOrganizingPost(null)}
        post={organizingPost}
        onSaved={() => {
          fetchCollections();
          if (activeCollection && activeCollection !== "all") {
            handleOpenCollection(activeCollection);
          }
        }}
      />
    </div>
  );
};

export default SavedCollectionsSection;
