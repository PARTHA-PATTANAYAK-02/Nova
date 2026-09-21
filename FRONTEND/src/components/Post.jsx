import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Bookmark,
  MessageCircle,
  MoreHorizontal,
  Send,
  Heart,
} from "lucide-react";
import CommentDialog from "./CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Link, useNavigate } from "react-router-dom";
import { updateBookmarks, updateFollowing } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const Post = ({ post }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const { user } = useSelector((store) => store.auth);
  const { posts, selectedPost } = useSelector((store) => store.post);
  const isFollowing = user?.following?.includes(post.author._id);
  const [bookmarked, setBookmarked] = useState(
    user?.bookmarks?.some(
      (bookmark) => (bookmark?._id || bookmark) === post._id,
    ) || false,
  );

  const [liked, setLiked] = useState(post.likes.includes(user?._id) || false);
  const [postLike, setPostLike] = useState(post.likes.length);
  const [comment, setComment] = useState(post.comments);
  const [actionLoading, setActionLoading] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const likeRef = useRef(null);
  const commentRef = useRef(null);
  const bookmarkRef = useRef(null);

  /* ---------- IMAGE DIMENSIONS ---------- */
  useEffect(() => {
    const img = new Image();
    img.src = post.image;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
  }, [post.image]);

  useEffect(() => {
    if (selectedPost?._id === post._id) {
      setOpen(true);
    }
  }, [selectedPost, post._id]);

  const changeEventHandler = (e) => setText(e.target.value);

  const triggerAnimation = (ref, cls) => {
    if (!ref.current) return;
    const el = ref.current;
    el.classList.remove(cls);
    // Force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  };

  /* ---------- LIKE — INSTANT (optimistic) ---------- */
  const likeOrDislikeHandler = async () => {
    if (actionLoading === "like") return;

    const wasLiked = liked;
    const nowLiked = !wasLiked;
    const newCount = wasLiked ? postLike - 1 : postLike + 1;

    // 1) INSTANT UI
    setLiked(nowLiked);
    setPostLike(newCount);

    // 2) INSTANT animation
    triggerAnimation(likeRef, "animate-like");

    // 3) INSTANT redux
    const updatedPostData = posts.map((p) =>
      p._id === post._id
        ? {
            ...p,
            likes: wasLiked
              ? p.likes.filter((id) => id !== user._id)
              : [...p.likes, user._id],
          }
        : p,
    );
    dispatch(setPosts(updatedPostData));

    // 4) INSTANT toast
    toast.success(nowLiked ? "Post liked" : "Post unliked");

    // 5) Background API
    try {
      setActionLoading("like");
      const action = nowLiked ? "like" : "dislike";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (!res.data.success) {
        // rollback
        setLiked(wasLiked);
        setPostLike(wasLiked ? newCount + 1 : newCount - 1);
        dispatch(setPosts(posts));
      }
    } catch (error) {
      setLiked(wasLiked);
      setPostLike(wasLiked ? newCount + 1 : newCount - 1);
      dispatch(setPosts(posts));
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- COMMENT ---------- */
  const commentHandler = async () => {
    if (!text.trim() || actionLoading) return;
    try {
      setActionLoading("comment");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        triggerAnimation(commentRef, "animate-comment");

        const updatedCommentData = [...comment, res.data.comment];
        setComment(updatedCommentData);
        const updatedPostData = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedCommentData } : p,
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
        setText("");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- DELETE ---------- */
  const deletePostHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("delete");
      const res = await axios.delete(
        apiUrl(`/api/v1/post/delete/${post?._id}`),
        { withCredentials: true },
      );
      if (res.data.success) {
        const updatedPostData = posts.filter(
          (postItem) => postItem?._id !== post?._id,
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- BOOKMARK ---------- */
  const bookmarkHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("bookmark");
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post?._id}/bookmark`),
        { withCredentials: true },
      );
      if (res.data.success) {
        triggerAnimation(bookmarkRef, "animate-bookmark");
        toast.success(res.data.message);
        setBookmarked(res.data.type === "saved");
        dispatch(updateBookmarks({ postId: post._id }));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update saved posts."));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- FOLLOW ---------- */
  const handleFollow = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("follow");
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${post.author._id}`),
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success(res.data.message);
        dispatch(updateFollowing(post.author._id));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    } finally {
      setActionLoading(null);
    }
  };

  const openChatWithAuthor = () => {
    navigate("/chat", { state: { user: post.author } });
  };

  /* ---------- UI ---------- */
  return (
    <article className="card card-hover overflow-hidden">
      {/* ============ HEADER ============ */}
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to={`/profile/${post.author._id}`} className="shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.author?.profilePicture} alt="post_image" />
              <AvatarFallback>
                {(post.author?.fullName || post.author?.username)
                  ?.charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={`/profile/${post.author._id}`}
              className="font-semibold text-sm text-[var(--foreground)] hover:opacity-80 transition-opacity truncate"
            >
              {post.author?.fullName || post.author?.username}
            </Link>
            {user?._id === post.author._id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--muted-foreground)] font-medium">
                You
              </span>
            )}
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px] p-2">
            <DialogTitle className="sr-only">Post options</DialogTitle>
            <DialogDescription className="sr-only">
              Actions you can take on this post
            </DialogDescription>
            <div className="space-y-0.5 p-1">
              {post?.author?._id !== user?._id && (
                <button
                  onClick={handleFollow}
                  disabled={actionLoading !== null}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? "text-[var(--danger)] hover:bg-[var(--surface-2)]"
                      : "text-[var(--primary)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              <button
                onClick={bookmarkHandler}
                disabled={actionLoading !== null}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
              >
                {bookmarked ? "Remove from saved" : "Save post"}
              </button>
              {user && user?._id === post?.author._id && (
                <button
                  onClick={deletePostHandler}
                  disabled={actionLoading !== null}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                >
                  Delete post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* ============ IMAGE ============ */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden bg-[var(--surface-2)]"
        style={{
          maxHeight: "640px",
          aspectRatio:
            imageDimensions.width > 0
              ? `${imageDimensions.width}/${imageDimensions.height}`
              : "1/1",
        }}
        onDoubleClick={() => {
          if (!liked) likeOrDislikeHandler();
        }}
      >
        <img
          className="w-full h-full object-contain select-none"
          src={post.image}
          alt="post_img"
          onLoad={(e) => {
            if (imageDimensions.width === 0) {
              setImageDimensions({
                width: e.target.naturalWidth,
                height: e.target.naturalHeight,
              });
            }
          }}
        />
      </div>

      {/* ============ ACTIONS ============ */}
      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-0.5">
            {/* LIKE */}
            <button
              ref={likeRef}
              onClick={likeOrDislikeHandler}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Heart
                className={`h-[22px] w-[22px] like-heart ${
                  liked ? "is-liked" : ""
                }`}
                strokeWidth={liked ? 0 : 1.8}
                fill={liked ? "var(--danger)" : "none"}
              />
            </button>

            {/* COMMENT */}
            <button
              ref={commentRef}
              onClick={() => {
                dispatch(setSelectedPost(post));
                setOpen(true);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>

            {/* SEND / DM */}
            <button
              onClick={openChatWithAuthor}
              aria-label={`Message ${
                post.author?.fullName || post.author?.username
              }`}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Send className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>
          </div>

          {/* BOOKMARK */}
          <button
            ref={bookmarkRef}
            onClick={bookmarkHandler}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Bookmark
              className={`h-[22px] w-[22px] transition-all duration-200 ${
                bookmarked ? "fill-[var(--gold)] text-[var(--gold)]" : ""
              }`}
              strokeWidth={1.8}
            />
          </button>
        </div>

        {/* LIKES COUNT */}
        <div className="mb-1 text-sm font-semibold text-[var(--foreground)]">
          {postLike}{" "}
          <span className="font-medium text-[var(--muted-foreground)]">
            {postLike === 1 ? "like" : "likes"}
          </span>
        </div>

        {/* CAPTION */}
        <div className="mb-1 text-sm leading-relaxed">
          <Link
            to={`/profile/${post.author._id}`}
            className="font-semibold text-[var(--foreground)] mr-1.5 hover:opacity-80 transition-opacity"
          >
            {post.author?.fullName || post.author?.username}
          </Link>
          <span className="text-[var(--foreground)]">{post.caption}</span>
        </div>

        {/* COMMENTS PREVIEW */}
        {comment.length > 0 && (
          <button
            onClick={() => {
              dispatch(setSelectedPost(post));
              setOpen(true);
            }}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mt-0.5"
          >
            View all {comment.length}{" "}
            {comment.length === 1 ? "comment" : "comments"}
          </button>
        )}

        {/* ADD COMMENT */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[var(--border)]">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={changeEventHandler}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--muted-foreground)] text-[var(--foreground)] py-1"
          />
          {text && (
            <button
              onClick={commentHandler}
              disabled={actionLoading !== null}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {actionLoading === "comment" ? "Posting…" : "Post"}
            </button>
          )}
        </div>
      </div>

      <CommentDialog
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) dispatch(setSelectedPost(null));
        }}
      />
    </article>
  );
};

export default Post;
