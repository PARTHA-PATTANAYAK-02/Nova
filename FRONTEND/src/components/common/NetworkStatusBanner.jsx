import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { getSocketInstance } from "@/redux/socketSlice";
import { apiUrl } from "@/lib/api";
import toast from "react-hot-toast";

const NetworkStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [showRestored, setShowRestored] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const hideTimerRef = useRef(null);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const { connected: socketConnected } = useSelector((store) => store.socketio);

  // Verifies real reachability to backend server
  const checkRealConnection = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(apiUrl(`/api/v1/health?t=${Date.now()}`), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const markOnline = useCallback(() => {
    if (!isOnlineRef.current) {
      setIsOnline(true);
      setShowRestored(true);

      const socket = getSocketInstance();
      if (socket && !socket.connected) {
        socket.connect();
      }

      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
    }
  }, []);

  const markOffline = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setIsOnline(false);
    setShowRestored(false);
  }, []);

  // 1. Real-time Reactivity: If Socket.IO successfully connects, we are 100% online
  useEffect(() => {
    if (socketConnected && !isOnlineRef.current) {
      markOnline();
    }
  }, [socketConnected, markOnline]);

  // 2. Real-time Browser Events + Staggered Auto-retry on "online" toggle
  useEffect(() => {
    let retryTimers = [];

    const attemptReconnection = async () => {
      const reachable = await checkRealConnection();
      if (reachable) {
        markOnline();
        retryTimers.forEach(clearTimeout);
        retryTimers = [];
      }
    };

    const handleOnline = () => {
      // Cell data often takes 1-3 seconds to negotiate IP/DNS after toggling on.
      // We automatically test at 0ms, 1200ms, 2500ms, and 4500ms until connected.
      attemptReconnection();
      retryTimers.forEach(clearTimeout);
      retryTimers = [
        setTimeout(attemptReconnection, 1200),
        setTimeout(attemptReconnection, 2500),
        setTimeout(attemptReconnection, 4500),
      ];
    };

    const handleOffline = () => {
      retryTimers.forEach(clearTimeout);
      retryTimers = [];
      markOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      markOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      retryTimers.forEach(clearTimeout);
      clearTimeout(hideTimerRef.current);
    };
  }, [checkRealConnection, markOnline, markOffline]);

  // 3. Real-time Auto-Recovery Heartbeat: While offline, poll every 2.5s to restore automatically
  useEffect(() => {
    if (isOnline) return undefined;

    const intervalId = setInterval(async () => {
      // Only ping if the browser hardware reports network is on
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const reachable = await checkRealConnection();
        if (reachable) {
          markOnline();
        }
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [isOnline, checkRealConnection, markOnline]);

  // Manual Retry Handler (still available for immediate user action)
  const handleManualCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setShowRestored(false);
      setIsChecking(false);
      toast.error("Still offline. Please check your data connection.", {
        id: "offline-check-toast",
      });
      return;
    }

    const reachable = await checkRealConnection();
    if (reachable) {
      markOnline();
      toast.success("Connection restored!", { id: "offline-check-toast" });
    } else {
      setIsOnline(false);
      setShowRestored(false);
      toast.error("Unable to reach server. Please check your network.", {
        id: "offline-check-toast",
      });
    }
    setIsChecking(false);
  };

  // If online and not in restored notification mode, don't render anything
  if (isOnline && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-300 ease-out px-4 w-full max-w-md animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all ${
          !isOnline
            ? "bg-amber-950/85 text-amber-100 border-amber-600/40 shadow-amber-950/40"
            : "bg-emerald-950/85 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {!isOnline ? (
            <div className="relative flex items-center justify-center size-7 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <WifiOff className="size-4 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-amber-950" />
            </div>
          ) : (
            <div className="flex items-center justify-center size-7 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Wifi className="size-4" />
            </div>
          )}

          <div className="flex flex-col min-w-0 text-left">
            <span className="text-xs font-semibold leading-tight tracking-wide truncate">
              {!isOnline
                ? "No internet connection"
                : "Back online!"}
            </span>
            <span className="text-[11px] opacity-80 leading-tight truncate">
              {!isOnline
                ? "Offline mode. Reconnect to send and receive updates."
                : "Connection restored. Live updates active."}
            </span>
          </div>
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-500/30 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`size-3 ${isChecking ? "animate-spin" : ""}`}
            />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusBanner;
