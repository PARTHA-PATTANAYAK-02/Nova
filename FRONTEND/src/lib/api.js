const defaultApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || defaultApiUrl
).replace(/\/$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
