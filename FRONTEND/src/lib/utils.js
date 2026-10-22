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

