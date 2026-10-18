import type { Device } from './circuit'
export type Complex = [number, number]
export function impedance(device: Device, frequency: number): Complex | null {
  if (device.kind === 'resistor') return [device.value, 0]
  if (device.kind === 'source') return [device.seriesResistance ?? 0, 0]
  if (device.kind === 'inductor')
    return [device.seriesResistance ?? 0, 2 * Math.PI * frequency * device.value]
  if (device.kind === 'capacitor')
    return [device.seriesResistance ?? 0, -1 / (2 * Math.PI * frequency * device.value)]
  return null
}
export function admittance(device: Device, frequency: number): Complex {
  const z = impedance(device, frequency)
  if (!z) return [0, 0]
  const scale = Math.max(Math.abs(z[0]), Math.abs(z[1]))
  if (!scale) return [0, 0]
  const r = z[0] / scale,
    x = z[1] / scale,
    denominator = (r * r + x * x) * scale
  return [r / denominator, -x / denominator]
}
