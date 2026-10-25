import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const readFileAsDataURL = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
};

export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're currently offline. Please check your internet connection.";
  }
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "Unable to connect. Please check your internet connection.";
  }
  return error?.response?.data?.message || error?.message || fallback;
};

export const getDisplayName = (person, fallback = "Nova user") =>
  person?.fullName?.trim() || fallback;

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 45) return "last seen just now";
  if (diffMins === 1) return "last seen 1 min ago";
  if (diffMins < 60) return `last seen ${diffMins} min ago`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return `last seen today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `last seen yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `last seen ${dateStr} at ${timeStr}`;
};

export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffSecs = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const isSameUser = (a, b) => {
  if (!a || !b) return false;
  const idA = (a?._id || a)?.toString();
  const idB = (b?._id || b)?.toString();
  return Boolean(idA && idB && idA === idB);
};


