import { useEffect, useRef, useState } from "react";

/**
 * Instagram-style OTP input.
 *  - 6 individual boxes
 *  - Auto-focus next on type
 *  - Backspace → previous box
 *  - Paste support
 *  - Shake on error
 *  - Success pulse
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
}) => {
  const [digits, setDigits] = useState(() =>
    Array.from({ length }, (_, i) => value[i] || ""),
  );
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  /* Sync external value */
  useEffect(() => {
    const next = Array.from({ length }, (_, i) => value[i] || "");
    setDigits(next);
  }, [value, length]);

  /* Auto focus first box on mount */
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 400);
    }
  }, [autoFocus]);

  const commit = (next) => {
    onChange?.(next.join(""));
    if (next.every((d) => d !== "")) {
      onComplete?.(next.join(""));
    }
  };

  const handleChange = (index, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;

    const next = [...digits];

    // Paste multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, length - index).split("");
      chars.forEach((c, i) => {
        next[index + i] = c;
      });
      setDigits(next);
      commit(next);

      const lastFilled = Math.min(index + chars.length, length - 1);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    // Single digit
    next[index] = clean;
    setDigits(next);
    commit(next);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }
      setDigits(next);
      onChange?.(next.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const next = Array.from({ length }, (_, i) => pasted[i] || "");
    setDigits(next);
    commit(next);

    const lastIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[lastIdx]?.focus();
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-2.5 ${
        error ? "animate-otp-shake" : ""
      }`}
      onPaste={handlePaste}
    >
      {digits.map((digit, i) => {
        const isFocused = focusedIndex === i;
        const isFilled = digit !== "";

        return (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(-1)}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1}`}
            className={`
              otp-digit
              w-11 h-14 sm:w-12 sm:h-16
              text-center text-xl sm:text-2xl font-bold
              rounded-xl
              border-2
              outline-none
              transition-all duration-200
              caret-transparent
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${
                success
                  ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)] animate-otp-success"
                  : error
                    ? "border-[var(--danger)] text-[var(--danger)]"
                    : isFilled
                      ? "border-[var(--primary)]/60 bg-[var(--surface-2)] text-[var(--foreground)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              }
              ${
                isFocused && !error && !success
                  ? "border-[var(--primary)] ring-4 ring-[var(--primary)]/15 scale-[1.05]"
                  : ""
              }
            `}
            style={{
              animationDelay: `${i * 70}ms`,
            }}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;
