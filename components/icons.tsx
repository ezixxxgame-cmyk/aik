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

// Транспорт и ключ: замкнутые контуры можно залить (fill на <svg>), детали всегда без заливки
export const ShipIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M1.8 14.5h20.4l-2.3 4.2a1.6 1.6 0 0 1-1.4.8H5.5a1.6 1.6 0 0 1-1.4-.8Z" />
    <path d="M3.8 14.5V8.6h4.4v5.9Z" />
    <path d="M9.6 14.5V8.4h7v3h3.4v3.1Z" />
    <path d="M5 10.6h2M6 8.6V6.4M9.6 11.4h7M13.1 8.4v6.1M16.6 11.4v3.1M4.8 17h14.6" fill="none" />
    <path d="M3.5 22.2c1.1 0 1.1-.8 2.2-.8s1.1.8 2.2.8 1.1-.8 2.2-.8 1.1.8 2.2.8" fill="none" strokeOpacity={0.55} />
  </svg>
);

export const CarIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2.5 16.5v-2.6c0-.7.5-1.3 1.2-1.5l2.8-.9 2.5-2.9a2 2 0 0 1 1.5-.7h5c.6 0 1.1.2 1.5.6l2.9 3 1 .2c.9.2 1.6 1 1.6 1.9v2.9Z" />
    <path d="M9.7 11.4l1.6-1.9h2.6v1.9ZM15.4 9.5h1l1.8 1.9h-2.8Z" fill="none" />
    <path d="M20.6 13.4h1.2" fill="none" />
    <circle cx="7" cy="16.6" r="2.1" />
    <circle cx="18" cy="16.6" r="2.1" />
  </svg>
);

// Автовоз: тягач справа, машина на платформе
export const TruckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M17.8 18v-6.6h2.8l2.1 3V18Z" />
    <path d="M19 12.6h1.1l1.2 1.7H19ZM1.5 17.2h16.3" fill="none" />
    <path d="M2.8 15.4v-1.8c0-.5.3-.9.8-1l1.8-.6 1.7-1.9c.3-.3.6-.5 1-.5h3.6c.4 0 .7.2 1 .4l1.9 2h.8c.6 0 1.1.5 1.1 1.1v2.3Z" />
    <path d="M8.2 12.6l1-1.1h1.7v1.1ZM12.2 11.5h.7l1 1.1h-1.7Z" fill="none" />
    <circle cx="4.6" cy="19" r="1.5" />
    <circle cx="8.6" cy="19" r="1.5" />
    <circle cx="20.2" cy="19" r="1.5" />
  </svg>
);

// Ключ из логотипа: головка-брелок с прорезью и полосой, бородка с двумя вырезами справа
export const KeyIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10.4 11v10.2l1.6 1.6 1.6-1.6v-2l-1-.9 1-.9v-1.6l-1-.9 1-.9V11Z" />
    <path d="M8.6 1.5h6.8a2.4 2.4 0 0 1 2.4 2.4v3.8c0 .8-.4 1.6-1 2.1l-1.9 1.9H9.1L7.2 9.8c-.6-.5-1-1.3-1-2.1V3.9a2.4 2.4 0 0 1 2.4-2.4Z" />
    <path d="M10 3.9h4a.8.8 0 0 1 0 1.6h-4a.8.8 0 0 1 0-1.6ZM10 8h4" fill="none" />
  </svg>
);

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
