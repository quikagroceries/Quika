import { ReactNode } from "react";

/**
 * Organic "blob" container: a rounded, irregular shape (not a circle/rounded-rect)
 * that an illustration sits inside of, with breathing room from the padding.
 */
export function Blob({
  className = "",
  fill = "#E5DECD",
  children,
}: {
  className?: string;
  fill?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          fill={fill}
          d="M52.4,-62.1C66.5,-52.4,75.8,-34.9,78.4,-16.8C81,1.3,77,20,66.9,35.1C56.8,50.2,40.6,61.7,22.7,67.6C4.8,73.5,-14.8,73.8,-32.1,67.1C-49.4,60.4,-64.4,46.7,-71.4,29.6C-78.4,12.5,-77.4,-8,-69.5,-24.6C-61.6,-41.2,-46.8,-53.9,-31,-62.6C-15.2,-71.3,1.6,-76,17.9,-73.6C34.2,-71.2,38.3,-71.8,52.4,-62.1Z"
          transform="translate(100 100)"
        />
      </svg>
      <div className="relative z-10 flex h-full w-full items-center justify-center p-[14%]">
        {children}
      </div>
    </div>
  );
}
