import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Bookmark, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { Button } from "./ui/button";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import CommentDialog from "./CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Badge } from "./ui/badge";
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

  /* ---------- REFS (logic) ---------- */
  const likeRef = useRef(null);
  const commentRef = useRef(null);
  const bookmarkRef = useRef(null);

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    const img = new Image();
    img.src = post.image;
    img.onload = () => {
      setImageDimensions({
        width: img.width,
        height: img.height,
      });
    };
  }, [post.image]);

  useEffect(() => {
    if (selectedPost?._id === post._id) {
      setOpen(true);
    }
  }, [selectedPost, post._id]);

  const changeEventHandler = (e) => {
    setText(e.target.value);
  };

  const animateButton = (ref, animationClass) => {
    if (ref.current) {
      ref.current.classList.add(animationClass);
      setTimeout(() => {
        ref.current.classList.remove(animationClass);
      }, 700);
    }
  };

  const likeOrDislikeHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("like");
      const action = liked ? "dislike" : "like";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (res.data.success) {
        animateButton(likeRef, "animate-like");

        const updatedLikes = liked ? postLike - 1 : postLike + 1;
        setPostLike(updatedLikes);
        setLiked(!liked);

        const updatedPostData = posts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: liked
                  ? p.likes.filter((id) => id !== user._id)
                  : [...p.likes, user._id],
              }
            : p,
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setActionLoading(null);
    }
  };

  const commentHandler = async () => {
    if (!text.trim() || actionLoading) return;
    try {
      setActionLoading("comment");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        animateButton(commentRef, "animate-comment");

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

  const bookmarkHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("bookmark");
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post?._id}/bookmark`),
        { withCredentials: true },
      );
      if (res.data.success) {
        animateButton(bookmarkRef, "animate-bookmark");
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
    <article className="group/post relative glass rounded-[28px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)] transition-all duration-500 hover:shadow-[0_16px_60px_rgba(124,92,255,0.18)] hover:border-white/15">
      {/* ---------- HEADER ---------- */}
      <header className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/profile/${post.author._id}`} className="shrink-0">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-70 group-hover/post:opacity-100 transition-opacity duration-300" />
              <Avatar className="relative h-10 w-10 ring-2 ring-[#0a0a18]">
                <AvatarImage
                  src={post.author?.profilePicture}
                  alt="post_image"
                />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-xs font-semibold">
                  {(post.author?.fullName || post.author?.username)
                    ?.charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <Link
              to={`/profile/${post.author._id}`}
              className="font-semibold text-[15px] text-white/95 hover:text-white truncate transition-colors"
            >
              {post.author?.fullName || post.author?.username}
            </Link>
            {user?._id === post.author._id && (
              <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 border-white/10 hover:bg-white/10">
                You
              </Badge>
            )}
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all duration-200">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] glass-strong !rounded-3xl !border-white/10 p-2">
            <DialogTitle className="sr-only">Post options</DialogTitle>
            <DialogDescription className="sr-only">
              Actions you can take on this post
            </DialogDescription>
            <div className="space-y-1 p-2">
              {post?.author?._id !== user?._id && (
                <button
                  onClick={handleFollow}
                  disabled={actionLoading !== null}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? "text-rose-300 hover:bg-rose-500/10"
                      : "text-violet-300 hover:bg-violet-500/10"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              <button
                onClick={bookmarkHandler}
                disabled={actionLoading !== null}
                className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-white/80 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {bookmarked ? "Remove from saved" : "Add to saved"}
              </button>
              {user && user?._id === post?.author._id && (
                <button
                  onClick={deletePostHandler}
                  disabled={actionLoading !== null}
                  className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  Delete post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* ---------- IMAGE ---------- */}
      <div
        className="relative w-full bg-[#0a0a18] flex items-center justify-center overflow-hidden"
        style={{
          maxHeight: "680px",
          aspectRatio:
            imageDimensions.width > 0
              ? `${imageDimensions.width}/${imageDimensions.height}`
              : "1/1",
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

      {/* ---------- ACTIONS ---------- */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {/* LIKE */}
            <button
              ref={likeRef}
              onClick={likeOrDislikeHandler}
              disabled={actionLoading !== null}
              className="group/btn w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all duration-200 disabled:opacity-50"
            >
              {liked ? (
                <FaHeart
                  size={22}
                  className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                />
              ) : (
                <FaRegHeart
                  size={22}
                  className="group-hover/btn:scale-110 transition-transform"
                />
              )}
            </button>

            {/* COMMENT */}
            <button
              ref={commentRef}
              onClick={() => {
                dispatch(setSelectedPost(post));
                setOpen(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all duration-200"
            >
              <MessageCircle className="h-6 w-6 hover:scale-110 transition-transform" />
            </button>

            {/* SEND / DM */}
            <button
              onClick={openChatWithAuthor}
              aria-label={`Message ${
                post.author?.fullName || post.author?.username
              }`}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all duration-200"
            >
              <Send className="h-6 w-6 hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* BOOKMARK */}
          <button
            ref={bookmarkRef}
            onClick={bookmarkHandler}
            disabled={actionLoading !== null}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all duration-200 disabled:opacity-50"
          >
            <Bookmark
              className={`h-6 w-6 transition-all duration-200 hover:scale-110 ${
                bookmarked
                  ? "fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]"
                  : ""
              }`}
            />
          </button>
        </div>

        {/* LIKES */}
        <div className="mb-1.5 text-sm font-semibold text-white/95">
          {postLike}{" "}
          <span className="font-medium text-white/60">
            {postLike === 1 ? "like" : "likes"}
          </span>
        </div>

        {/* CAPTION */}
        <div className="mb-1 text-sm leading-relaxed">
          <Link
            to={`/profile/${post.author._id}`}
            className="font-semibold text-white/95 mr-2 hover:text-white transition-colors"
          >
            {post.author?.fullName || post.author?.username}
          </Link>
          <span className="text-white/75">{post.caption}</span>
        </div>

        {/* COMMENTS PREVIEW */}
        {comment.length > 0 && (
          <button
            onClick={() => {
              dispatch(setSelectedPost(post));
              setOpen(true);
            }}
            className="text-xs text-white/40 hover:text-white/70 transition-colors mt-1"
          >
            View all {comment.length}{" "}
            {comment.length === 1 ? "comment" : "comments"}
          </button>
        )}

        {/* ADD COMMENT */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={changeEventHandler}
            className="flex-1 bg-transparent outline-none text-sm placeholder-white/30 text-white/90 py-1.5"
          />
          {text && (
            <button
              onClick={commentHandler}
              disabled={actionLoading !== null}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
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
