'use client';

import { useState } from "react";

const STAR_POINTS = "12,2.5 14.9,9.1 22.2,9.8 16.7,14.6 18.3,21.7 12,17.9 5.7,21.7 7.3,14.6 1.8,9.8 9.1,9.1";

function Star({ filled, size, interactive, onClick, onMouseEnter }: any) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className={interactive ? "cursor-pointer" : ""}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-hidden="true"
    >
      <polygon points={STAR_POINTS} />
    </svg>
  );
}

// 1-5 star picker (#7). readOnly renders a fixed display (e.g. showing an
// already-submitted rating); otherwise it's an interactive picker with
// hover preview.
function StarRating({ value = 0, onChange, readOnly = false, size = 28 }: any) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      className="flex gap-1 text-amber-400"
      onMouseLeave={() => setHover(0)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label={readOnly ? undefined : "Rate the agent, 1 to 5 stars"}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          filled={n <= display}
          size={size}
          interactive={!readOnly}
          onClick={readOnly ? undefined : () => onChange(n)}
          onMouseEnter={readOnly ? undefined : () => setHover(n)}
        />
      ))}
    </div>
  );
}

export default StarRating;
