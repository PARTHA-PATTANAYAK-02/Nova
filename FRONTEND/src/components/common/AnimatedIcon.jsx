import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

/**
 * AnimatedIcon wraps an @animateicons/react component.
 * It automatically triggers the micro-animation whenever the user hovers over
 * either the icon itself OR its closest interactive parent element (button, link, .group, handle, etc.).
 */
export const AnimatedIcon = forwardRef(
  (
    {
      icon: Icon,
      size = 18,
      className = "",
      triggerOnParent = true,
      parentSelector,
      ...props
    },
    forwardedRef
  ) => {
    const iconRef = useRef(null);
    const spanRef = useRef(null);

    useImperativeHandle(forwardedRef, () => ({
      startAnimation: () => iconRef.current?.startAnimation?.(),
      stopAnimation: () => iconRef.current?.stopAnimation?.(),
    }));

    useEffect(() => {
      const spanEl = spanRef.current;
      if (!spanEl) return;

      const handleEnter = () => {
        iconRef.current?.startAnimation?.();
      };

      const handleLeave = () => {
        iconRef.current?.stopAnimation?.();
      };

      // Always allow hovering directly on the icon
      spanEl.addEventListener("mouseenter", handleEnter);
      spanEl.addEventListener("mouseleave", handleLeave);

      if (!triggerOnParent) {
        return () => {
          spanEl.removeEventListener("mouseenter", handleEnter);
          spanEl.removeEventListener("mouseleave", handleLeave);
        };
      }

      const interactiveSelector =
        'button, a, [role="button"], label, .group, .is-clickable, .nova-tab, .nova-profile__handle, .nova-profile__link, .nova-profile__handle-row, .nova-settings-item, .nvs2-nav-item, .nova-profile__hero-btn, .cursor-pointer, .nv-field, .nv-stage-feat, .nv-back-link, .nv-otp-badge, .nv-card-float-foot, .nv-form-btn, li';

      const target = parentSelector
        ? spanEl.closest(parentSelector)
        : spanEl.closest(interactiveSelector) || spanEl.parentElement;

      if (!target) {
        return () => {
          spanEl.removeEventListener("mouseenter", handleEnter);
          spanEl.removeEventListener("mouseleave", handleLeave);
        };
      }

      target.addEventListener("mouseenter", handleEnter);
      target.addEventListener("mouseleave", handleLeave);
      target.addEventListener("focusin", handleEnter);
      target.addEventListener("focusout", handleLeave);

      return () => {
        spanEl.removeEventListener("mouseenter", handleEnter);
        spanEl.removeEventListener("mouseleave", handleLeave);
        target.removeEventListener("mouseenter", handleEnter);
        target.removeEventListener("mouseleave", handleLeave);
        target.removeEventListener("focusin", handleEnter);
        target.removeEventListener("focusout", handleLeave);
      };
    }, [triggerOnParent, parentSelector]);

    if (!Icon) return null;

    return (
      <span
        ref={spanRef}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <Icon ref={iconRef} size={size} {...props} />
      </span>
    );
  }
);

AnimatedIcon.displayName = "AnimatedIcon";
export default AnimatedIcon;
