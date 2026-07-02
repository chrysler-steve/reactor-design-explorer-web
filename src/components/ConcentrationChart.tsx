import Plot from '@/components/Plot'
import { SPECIES_COLORS } from '@/lib/speciesColors'
import type { ConcMatrix, RxParams } from '@/lib/rxKinetics'

interface ConcentrationChartProps {
  x: number[]
  matrix: ConcMatrix
  params: RxParams
  xLabel: string
}

/** Reusable 2D concentration-vs-x plot, shared by every reactor tab —
 * plots every active species (nu != 0) against a common x axis (t, tau, or V). */
export function ConcentrationChart({ x, matrix, params, xLabel }: ConcentrationChartProps) {
  const traces = params.nu
    .map((nu, i) =>
      nu === 0
        ? null
        : {
            x,
            y: matrix[i],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: params.species[i] || String.fromCharCode(65 + i),
            line: { color: SPECIES_COLORS[i], width: 2.5 },
          },
    )
    .filter((t): t is NonNullable<typeof t> => t !== null)

  return (
    <Plot
      data={traces}
      layout={{
        autosize: true,
        margin: { l: 50, r: 20, t: 20, b: 45 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: 'currentColor', size: 12 },
        xaxis: { title: { text: xLabel }, gridcolor: 'rgba(128,128,128,0.25)' },
        yaxis: { title: { text: 'Concentration (mol/L)' }, gridcolor: 'rgba(128,128,128,0.25)' },
        legend: { orientation: 'h', y: -0.25 },
      }}
      config={{ displaylogo: false, responsive: true }}
      useResizeHandler
      style={{ width: '100%', height: '360px' }}
    />
  )
}
