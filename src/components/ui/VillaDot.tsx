import { roomColor } from '../../lib/config'

export function VillaDot({ villa, className = '' }: { villa: string; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: roomColor(villa) }}
    />
  )
}
