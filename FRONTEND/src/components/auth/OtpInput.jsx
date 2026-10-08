import { useEffect, useRef, useState } from "react";

/**
 * OtpInput — "Emerald Pulse" premium (v2)
 *
 *  Fixes:
 *   • loading state now ONLY reacts to `loading` prop (not auto)
 *   • on error → clears all digits + refocuses first box
 *   • success/error ring animations
 */
const OtpInput = ({
  length = 6,
  value = "",
  onChange,
  onComplete,
  error = false,
  success = false,
  disabled = false,
  autoFocus = true,
  loading = false,
}) => {
  const [digits, setDigits] = useState(() =>
    Array.from({ length }, (_, i) => value[i] || ""),
  );
  const [focused, setFocused] = useState(-1);
  const [ringKey, setRingKey] = useState(0);
  const refs = useRef([]);

  /* sync external value */
  useEffect(() => {
    setDigits(Array.from({ length }, (_, i) => value[i] || ""));
  }, [value, length]);

  /* auto focus first empty box on mount */
  useEffect(() => {
    if (!autoFocus || !refs.current[0]) return;
    const t = setTimeout(() => refs.current[0]?.focus(), 350);
    return () => clearTimeout(t);
  }, [autoFocus]);

  /* ⬇ FIX: on error → wipe digits + refocus first */
  useEffect(() => {
    if (!error) return;
    setDigits(Array.from({ length }, () => ""));
    onChange?.("");
    const t = setTimeout(() => refs.current[0]?.focus(), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, length]);

  const commit = (next) => {
    const joined = next.join("");
    onChange?.(joined);
    if (next.every((d) => d !== "")) onComplete?.(joined);
  };

  const handleChange = (index, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;
    const next = [...digits];

    if (clean.length > 1) {
      const chars = clean.slice(0, length - index).split("");
      chars.forEach((c, i) => (next[index + i] = c));
      setDigits(next);
      setRingKey((k) => k + 1);
      commit(next);
      refs.current[Math.min(index + chars.length, length - 1)]?.focus();
      return;
    }

    next[index] = clean;
    setDigits(next);
    setRingKey((k) => k + 1);
    commit(next);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) next[index] = "";
      else if (index > 0) {
        next[index - 1] = "";
        refs.current[index - 1]?.focus();
      }
      setDigits(next);
      onChange?.(next.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const next = Array.from({ length }, (_, i) => pasted[i] || "");
    setDigits(next);
    setRingKey((k) => k + 1);
    commit(next);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  const anyFilled = digits.some((d) => d !== "");

  return (
    <div
      className={`nv-otp ${anyFilled ? "is-typing" : ""} ${
        error ? "is-shake is-error" : ""
      } ${success ? "is-success" : ""} ${loading ? "is-loading" : ""}`}
      onPaste={handlePaste}
    >
      {digits.map((digit, i) => {
        const isFilled = digit !== "";
        const isFocused = focused === i;

        return (
          <div
            key={i}
            className={`nv-otp-box ${isFilled ? "is-filled" : ""} ${
              isFocused ? "is-focused" : ""
            } ${disabled ? "is-disabled" : ""}`}
          >
            <input
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              disabled={disabled}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(-1)}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={error || undefined}
              className="nv-otp-input"
              tabIndex={disabled ? -1 : 0}
            />

            {isFilled && (
              <span
                key={`ring-${i}-${ringKey}`}
                className="nv-otp-ring"
                aria-hidden
              />
            )}

            {isFilled && (
              <span
                key={`digit-${i}-${digit}`}
                className="nv-otp-digit"
                aria-hidden
              >
                {digit}
              </span>
            )}

            {isFocused && !isFilled && !disabled && (
              <span className="nv-otp-caret" aria-hidden />
            )}
          </div>
        );
      })}

      <span className="nv-otp-sweep" aria-hidden />

      <span className="nv-otp-loader" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
};

export default OtpInput;
