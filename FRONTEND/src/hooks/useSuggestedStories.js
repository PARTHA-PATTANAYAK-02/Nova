import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import {
  checkIsStoryAllViewed,
  getGlobalViewedItemIds,
  markStoryItemAsViewed,
} from "@/lib/story";

const getId = (value) => (typeof value === "object" ? value?._id : value)?.toString();

export const useSuggestedStories = (users) => {
  const [stories, setStories] = useState([]);
  const [viewedSet, setViewedSet] = useState(getGlobalViewedItemIds);
  const userIds = useMemo(
    () => (users || []).map((user) => getId(user)).filter(Boolean).join(","),
    [users],
  );

  useEffect(() => {
    const handleGlobalSync = () => {
      setViewedSet(getGlobalViewedItemIds());
    };
    window.addEventListener("nova:story-viewed", handleGlobalSync);
    return () => window.removeEventListener("nova:story-viewed", handleGlobalSync);
  }, []);

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
    return () => {
      cancelled = true;
    };
  }, [userIds]);

  const storiesByUserId = useMemo(
    () => new Map(stories.map((story) => [getId(story.user?._id), story])),
    [stories],
  );

  const isAllViewed = useCallback(
    (story) => checkIsStoryAllViewed(story, viewedSet),
    [viewedSet],
  );

  const markViewed = useCallback((itemId) => {
    setViewedSet((previous) => new Set(previous).add(itemId));
    markStoryItemAsViewed(itemId);
  }, []);

  return { stories, storiesByUserId, isAllViewed, markViewed };
};
