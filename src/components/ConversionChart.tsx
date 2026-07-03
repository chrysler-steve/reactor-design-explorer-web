import Plot from '@/components/Plot'

interface ConversionChartProps {
  x: number[]
  y: number[]
  xLabel: string
  yLabel?: string
}

/** Reusable single-line conversion-vs-x plot, shared by reactor tabs that show a
 * conversion profile (CSTR, PFR) alongside the per-species ConcentrationChart. */
export function ConversionChart({ x, y, xLabel, yLabel = 'Conversion Xₐ' }: ConversionChartProps) {
  return (
    <Plot
      data={[
        {
          x,
          y,
          type: 'scatter',
          mode: 'lines',
          name: yLabel,
          line: { color: '#1A947A', width: 2.5 },
        },
      ]}
      layout={{
        autosize: true,
        margin: { l: 50, r: 20, t: 20, b: 45 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: 'currentColor', size: 12 },
        xaxis: { title: { text: xLabel }, gridcolor: 'rgba(128,128,128,0.25)' },
        yaxis: {
          title: { text: yLabel },
          gridcolor: 'rgba(128,128,128,0.25)',
          range: [0, 1],
          tickformat: '.0%',
        },
        showlegend: false,
      }}
      config={{ displaylogo: false, responsive: true }}
      useResizeHandler
      style={{ width: '100%', height: '360px' }}
    />
  )
}
