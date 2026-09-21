import { initials } from '../../lib/format'

interface AvatarProps {
  name: string
  size?: number
}

/** Circular initials avatar — neutral slate. */
export function Avatar({ name, size = 36 }: AvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-600"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
