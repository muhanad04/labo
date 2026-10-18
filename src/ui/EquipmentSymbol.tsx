import type { Kind } from '../core/circuit'

/** Original, shared electrical symbols; fixed stroke/coordinates in library and on instruments. */
export function EquipmentSymbol({
  kind,
  closed = true,
  ac = false,
  className,
}: {
  kind: Kind
  closed?: boolean
  ac?: boolean
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'resistor' ? (
        <path d="M2 20h8l4-8 6 16 6-16 6 16 6-16 6 16 6-16 4 8h8" />
      ) : kind === 'inductor' ? (
        <path d="M2 28h8c0-22 11-22 11 0c0-22 11-22 11 0c0-22 11-22 11 0c0-22 11-22 11 0h8" />
      ) : kind === 'capacitor' ? (
        <path d="M2 20h24M26 5v30M38 5v30M38 20h24" />
      ) : kind === 'transformer' ? (
        <>
          <path d="M8 5h10c12 0 12 10 0 10c12 0 12 10 0 10c12 0 12 10 0 10H8M56 5H46c-12 0-12 10 0 10c-12 0-12 10 0 10c-12 0-12 10 0 10h10M29 3v34M35 3v34" />
          <circle cx="13" cy="5" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="51" cy="5" r="1.7" fill="currentColor" stroke="none" />
        </>
      ) : kind === 'ground' ? (
        <path d="M32 3v15M14 18h36M20 26h24M26 34h12" />
      ) : kind === 'switch' ? (
        <>
          <path d={closed ? 'M2 27h18l24 0h18' : 'M2 27h18L42 8M44 27h18'} />
          <circle cx="20" cy="27" r="2" />
          <circle cx="44" cy="27" r="2" />
        </>
      ) : (
        <>
          <circle cx="32" cy="20" r="12" />
          <path d="M2 20h18M44 20h18" />
          {kind === 'source' ? (
            <path d={ac ? 'M24 20c4-12 12 12 16 0' : 'M27 15h10M32 10v10M27 26h10'} />
          ) : (
            <text x="32" y="25" fill="currentColor" stroke="none" textAnchor="middle" fontSize="16">
              {kind === 'ammeter' ? 'A' : 'V'}
            </text>
          )}
        </>
      )}
    </svg>
  )
}
