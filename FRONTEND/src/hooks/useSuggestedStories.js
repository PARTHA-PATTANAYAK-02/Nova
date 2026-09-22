import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiUrl } from "@/lib/api";

const VIEWED_KEY = "nova:viewedStoryItems";
const getId = (value) => (typeof value === "object" ? value?._id : value)?.toString();

const readViewedStories = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

export const useSuggestedStories = (users) => {
  const [stories, setStories] = useState([]);
  const [viewedSet, setViewedSet] = useState(readViewedStories);
  const userIds = useMemo(
    () => (users || []).map((user) => getId(user)).filter(Boolean).join(","),
    [users],
  );

  useEffect(() => {
    if (!userIds) {
      setStories([]);
      return undefined;
    }
    let cancelled = false;
    axios
      .get(apiUrl(`/api/v1/story?userIds=${encodeURIComponent(userIds)}`), {
        withCredentials: true,
      })
      .then((response) => {
        if (!cancelled && response.data?.success) setStories(response.data.stories || []);
      })
      .catch(() => !cancelled && setStories([]));
    return () => { cancelled = true; };
  }, [userIds]);

  const storiesByUserId = useMemo(
    () => new Map(stories.map((story) => [getId(story.user?._id), story])),
    [stories],
  );
  const isAllViewed = useCallback(
    (story) => story?.items?.every((item) => viewedSet.has(item._id)) ?? false,
    [viewedSet],
  );
  const markViewed = useCallback((itemId) => {
    setViewedSet((previous) => {
      if (previous.has(itemId)) return previous;
      const next = new Set(previous).add(itemId);
      try { localStorage.setItem(VIEWED_KEY, JSON.stringify([...next])); } catch { /* optional */ }
      return next;
    });
  }, []);

  return { stories, storiesByUserId, isAllViewed, markViewed };
};
