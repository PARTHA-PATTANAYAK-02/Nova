import React, { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Check,
  EllipsisVertical,
  Heart,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  SendHorizontal,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import CommentDialog from "@/components/comments/CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Link, useNavigate } from "react-router-dom";
import { updateBookmarks, updateFollowing } from "@/redux/authSlice";
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
};

const Post = ({ post }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [postLike, setPostLike] = useState(post?.likes?.length || 0);
  const [comment, setComment] = useState(post?.comments || []);
  const [actionLoading, setActionLoading] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const { user } = useSelector((store) => store.auth);
  const { posts, selectedPost } = useSelector((store) => store.post);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const likeRef = useRef(null);
  const commentRef = useRef(null);
  const bookmarkRef = useRef(null);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const heartTimeoutRef = useRef(null);

  const isOwnPost = user?._id === post?.author?._id;
  const isFollowing = user?.following?.some(
    (item) => (item?._id || item) === post?.author?._id,
  );

  useEffect(() => {
    setLiked(
      post?.likes?.some((item) => (item?._id || item) === user?._id) || false,
    );
    setPostLike(post?.likes?.length || 0);
    setComment(post?.comments || []);
  }, [post?._id, post?.likes, post?.comments, user?._id]);

  useEffect(() => {
    setBookmarked(
      user?.bookmarks?.some((item) => (item?._id || item) === post?._id) ||
        false,
    );
  }, [user?.bookmarks, post?._id]);

  useEffect(() => {
    if (selectedPost?._id === post?._id) setOpen(true);
  }, [selectedPost, post?._id]);

  const triggerAnimation = useCallback((ref, className) => {
    const element = ref.current;
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), 850);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(controlsTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimeoutRef.current = window.setTimeout(
        () => setControlsVisible(false),
        2600,
      );
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post?.mediaType !== "video") return undefined;

    const syncPlayback = () => {
      const videos = [...document.querySelectorAll("video[data-feed-video]")];
      const center = window.innerHeight / 2;
      let activeVideo = null;
      let closestDistance = Infinity;

      videos.forEach((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const visibleHeight = Math.max(
          0,
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
        );
        const visibleRatio = visibleHeight / Math.max(rect.height, 1);
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        if (
          visibleRatio >= 0.72 &&
          distance < window.innerHeight * 0.3 &&
          distance < closestDistance
        ) {
          closestDistance = distance;
          activeVideo = candidate;
        }
      });

      const tabVisible = document.visibilityState === "visible";
      videos.forEach((candidate) => {
        const shouldPlay =
          candidate === activeVideo &&
          tabVisible &&
          candidate.dataset.userPaused !== "true" &&
          !candidate.ended;
        if (shouldPlay && candidate.paused) {
          candidate.play().catch(() => {});
        } else if (!shouldPlay && !candidate.paused) {
          candidate.dataset.autoPause = "true";
          candidate.pause();
        }
      });
    };

    const observer = new IntersectionObserver(syncPlayback, {
      threshold: [0, 0.5, 0.72, 0.9, 1],
    });
    observer.observe(video);
    window.addEventListener("scroll", syncPlayback, { passive: true });
    window.addEventListener("resize", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncPlayback);
      window.removeEventListener("resize", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [post?._id, post?.mediaType]);

  useEffect(
    () => () => {
      window.clearTimeout(controlsTimeoutRef.current);
      window.clearTimeout(heartTimeoutRef.current);
    },
    [],
  );

  const likeOrDislikeHandler = async () => {
    if (actionLoading === "like" || !user?._id) return;
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    const previousPosts = posts;
    const nextCount = Math.max(0, postLike + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setPostLike(nextCount);
    triggerAnimation(likeRef, "nova-post-like-pop");
    const updatedPosts = posts.map((item) =>
      item._id === post._id
        ? {
            ...item,
            likes: nextLiked
              ? [
                  ...(item.likes || []).filter(
                    (id) => (id?._id || id) !== user._id,
                  ),
                  user._id,
                ]
              : (item.likes || []).filter((id) => (id?._id || id) !== user._id),
          }
        : item,
    );
    dispatch(setPosts(updatedPosts));

    try {
      setActionLoading("like");
      const action = nextLiked ? "like" : "dislike";
      const response = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (!response.data.success) throw new Error("Unable to update the like.");
    } catch (error) {
      setLiked(wasLiked);
      setPostLike(postLike);
      dispatch(setPosts(previousPosts));
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMediaDoubleClick = () => {
    setHeartBurst(true);
    window.clearTimeout(heartTimeoutRef.current);
    heartTimeoutRef.current = window.setTimeout(
      () => setHeartBurst(false),
      950,
    );
    // Always show the Instagram-style burst; only toggle the like if not already liked.
    if (!liked) likeOrDislikeHandler();
  };

  const lastTouchRef = useRef(0);
  const handleMediaTouchEnd = (event) => {
    const now = Date.now();
    if (now - lastTouchRef.current < 280) {
      event.preventDefault();
      handleMediaDoubleClick();
    }
    lastTouchRef.current = now;
  };

  const commentHandler = async (event) => {
    event?.preventDefault?.();
    if (!text.trim() || actionLoading) return;
    try {
      setActionLoading("comment");
      const response = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text: text.trim() },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (response.data.success) {
        triggerAnimation(commentRef, "nova-post-comment-pop");
        const nextComments = [...comment, response.data.comment];
        setComment(nextComments);
        dispatch(
          setPosts(
            posts.map((item) =>
              item._id === post._id
                ? { ...item, comments: nextComments }
                : item,
            ),
          ),
        );
        setText("");
        toast.success(response.data.message || "Comment added");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
    } finally {
      setActionLoading(null);
    }
  };

  const bookmarkHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("bookmark");
      const response = await axios.get(
        apiUrl(`/api/v1/post/${post?._id}/bookmark`),
        { withCredentials: true },
      );
      if (response.data.success) {
        const isSaved = response.data.type === "saved";
        setBookmarked(isSaved);
        triggerAnimation(
          bookmarkRef,
          isSaved ? "nova-post-save-in" : "nova-post-save-out",
        );
        dispatch(updateBookmarks({ postId: post._id }));
        toast.success(
          response.data.message || (isSaved ? "Post saved" : "Post removed"),
        );
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
      const response = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${post.author._id}`),
        {},
        { withCredentials: true },
      );
      if (response.data.success) {
        dispatch(updateFollowing(post.author._id));
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    } finally {
      setActionLoading(null);
    }
  };

  const deletePostHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("delete");
      const response = await axios.delete(
        apiUrl(`/api/v1/post/delete/${post?._id}`),
        { withCredentials: true },
      );
      if (response.data.success) {
        dispatch(setPosts(posts.filter((item) => item?._id !== post?._id)));
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
    } finally {
      setActionLoading(null);
    }
  };

  const openChatWithAuthor = () => {
    navigate("/chat", { state: { user: post.author } });
  };

  const openComments = () => {
    dispatch(setSelectedPost(post));
    setOpen(true);
    triggerAnimation(commentRef, "nova-post-comment-pop");
  };

  const progressPercent = videoDuration
    ? Math.min(100, (videoTime / videoDuration) * 100)
    : 0;

  return (
    <article className="nova-post">
      <header className="nova-post__header">
        <div className="nova-post__identity">
          <Link
            to={`/profile/${post.author._id}`}
            className="nova-post__avatar-link"
            aria-label={`${getDisplayName(post.author)} profile`}
          >
            <Avatar className="nova-post__avatar">
              <AvatarImage
                src={post.author?.profilePicture}
                alt={getDisplayName(post.author)}
              />
              <AvatarFallback>
                {getDisplayName(post.author, "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="nova-post__author-meta">
            <div className="nova-post__author-line">
              <Link
                to={`/profile/${post.author._id}`}
                className="nova-post__author-name"
              >
                {getDisplayName(post.author)}
              </Link>
              {isOwnPost && <span className="nova-post__you">YOU</span>}
            </div>
            <span className="nova-post__subtitle">
              {post.location ||
                (post.mediaType === "video" ? "Video post" : "Shared a moment")}
            </span>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="nova-post__icon-button nova-post__more"
              aria-label="Post options"
            >
              <EllipsisVertical size={22} strokeWidth={2.1} />
            </button>
          </DialogTrigger>
          <DialogContent className="nova-post__menu-dialog sm:max-w-[360px]">
            <DialogTitle>Post options</DialogTitle>
            <DialogDescription>
              Manage this post and your connection.
            </DialogDescription>
            <div className="nova-post__menu">
              {!isOwnPost && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={!!actionLoading}
                >
                  {isFollowing ? "Unfollow account" : "Follow account"}
                </button>
              )}
              <button
                type="button"
                onClick={bookmarkHandler}
                disabled={!!actionLoading}
              >
                {bookmarked ? "Remove from saved" : "Save post"}
              </button>
              {isOwnPost && (
                <button
                  type="button"
                  className="is-danger"
                  onClick={deletePostHandler}
                  disabled={!!actionLoading}
                >
                  Delete post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div
        className={`nova-post__media ${post.mediaType === "video" ? "is-video" : "is-image"}`}
        onDoubleClick={handleMediaDoubleClick}
        onTouchEnd={handleMediaTouchEnd}
        onMouseMove={post.mediaType === "video" ? showControls : undefined}
        onTouchStart={post.mediaType === "video" ? showControls : undefined}
        onMouseLeave={() => {
          if (videoPlaying) {
            window.clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = window.setTimeout(
              () => setControlsVisible(false),
              500,
            );
          }
        }}
      >
        {post.mediaType === "video" ? (
          <>
            <video
              ref={videoRef}
              data-feed-video
              src={post.image}
              className="nova-post__video"
              controls={false}
              muted={false}
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload noplaybackrate nofullscreen"
              aria-label="Post video"
              onContextMenu={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                const video = event.currentTarget;
                if (video.ended) {
                  video.currentTime = 0;
                  setVideoTime(0);
                  setVideoEnded(false);
                }
                if (video.paused) {
                  video.dataset.userPaused = "false";
                  video.play().catch(() => {});
                  showControls();
                } else {
                  video.dataset.userPaused = "true";
                  video.pause();
                  setControlsVisible(true);
                }
              }}
              onLoadedMetadata={(event) => {
                setVideoDuration(event.currentTarget.duration || 0);
                event.currentTarget.volume = videoVolume;
              }}
              onTimeUpdate={(event) =>
                setVideoTime(event.currentTarget.currentTime)
              }
              onPlay={(event) => {
                event.currentTarget.dataset.userPaused = "false";
                setVideoPlaying(true);
                setVideoEnded(false);
                showControls();
              }}
              onEnded={(event) => {
                event.currentTarget.dataset.userPaused = "true";
                setVideoPlaying(false);
                setVideoEnded(true);
                setControlsVisible(true);
              }}
              onPause={(event) => {
                const video = event.currentTarget;
                setVideoPlaying(false);
                if (video.dataset.autoPause === "true") {
                  delete video.dataset.autoPause;
                } else if (!video.ended) {
                  video.dataset.userPaused = "true";
                }
                setControlsVisible(true);
              }}
              onDoubleClick={(event) => event.preventDefault()}
            />

            {!videoPlaying && (
              <button
                type="button"
                className="nova-post__center-play"
                aria-label={videoEnded ? "Replay video" : "Play video"}
                onClick={(event) => {
                  event.stopPropagation();
                  const video = videoRef.current;
                  if (!video) return;
                  if (video.ended || videoEnded) {
                    video.currentTime = 0;
                    setVideoTime(0);
                  }
                  video.dataset.userPaused = "false";
                  setVideoEnded(false);
                  video.play().catch(() => {});
                  showControls();
                }}
              >
                {videoEnded ? (
                  <RotateCcw size={27} />
                ) : (
                  <Play size={28} fill="currentColor" strokeWidth={0} />
                )}
              </button>
            )}

            <div
              className={`nova-post__video-controls ${controlsVisible ? "is-visible" : ""}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="nova-post__seek-wrap">
                <div className="nova-post__seek-track">
                  <div
                    className="nova-post__seek-progress"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <span
                    className="nova-post__seek-thumb"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
                <input
                  className="nova-post__seek-input"
                  type="range"
                  aria-label="Seek video"
                  min="0"
                  max={videoDuration || 1}
                  step="0.1"
                  value={Math.min(videoTime, videoDuration || 0)}
                  onChange={(event) => {
                    const time = Number(event.target.value);
                    setVideoTime(time);
                    if (videoRef.current) videoRef.current.currentTime = time;
                    showControls();
                  }}
                />
              </div>
              <div className="nova-post__player-row">
                <button
                  type="button"
                  className="nova-post__player-button"
                  aria-label={videoPlaying ? "Pause video" : "Play video"}
                  onClick={() => {
                    const video = videoRef.current;
                    if (!video) return;
                    if (video.ended) {
                      video.currentTime = 0;
                      setVideoTime(0);
                      setVideoEnded(false);
                    }
                    if (video.paused) {
                      video.dataset.userPaused = "false";
                      video.play().catch(() => {});
                    } else {
                      video.dataset.userPaused = "true";
                      video.pause();
                    }
                    showControls();
                  }}
                >
                  {videoPlaying ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                </button>
                <span className="nova-post__time">
                  {formatTime(videoTime)} <span>/</span>{" "}
                  {formatTime(videoDuration)}
                </span>
                <span className="nova-post__player-spacer" />
                <div
                  className="nova-post__volume"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    type="button"
                    className="nova-post__player-button"
                    aria-label={videoVolume === 0 ? "Unmute" : "Mute"}
                    onClick={() => {
                      const nextVolume = videoVolume === 0 ? 1 : 0;
                      setVideoVolume(nextVolume);
                      if (videoRef.current)
                        videoRef.current.volume = nextVolume;
                      showControls();
                    }}
                  >
                    {videoVolume === 0 ? (
                      <VolumeX size={18} />
                    ) : videoVolume < 0.5 ? (
                      <Volume1 size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                  <div
                    className={`nova-post__volume-slider ${showVolumeSlider ? "is-open" : ""}`}
                  >
                    <input
                      type="range"
                      aria-label="Video volume"
                      min="0"
                      max="1"
                      step="0.05"
                      value={videoVolume}
                      onChange={(event) => {
                        const volume = Number(event.target.value);
                        setVideoVolume(volume);
                        if (videoRef.current) videoRef.current.volume = volume;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <img
            className="nova-post__image"
            src={post.image}
            alt={post.caption || "Post image"}
            draggable={false}
          />
        )}
        {heartBurst && (
          <div className="nova-post__heart-burst" aria-hidden="true">
            <Heart size={120} strokeWidth={2.2} fill="#ff315d" />
          </div>
        )}
      </div>

      <section className="nova-post__body">
        <div className="nova-post__actions" aria-label="Post actions">
          <div className="nova-post__action-group">
            <div className="nova-post__action-unit">
              <button
                ref={likeRef}
                type="button"
                onClick={likeOrDislikeHandler}
                disabled={actionLoading === "like"}
                className={`nova-post__action nova-post__like ${liked ? "is-liked" : ""}`}
                aria-label={liked ? "Unlike post" : "Like post"}
              >
                <Heart
                  className="nova-post__like-icon"
                  size={24}
                  strokeWidth={2.2}
                  fill={liked ? "currentColor" : "none"}
                />
              </button>
              <span
                className="nova-post__inline-count"
                key={`likes-${postLike}`}
              >
                {postLike.toLocaleString()}
              </span>
            </div>
            <div className="nova-post__action-unit">
              <button
                ref={commentRef}
                type="button"
                onClick={openComments}
                className="nova-post__action"
                aria-label="Open comments"
              >
                <MessageCircle size={23} strokeWidth={2.1} />
              </button>
              <span
                className="nova-post__inline-count"
                key={`comments-${comment.length}`}
              >
                {comment.length.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="nova-post__action-group nova-post__action-group--right">
            <button
              type="button"
              onClick={openChatWithAuthor}
              aria-label={`Message ${getDisplayName(post.author)}`}
              className="nova-post__action nova-post__share"
            >
              <SendHorizontal size={22} strokeWidth={2.1} />
            </button>
            <button
              ref={bookmarkRef}
              type="button"
              onClick={bookmarkHandler}
              disabled={!!actionLoading}
              className={`nova-post__action nova-post__bookmark ${bookmarked ? "is-saved" : ""}`}
              aria-label={bookmarked ? "Remove saved post" : "Save post"}
            >
              {bookmarked ? (
                <Check className="nova-post__saved-check" size={12} />
              ) : null}
              <Bookmark
                size={23}
                strokeWidth={2.1}
                fill={bookmarked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        <p className="nova-post__caption">
          <Link
            to={`/profile/${post.author._id}`}
            className="nova-post__caption-author"
          >
            {getDisplayName(post.author)}
          </Link>
          {post.caption && (
            <span className="nova-post__caption-text">{post.caption}</span>
          )}
        </p>

        {comment.length > 0 && (
          <button
            type="button"
            className="nova-post__view-comments"
            onClick={openComments}
          >
            View all {comment.length}{" "}
            {comment.length === 1 ? "comment" : "comments"}
          </button>
        )}

        <form className="nova-post__inline-comment" onSubmit={commentHandler}>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a comment…"
            aria-label="Write a comment"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!text.trim() || actionLoading === "comment"}
          >
            {actionLoading === "comment" ? "Posting…" : "Post"}
          </button>
        </form>
      </section>

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
