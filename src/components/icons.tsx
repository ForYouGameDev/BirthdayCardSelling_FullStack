import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const Cake = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 20h16" /><path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
    <path d="M5 16c1.5 1.2 2.5 1.2 4 0s2.5-1.2 3 0 2.5 1.2 4 0 2.5-1.2 3 0" />
    <path d="M12 12V8" /><path d="M12 5c.8.9 1.2 1.6 0 2.5C10.8 6.6 11.2 5.9 12 5z" />
  </Icon>
);
export const Gift = ({ className }: IconProps) => (
  <Icon className={className}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8" /><path d="M12 8v12" /><path d="M12 8c-2-3-6-3-5 0 .5 1.5 3 1 5 0z" /><path d="M12 8c2-3 6-3 5 0-.5 1.5-3 1-5 0z" /></Icon>
);
export const Heart = ({ className }: IconProps) => (
  <Icon className={className}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Icon>
);
export const Sparkles = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6L10 4z" /><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" />
  </Icon>
);
export const Flower = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 9.8c-1.6-1.2-1.8-3.8 0-5.3 1.8 1.5 1.6 4.1 0 5.3z" /><path d="M12 14.2c1.6 1.2 1.8 3.8 0 5.3-1.8-1.5-1.6-4.1 0-5.3z" />
    <path d="M9.8 12c-1.2-1.6-3.8-1.8-5.3 0 1.5 1.8 4.1 1.6 5.3 0z" /><path d="M14.2 12c1.2 1.6 3.8 1.8 5.3 0-1.5-1.8-4.1-1.6-5.3 0z" />
  </Icon>
);
export const Mail = ({ className }: IconProps) => (
  <Icon className={className}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></Icon>
);
export const Search = ({ className }: IconProps) => (
  <Icon className={className}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></Icon>
);
export const ShoppingBag = ({ className }: IconProps) => (
  <Icon className={className}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></Icon>
);
/** Dark-mode toggle: half moon, half sun. */
export const MoonSun = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    <circle cx="17" cy="7" r="1.6" /><path d="M17 3.5v.6M17 9.9v.6M13.5 7h.6M19.9 7h.6" />
  </Icon>
);
export const ArrowRight = ({ className }: IconProps) => (
  <Icon className={className}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Icon>
);
export const ArrowUpRight = ({ className }: IconProps) => (
  <Icon className={className}><path d="M7 17L17 7" /><path d="M8 7h9v9" /></Icon>
);
export const User = ({ className }: IconProps) => (
  <Icon className={className}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" /></Icon>
);
export const Package = ({ className }: IconProps) => (
  <Icon className={className}><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" /><path d="M4 7.2l8 4.3 8-4.3" /><path d="M12 11.5V21" /></Icon>
);
export const Star = ({ className }: IconProps) => (
  <Icon className={className}><path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7L12 4z" /></Icon>
);
export const Truck = ({ className }: IconProps) => (
  <Icon className={className}><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></Icon>
);
export const Check = ({ className }: IconProps) => (
  <Icon className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
);
