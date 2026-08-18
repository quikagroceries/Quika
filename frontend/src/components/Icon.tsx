'use client';

// Small inline SVG icon set (stroke, currentColor, 24x24 viewBox) - so icon
// weight/color always matches the surrounding text instead of riding on
// whatever emoji font the OS happens to render. Built from basic shapes
// (rect/circle/line/polyline) rather than hand-traced paths, to keep every
// icon simple and reliably correct.
const ICONS = {
  basket: (
    <>
      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      <path d="M4 9h16l-1.4 9.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z" />
      <line x1="9" y1="12.5" x2="9" y2="16" />
      <line x1="12" y1="12.5" x2="12" y2="16" />
      <line x1="15" y1="12.5" x2="15" y2="16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="12" x2="12" y2="7.3" />
      <line x1="12" y1="12" x2="15.3" y2="14" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  phone: (
    <path d="M7 4h2.2l1.1 3.3-1.8 1.4a10.5 10.5 0 0 0 4.8 4.8l1.4-1.8L18 13v2.2a1.6 1.6 0 0 1-1.7 1.6A13.5 13.5 0 0 1 5.4 5.7 1.6 1.6 0 0 1 7 4Z" />
  ),
  logout: (
    <>
      <rect x="4" y="4.5" width="8" height="15" rx="1.2" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <polyline points="16.5,8.5 20,12 16.5,15.5" />
    </>
  ),
  camera: (
    <>
      <rect x="9" y="5" width="6" height="2.5" rx="0.5" />
      <rect x="4" y="7.5" width="16" height="10.5" rx="1.5" />
      <circle cx="12" cy="12.5" r="3" />
    </>
  ),
  send: (
    <>
      <path d="M4.5 12 19 5l-3.2 14L11 14.5 4.5 12Z" />
      <line x1="11" y1="14.5" x2="19" y2="5" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5 5.2 4.5h13.6l1.2 5" />
      <rect x="5" y="9.5" width="14" height="9.5" rx="1" />
      <rect x="10" y="14" width="4" height="5" />
    </>
  ),
  check: <polyline points="5,12.5 9.5,17 19,7" />,
  chat: (
    <>
      <rect x="3.5" y="5" width="17" height="11" rx="3" />
      <path d="M8 16 7 20 12 16" />
    </>
  ),
  chevronDown: <polyline points="6,9 12,15 18,9" />,
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="7" width="12" height="10" rx="2" />
      <path d="M15.5 11 20 8v8l-4.5-3Z" />
    </>
  ),
  settings: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.5 19.5 7.5 14.3 16.5 14.3 18.5 19.5" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  chart: (
    <>
      <rect x="4" y="12" width="4" height="8" />
      <rect x="10" y="7" width="4" height="13" />
      <rect x="16" y="3" width="4" height="17" />
    </>
  ),
  trending: (
    <>
      <polyline points="4,17 10,10 14,14 20,6" />
      <polyline points="14,6 20,6 20,12" />
    </>
  ),
  flag: (
    <>
      <line x1="6" y1="4" x2="6" y2="20" />
      <path d="M6 4h11l-2.5 4L17 12H6" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8L12 3.5z" />
  ),
  alert: (
    <>
      <path d="M12 4 21 19H3Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  trash: (
    <>
      <line x1="5" y1="7" x2="19" y2="7" />
      <path d="M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M7.5 7 8.2 18.5a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 7" />
      <line x1="10.3" y1="10.5" x2="10.6" y2="16.5" />
      <line x1="13.7" y1="10.5" x2="13.4" y2="16.5" />
    </>
  ),
  // Category glyphs — produce/protein/provisions/spices — same
  // basic-shapes convention as the rest of the set.
  leaf: (
    <>
      <path d="M6 19C6 10 12 4 20 4c0 9-6 15-14 15Z" />
      <path d="M6 19c3-4 6-8 12-13" />
    </>
  ),
  drumstick: (
    <>
      <circle cx="14.5" cy="9.5" r="5" />
      <path d="M11 13 6.3 17.7a2.1 2.1 0 0 0 3 3L14 16" />
    </>
  ),
  jar: (
    <>
      <path d="M9 3h6v3.2l2 2.3V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8.5l2-2.3Z" />
      <line x1="7.4" y1="12" x2="16.6" y2="12" />
    </>
  ),
  chili: (
    <>
      <path d="M9.5 5c0-1.1.9-2 2-2" />
      <path d="M9.5 5c3.5 0 4.5 2.3 6 2.8 2.3.8 4 3 4 5.7 0 4.1-3.8 8.5-7.3 8.5-3.2 0-5.7-2.9-5.7-6.4 0-3.8 1.6-6.2 3-10.6Z" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: any) {
  const shape = ICONS[name];
  if (!shape) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}

export default Icon;
