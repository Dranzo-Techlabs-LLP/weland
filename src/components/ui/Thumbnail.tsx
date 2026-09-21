import { initials } from '../../lib/format'

interface ThumbnailProps {
  name: string
  /** kept for API compatibility; the design system uses a single emerald tile */
  accent?: string
  size?: number
}

/** Emerald gradient property tile with white initials. */
export function Thumbnail({ name, size = 40 }: ThumbnailProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl font-serif text-[13px] font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #059669, #0f1f12)',
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
