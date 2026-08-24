import { useMemo, useState } from 'react'
import { useParamsStore } from '@/store/paramsStore'
import { conversionOf, rateConstant, solve_batch, solve_CSTR, solve_PFR, type RxParams } from '@/lib/rxKinetics'
import { SPECIES_COLORS } from '@/lib/speciesColors'
import Plot from '@/components/Plot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

const N_POINTS = 300

// Reuses the existing species palette (rxWindowStyle.m's ReactorCompareWindow does
// the same — its Batch/CSTR/PFR accent colors are the same RGB triples as slots
// 3/1/2 of speciesColors(), just reassigned to reactor identity here).
const REACTOR_COLORS = {
  batch: SPECIES_COLORS[3],
  cstr: SPECIES_COLORS[1],
  pfr: SPECIES_COLORS[2],
}

/** Batch evaluated at t=tmax, CSTR & PFR at steady state for the same tau=Vr/q —
 * mirrors ReactorCompareWindow.m's computeAll, including its form-2 caveat: no
 * elementwise-vectorized closed form across k, so form 2 solves once per k value. */
function computeAllSweep(params: RxParams, kArr: number[], tau: number, q: number) {
  if (params.rateForm === 1) {
    return {
      Ca_batch: solve_batch(params, kArr, params.tmax)[0],
      Ca_cstr: solve_CSTR(params, kArr, tau)[0],
      Ca_pfr: solve_PFR(params, kArr, params.Vr, q)[0],
    }
  }
  const Ca_batch: number[] = []
  const Ca_cstr: number[] = []
  const Ca_pfr: number[] = []
  for (const k of kArr) {
    Ca_batch.push(solve_batch(params, k, params.tmax)[0][0])
    Ca_cstr.push(solve_CSTR(params, k, tau)[0][0])
    Ca_pfr.push(solve_PFR(params, k, params.Vr, q)[0][0])
  }
  return { Ca_batch, Ca_cstr, Ca_pfr }
}

function computeAllPoint(params: RxParams, k: number, tau: number, q: number) {
  return {
    Ca_batch: solve_batch(params, k, params.tmax)[0][0],
    Ca_cstr: solve_CSTR(params, k, tau)[0][0],
    Ca_pfr: solve_PFR(params, k, params.Vr, q)[0][0],
  }
}

interface ReactorTraceSet {
  x: number[]
  batch: number[]
  cstr: number[]
  pfr: number[]
  pointX: number
  batchPoint: number
  cstrPoint: number
  pfrPoint: number
}

function reactorTraces({ x, batch, cstr, pfr, pointX, batchPoint, cstrPoint, pfrPoint }: ReactorTraceSet) {
  return [
    { x, y: batch, type: 'scatter' as const, mode: 'lines' as const, name: 'Batch', line: { color: REACTOR_COLORS.batch, width: 2.5 } },
    { x, y: cstr, type: 'scatter' as const, mode: 'lines' as const, name: 'CSTR', line: { color: REACTOR_COLORS.cstr, width: 2.5, dash: 'dash' as const } },
    { x, y: pfr, type: 'scatter' as const, mode: 'lines' as const, name: 'PFR', line: { color: REACTOR_COLORS.pfr, width: 2.5 } },
    { x: [pointX], y: [batchPoint], type: 'scatter' as const, mode: 'markers' as const, showlegend: false, marker: { color: REACTOR_COLORS.batch, size: 10, line: { color: '#fff', width: 1.5 } } },
    { x: [pointX], y: [cstrPoint], type: 'scatter' as const, mode: 'markers' as const, showlegend: false, marker: { color: REACTOR_COLORS.cstr, size: 10, line: { color: '#fff', width: 1.5 } } },
    { x: [pointX], y: [pfrPoint], type: 'scatter' as const, mode: 'markers' as const, showlegend: false, marker: { color: REACTOR_COLORS.pfr, size: 10, line: { color: '#fff', width: 1.5 } } },
  ]
}

function ReactorResultCard({ name, color, Ca, Xa }: { name: string; color: string; Ca: number; Xa: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <span className="text-sm font-bold" style={{ color }}>
          {name}
        </span>
        <span className="font-mono text-sm">Ca = {Ca.toFixed(4)} mol/L</span>
        <span className="font-mono text-sm">Xa = {(Xa * 100).toFixed(1)}%</span>
      </CardContent>
    </Card>
  )
}

export function ComparePage() {
  const params = useParamsStore((s) => s.params)
  const [T, setT] = useState(params.Tmin)
  const [q, setQ] = useState(params.qmin)

  const clampedT = Math.min(Math.max(T, params.Tmin), params.Tmax)
  const clampedQ = Math.min(Math.max(q, params.qmin), params.qmax)
  const tau = params.Vr / clampedQ

  const T_sweep = useMemo(
    () =>
      Array.from(
        { length: N_POINTS },
        (_, i) => params.Tmin + ((params.Tmax - params.Tmin) * i) / (N_POINTS - 1),
      ),
    [params.Tmin, params.Tmax],
  )
  const k_sweep = useMemo(() => rateConstant(params, T_sweep), [params, T_sweep])
  const sweep = useMemo(
    () => computeAllSweep(params, k_sweep, tau, clampedQ),
    [params, k_sweep, tau, clampedQ],
  )

  const k_point = rateConstant(params, clampedT)
  const point = useMemo(
    () => computeAllPoint(params, k_point, tau, clampedQ),
    [params, k_point, tau, clampedQ],
  )

  const Xa_batch = useMemo(
    () => sweep.Ca_batch.map((Ca) => conversionOf(params, Ca)),
    [sweep.Ca_batch, params],
  )
  const Xa_cstr = useMemo(
    () => sweep.Ca_cstr.map((Ca) => conversionOf(params, Ca)),
    [sweep.Ca_cstr, params],
  )
  const Xa_pfr = useMemo(
    () => sweep.Ca_pfr.map((Ca) => conversionOf(params, Ca)),
    [sweep.Ca_pfr, params],
  )
  const XaPoint_batch = conversionOf(params, point.Ca_batch)
  const XaPoint_cstr = conversionOf(params, point.Ca_cstr)
  const XaPoint_pfr = conversionOf(params, point.Ca_pfr)

  const dXa = XaPoint_pfr - XaPoint_cstr
  const pfrLeads = dXa > 1e-4

  const chartLayout = (yTitle: string) => ({
    autosize: true,
    margin: { l: 64, r: 20, t: 20, b: 48 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: 'currentColor', size: 12 },
    xaxis: { title: { text: 'Temperature (K)' }, gridcolor: 'rgba(128,128,128,0.25)' },
    yaxis: {
      title: { text: yTitle },
      gridcolor: 'rgba(128,128,128,0.25)',
      exponentformat: 'none' as const,
    },
    legend: { orientation: 'h' as const, y: -0.25 },
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Temperature</span>
                <span className="font-mono">{clampedT.toFixed(1)} K</span>
              </div>
              <Slider
                value={[clampedT]}
                min={params.Tmin}
                max={params.Tmax}
                step={(params.Tmax - params.Tmin) / 200 || 1}
                onValueChange={(v) => setT(Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Flow Rate (affects CSTR &amp; PFR only)</span>
                <span className="font-mono">{clampedQ.toFixed(3)} L/min</span>
              </div>
              <Slider
                value={[clampedQ]}
                min={params.qmin}
                max={params.qmax}
                step={(params.qmax - params.qmin) / 200 || 1}
                onValueChange={(v) => setQ(Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </div>

          {pfrLeads ? (
            <p className="text-xs text-muted-foreground">
              T={clampedT.toFixed(0)} K, q={clampedQ.toFixed(3)} L/min, τ={tau.toFixed(2)} min — PFR
              outperforms CSTR by ΔXₐ={(dXa * 100).toFixed(1)}% ({((dXa / Math.max(XaPoint_cstr, 1e-9)) * 100).toFixed(1)}% higher conversion)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              T={clampedT.toFixed(0)} K, q={clampedQ.toFixed(3)} L/min, τ={tau.toFixed(2)} min
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exit Concentration vs. Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={reactorTraces({
                x: T_sweep,
                batch: sweep.Ca_batch,
                cstr: sweep.Ca_cstr,
                pfr: sweep.Ca_pfr,
                pointX: clampedT,
                batchPoint: point.Ca_batch,
                cstrPoint: point.Ca_cstr,
                pfrPoint: point.Ca_pfr,
              })}
              layout={chartLayout('Ca,exit (mol/L)')}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion vs. Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={reactorTraces({
                x: T_sweep,
                batch: Xa_batch,
                cstr: Xa_cstr,
                pfr: Xa_pfr,
                pointX: clampedT,
                batchPoint: XaPoint_batch,
                cstrPoint: XaPoint_cstr,
                pfrPoint: XaPoint_pfr,
              })}
              layout={{ ...chartLayout('Xa,exit'), yaxis: { ...chartLayout('Xa,exit').yaxis, range: [0, 1], tickformat: '.0%' } }}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReactorResultCard name="BATCH" color={REACTOR_COLORS.batch} Ca={point.Ca_batch} Xa={XaPoint_batch} />
        <ReactorResultCard name="CSTR" color={REACTOR_COLORS.cstr} Ca={point.Ca_cstr} Xa={XaPoint_cstr} />
        <ReactorResultCard name="PFR" color={REACTOR_COLORS.pfr} Ca={point.Ca_pfr} Xa={XaPoint_pfr} />
      </div>
    </div>
  )
}
