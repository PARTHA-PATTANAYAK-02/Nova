import React from "react";
import { Link } from "react-router-dom";

/**
 * RichText Component
 * Parses and renders clickable hashtags (#travel), mentions (@username), and web links (https://...)
 */
const RichText = ({ text, className = "" }) => {
  if (!text) return null;

  // Regex pattern matching:
  // 1. URLs (https?://...)
  // 2. Mentions (@username)
  // 3. Hashtags (#tag, supports unicode letters for Bengali, English, etc.)
  const TOKEN_REGEX = /(https?:\/\/[^\s]+)|(@[a-zA-Z0-9_.-]+)|(#[\w\u0590-\u05ff\u0600-\u06ff\u0980-\u09ff]+)/gu;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchedString = match[0];

    // Push any preceding plain text
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    if (match[1]) {
      // URL Link
      parts.push(
        <a
          key={`url-${matchIndex}`}
          href={matchedString}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 break-all transition-colors"
        >
          {matchedString}
        </a>
      );
    } else if (match[2]) {
      // Mention (@username)
      const username = matchedString.slice(1);
      parts.push(
        <Link
          key={`mention-${matchIndex}`}
          to={`/profile/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors inline-block"
        >
          {matchedString}
        </Link>
      );
    } else if (match[3]) {
      // Hashtag (#tag)
      const tag = matchedString.slice(1);
      parts.push(
        <Link
          key={`tag-${matchIndex}`}
          to={`/explore/tags/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors inline-block"
        >
          {matchedString}
        </Link>
      );
    }

    lastIndex = TOKEN_REGEX.lastIndex;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={`whitespace-pre-line ${className}`}>{parts}</span>;
};

export default RichText;
