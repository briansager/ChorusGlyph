import type { ReactNode } from 'react'

// One outline family, including product-specific compound glyphs. Decorative
// icons always accompany contextual text; control names belong to the control.
const artwork = {
  workspace: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 13h8M8 16h5" /></>,
  lyrics: <path d="M4 6h16M4 12h12M4 18h9" />,
  timing: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5h4M19 4v4" /></>,
  play: <path d="m8 4 12 8-12 8Z" />,
  pause: <><path d="M7 4h3v16H7zM15 4h3v16h-3z" /></>,
  currentSong: <><path d="M9 16V4l5-1v10M16 6h5M16 10h4" /><ellipse cx="6" cy="17" rx="3" ry="2" /><ellipse cx="11" cy="14" rx="3" ry="2" /></>,
  companion: <><path d="M10 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5M7 21h5M9 17v4m6-5 2-2a3 3 0 0 1 4 4l-2 2m-1-4-2 2a3 3 0 0 1-4-4l2-2" /></>,
  detection: <><path d="M3 5h12M9 3v2M5 8l6 7M13 8l-8 9" /><circle cx="17" cy="15" r="4" /><path d="m20 18 2 3" /></>,
  compare: <path d="M4 5h5M4 10h5M4 15h5M4 20h5M15 5h5M15 10h5M15 15h5M15 20h5M12 3v18" />,
  supported: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  unsupported: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  loading: <path d="M21 12a9 9 0 1 1-9-9" />,
  cached: <><ellipse cx="10" cy="5" rx="7" ry="3" /><path d="M3 5v12c0 2 4 3 7 3M17 5v5M3 11c0 2 4 3 7 3m4 3 3 3 5-6" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>,
  retry: <><path d="M20 7v5h-5M4 17a8 8 0 1 0 1-11" /></>,
  clear: <><path d="m3 14 10-10a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8H8zm4-4 10 10M13 20h8" /></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 1 2h4l1-3 3-1 3-4-2-2V7l-4-2-1-2Z" /><circle cx="12" cy="12" r="3" /></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-4L4 15Z" /></>,
  warning: <><path d="m12 3 10 18H2ZM12 9v5m0 3h.01" /></>,
  manual: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 9v6M6 9h4M6 15h4M14 10h4M14 14h3" /></>,
  upload: <><path d="M14 3H5v18h14V8ZM14 3v5h5m-7 10v-7m-3 3 3-3 3 3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
  cancel: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof artwork
export function Icon({ name }: { name: IconName }) {
  return <svg className={`icon icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{artwork[name]}</svg>
}
