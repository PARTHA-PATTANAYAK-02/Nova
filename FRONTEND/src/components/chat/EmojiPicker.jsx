import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Sparkles } from "lucide-react";

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

  const computeCoords = () => {
    if (!anchorEl || !pickerRef.current) return;

    const a = anchorEl.getBoundingClientRect();
    const p = pickerRef.current.getBoundingClientRect();

    const margin = 8;
    const gap = 10;

    const placeAbove = a.top > p.height + gap + margin;
    const top = placeAbove ? a.top - p.height - gap : a.bottom + gap;

    let left = a.left + a.width / 2 - p.width / 2;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - p.width - margin),
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

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => e.key === "Escape" && onClose();
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
      className="nova-emoji-picker animate-emoji-picker-in"
    >
      {expanded ? (
        <div className="nova-emoji-picker__expanded">
          <div className="nova-emoji-picker__grid">
            {list.map((emoji, i) => (
              <button
                key={emoji}
                type="button"
                disabled={disabled}
                onClick={() => onPick(emoji)}
                aria-label={`React ${emoji}`}
                className="nova-emoji-picker__btn"
                style={{ animationDelay: `${i * 18}ms` }}
              >
                <span className="emoji-glyph">{emoji}</span>
              </button>
            ))}
          </div>

          <div className="nova-emoji-picker__foot">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Fewer emojis"
              className="nova-emoji-picker__less"
            >
              <Plus className="size-3 rotate-[135deg]" strokeWidth={2.4} />
              Less
            </button>
          </div>
        </div>
      ) : (
        <div className="nova-emoji-picker__collapsed">
          {list.map((emoji, i) => (
            <button
              key={emoji}
              type="button"
              disabled={disabled}
              onClick={() => onPick(emoji)}
              aria-label={`React ${emoji}`}
              className="nova-emoji-picker__btn nova-emoji-picker__btn--sm"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="emoji-glyph">{emoji}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="More emojis"
            className="nova-emoji-picker__more"
          >
            <Sparkles className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(picker, document.body);
};

export default EmojiPicker;
