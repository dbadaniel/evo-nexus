import * as Icons from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

type IconModule = Record<string, unknown>

export function resolveLucideIcon(name: string | null | undefined, fallback: LucideIcon): LucideIcon {
  if (!name) return fallback
  const icon = (Icons as IconModule)[name]
  return typeof icon === 'function' ? (icon as LucideIcon) : fallback
}
