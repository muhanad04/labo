import { kinds } from '../core/circuit'
import type { Kind } from '../core/circuit'

export const EQUIPMENT_DRAG = 'application/x-labo-equipment'
export function readEquipmentDrag(text: string): { kind: Kind; losses: boolean } | null {
  if (text.length > 256) return null
  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || !('kind' in value) || !('losses' in value)) return null
    if (!kinds.includes(value.kind as Kind) || typeof value.losses !== 'boolean') return null
    return { kind: value.kind as Kind, losses: value.losses }
  } catch { return null }
}
