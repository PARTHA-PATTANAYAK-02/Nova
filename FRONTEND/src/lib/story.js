import store from "@/redux/store";
import { markStoryItemViewed as markViewedAction } from "@/redux/authSlice";
import axios from "axios";
import { apiUrl } from "@/lib/api";

const VIEWED_STORAGE_KEY = "nova_viewed_story_ids";

/**
 * Get all globally viewed story item IDs from Redux + localStorage
 */
export const getGlobalViewedItemIds = () => {
  const set = new Set();
  try {
    const fromRedux = store.getState()?.auth?.viewedStoryItemIds || [];
    fromRedux.forEach((id) => set.add(String(id)));
  } catch {
    /* ignore */
  }

  try {
    if (typeof window !== "undefined") {
      const fromStorage = JSON.parse(
        localStorage.getItem(VIEWED_STORAGE_KEY) || "[]",
      );
      fromStorage.forEach((id) => set.add(String(id)));
    }
  } catch {
    /* ignore */
  }

  return set;
};

/**
 * Mark a single story item as viewed everywhere (Redux, localStorage, window event, backend)
 */
export const markStoryItemAsViewed = (itemId) => {
  if (!itemId) return;
  const idStr = String(itemId);

  // 1. Dispatch to Redux store
  try {
    store.dispatch(markViewedAction(idStr));
  } catch {
    /* ignore */
  }

  // 2. Persist to localStorage
  try {
    if (typeof window !== "undefined") {
      const existing = JSON.parse(
        localStorage.getItem(VIEWED_STORAGE_KEY) || "[]",
      );
      if (!existing.includes(idStr)) {
        existing.push(idStr);
        localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(existing));
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Dispatch a window event so any non-redux component immediately re-renders
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nova:story-viewed", { detail: { itemId: idStr } }),
    );
  }

  // 4. Send view to backend API
  axios
    .post(apiUrl(`/api/v1/story/${idStr}/view`), {}, { withCredentials: true })
    .catch(() => {});
};

/**
 * Check if a specific story item is viewed
 */
export const checkIsItemViewed = (item, viewedSet) => {
  if (!item) return false;
  if (item.viewedByMe) return true;
  const idStr = String(item._id || item);
  const set = viewedSet || getGlobalViewedItemIds();
  return set.has(idStr);
};

/**
 * Check if ALL items in a story have been viewed
 */
export const checkIsStoryAllViewed = (story, viewedSet) => {
  if (!story || !Array.isArray(story.items) || story.items.length === 0) {
    return false;
  }
  const set = viewedSet || getGlobalViewedItemIds();
  return story.items.every((item) => checkIsItemViewed(item, set));
};
