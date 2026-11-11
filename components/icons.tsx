import type { SVGProps } from "react";

// Линейные иконки в стиле чертежа: 24×24, обводка 1.5
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

type P = SVGProps<SVGSVGElement>;

export const TelegramIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 4.5 3.2 11.3c-.6.2-.6 1 0 1.2l4.3 1.4 1.7 5.1c.2.5.8.6 1.2.3l2.5-2.1 4.4 3.2c.5.3 1.1.1 1.3-.5L21.9 5.4c.2-.6-.4-1.1-.9-.9Z" />
    <path d="m7.5 13.9 9-6.4-6.6 7.6" />
  </svg>
);

export const PhoneIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 3.5h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 5.4 5.4l1.3-2 4 1.6V17a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5Z" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const ArrowIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
);

export const DocIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 2.5h8l4 4v15H6z" />
    <path d="M14 2.5v4h4M9 12h6M9 15.5h6M9 19h3.5" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </svg>
);
