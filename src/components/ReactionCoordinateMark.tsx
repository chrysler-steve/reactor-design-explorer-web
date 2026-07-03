interface ReactionCoordinateMarkProps {
  className?: string
  /** Adds the dashed activation-energy indicator — used for the larger
   * decorative hero placement, omitted for the compact nav mark. */
  showDetail?: boolean
}

/**
 * The app's signature mark: a reaction-coordinate (activation-energy) diagram
 * — reactants rising over a transition-state peak to products. This is the
 * literal curve the Arrhenius kinetics this app simulates is built on, not a
 * decorative glyph.
 */
export function ReactionCoordinateMark({ className, showDetail = false }: ReactionCoordinateMarkProps) {
  return (
    <svg
      viewBox="0 0 120 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 42 H30" />
      <path d="M30 42 C40 42 44 12 60 12 C76 12 80 30 92 30" />
      <path d="M92 30 H114" />
      {showDetail && <path d="M60 12 V42" strokeWidth={1.25} strokeDasharray="2 3" opacity={0.5} />}
    </svg>
  )
}
