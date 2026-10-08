import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

const PRIMARY_EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "🔥"];
const EXTENDED_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🔥",
  "👍",
  "👏",
  "🎉",
  "😍",
  "🤔",
  "😎",
  "💯",
  "🥰",
  "😭",
  "🤯",
  "✨",
  "💔",
];

const EmojiPicker = ({
  anchorEl,
  onPick,
  onClose,
  disabled,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pickerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });

  const list = expanded ? EXTENDED_EMOJIS : PRIMARY_EMOJIS;

  /* ---------- Compute position ---------- */
  const computeCoords = () => {
    if (!anchorEl || !pickerRef.current) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const pickerRect = pickerRef.current.getBoundingClientRect();
    const pickerWidth = pickerRect.width;
    const pickerHeight = pickerRect.height;

    const margin = 8;
    const gap = 10;

    const spaceAbove = anchorRect.top;
    const placeAbove = spaceAbove > pickerHeight + gap + margin;

    const top = placeAbove
      ? anchorRect.top - pickerHeight - gap
      : anchorRect.bottom + gap;

    let left = anchorRect.left + anchorRect.width / 2 - pickerWidth / 2;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - pickerWidth - margin),
    );

    setCoords({ top, left, ready: true });
  };

  useLayoutEffect(() => {
    computeCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, expanded]);

  useEffect(() => {
    if (!anchorEl) return undefined;
    const reposition = () => computeCoords();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, expanded]);

  /* ---------- Outside click + Escape ---------- */
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const picker = (
    <div
      ref={pickerRef}
      role="menu"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        zIndex: 9999,
        visibility: coords.ready ? "visible" : "hidden",
      }}
      className="
        animate-emoji-picker-in
        origin-bottom
        rounded-3xl
        border border-[var(--border)]
        bg-[var(--surface)]/98
        backdrop-blur-xl
        shadow-[0_16px_50px_rgba(0,0,0,0.35)]
        transition-[width,height] duration-250 ease-out
      "
    >
      {expanded ? (
        /* ---------- EXPANDED: 6×3 grid ---------- */
        <div className="p-2">
          <div className="grid grid-cols-6 gap-0.5">
            {list.map((emoji, i) => (
              <button
                key={emoji}
                type="button"
                disabled={disabled}
                onClick={() => onPick(emoji)}
                aria-label={`React ${emoji}`}
                className="
                  emoji-btn
                  relative
                  w-10 h-10 sm:w-9 sm:h-9
                  rounded-full
                  flex items-center justify-center
                  text-2xl sm:text-xl
                  leading-none
                  transition-transform duration-150
                  hover:bg-[var(--surface-2)]
                  hover:scale-[1.35]
                  active:scale-90
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                style={{ animationDelay: `${i * 18}ms` }}
              >
                <span className="emoji-glyph">{emoji}</span>
              </button>
            ))}
          </div>

          {/* Collapse — desktop only */}
          <div className="hidden sm:flex mt-1.5 items-center justify-center">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Fewer emojis"
              className="
                inline-flex items-center gap-1.5
                px-3 py-1 rounded-full
                text-[11px] font-medium
                text-[var(--muted-foreground)]
                hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                transition-colors
              "
            >
              <Plus className="h-3 w-3 rotate-[135deg]" strokeWidth={2.4} />
              Less
            </button>
          </div>
        </div>
      ) : (
        /* ---------- COLLAPSED: single row ---------- */
        <div className="flex items-center gap-0.5 px-1.5 py-1">
          {list.map((emoji, i) => (
            <button
              key={emoji}
              type="button"
              disabled={disabled}
              onClick={() => onPick(emoji)}
              aria-label={`React ${emoji}`}
              className="
                emoji-btn
                relative
                w-9 h-9
                rounded-full
                flex items-center justify-center
                text-xl leading-none
                transition-transform duration-150
                hover:bg-[var(--surface-2)]
                hover:scale-[1.4]
                hover:-translate-y-1
                active:scale-90
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="emoji-glyph">{emoji}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="More emojis"
            className="
              w-8 h-8 rounded-full ml-0.5
              flex items-center justify-center
              text-[var(--muted-foreground)]
              hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
              transition-transform duration-300
              active:scale-90
            "
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(picker, document.body);
};

export default EmojiPicker;
