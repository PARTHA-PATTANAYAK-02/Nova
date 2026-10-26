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
      if (!triggerOnParent || !spanRef.current) return;

      const interactiveSelector =
        'button, a, [role="button"], label, .group, .is-clickable, .nova-tab, .nova-profile__handle, .nova-profile__link, .nova-profile__handle-row, .nova-settings-item, .nvs2-nav-item, .nova-profile__hero-btn, .cursor-pointer, li';

      const target = parentSelector
        ? spanRef.current.closest(parentSelector)
        : spanRef.current.closest(interactiveSelector) || spanRef.current.parentElement;

      if (!target) return;

      const handleEnter = () => {
        iconRef.current?.startAnimation?.();
      };

      const handleLeave = () => {
        iconRef.current?.stopAnimation?.();
      };

      target.addEventListener("mouseenter", handleEnter);
      target.addEventListener("mouseleave", handleLeave);
      return () => {
        target.removeEventListener("mouseenter", handleEnter);
        target.removeEventListener("mouseleave", handleLeave);
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
