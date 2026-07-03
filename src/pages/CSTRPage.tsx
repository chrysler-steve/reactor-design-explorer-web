import { useMemo, useState } from 'react'
import { useParamsStore } from '@/store/paramsStore'
import { rateConstant, solve_CSTR, solve_PFR, type ConcMatrix, type RxParams } from '@/lib/rxKinetics'
import { ConcentrationChart } from '@/components/ConcentrationChart'
import { ConversionChart } from '@/components/ConversionChart'
import { EquationsPanel } from '@/components/EquationsPanel'
import { CSTRScene } from '@/components/reactors/CSTRScene'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

const N_POINTS = 200

/** solve_CSTR's rateForm-2 branch requires a scalar k (mirrors MATLAB's own
 * CSTRWindow.computeAllSpecies, which loops k one value at a time for form 2
 * rather than vectorizing inside rxKinetics.m). Form 1 vectorizes directly. */
function sweepCSTROverK(params: RxParams, kArr: number[], tau: number): ConcMatrix {
  if (params.rateForm === 1) return solve_CSTR(params, kArr, tau)
  const out: ConcMatrix = [[], [], [], []]
  for (const k of kArr) {
    const c = solve_CSTR(params, k, tau)
    for (let i = 0; i < 4; i++) out[i].push(c[i][0])
  }
  return out
}

export function CSTRPage() {
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
  const k_sweep = rateConstant(params, T_sweep)
  const C_sweep = useMemo(() => sweepCSTROverK(params, k_sweep, tau), [params, k_sweep, tau])
  const Xa_sweep = useMemo(
    () => C_sweep[0].map((c1) => (params.C0s[0] > 0 ? 1 - c1 / params.C0s[0] : 0)),
    [C_sweep, params.C0s],
  )

  const k_point = rateConstant(params, clampedT)
  const C_point = useMemo(() => solve_CSTR(params, k_point, tau), [params, k_point, tau])
  const Ca = C_point[0][0]
  const conversion = params.C0s[0] > 0 ? 1 - Ca / params.C0s[0] : 0

  const Ca_pfr = useMemo(
    () => solve_PFR(params, k_point, params.Vr, clampedQ)[0][0],
    [params, k_point, clampedQ],
  )
  const conversionPfr = params.C0s[0] > 0 ? 1 - Ca_pfr / params.C0s[0] : 0

  const kMin = rateConstant(params, params.Tmin)
  const kMax = rateConstant(params, params.Tmax)
  const logRange = Math.log(kMax) - Math.log(kMin)
  const kFraction = logRange > 0 ? Math.min(Math.max((Math.log(k_point) - Math.log(kMin)) / logRange, 0), 1) : 0
  const flowFraction =
    params.qmax > params.qmin ? (clampedQ - params.qmin) / (params.qmax - params.qmin) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>CSTR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
              <span className="text-muted-foreground">Flow Rate</span>
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

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Ca,exit</dt>
            <dd className="text-right font-mono">{Ca.toFixed(4)} mol/L</dd>
            <dt className="text-muted-foreground">Xa,exit</dt>
            <dd className="text-right font-mono">{(conversion * 100).toFixed(1)}%</dd>
            <dt className="text-muted-foreground">Residence time τ</dt>
            <dd className="text-right font-mono">{tau.toFixed(2)} min</dd>
            <dt className="text-muted-foreground">Rate constant k</dt>
            <dd className="text-right font-mono">{k_point.toExponential(3)}</dd>
          </dl>

          <p className="text-xs text-muted-foreground">
            T={clampedT.toFixed(0)} K, q={clampedQ.toFixed(3)} L/min: CSTR Xₐ=
            {(conversion * 100).toFixed(1)}% | PFR Xₐ={(conversionPfr * 100).toFixed(1)}% (PFR{' '}
            {conversionPfr >= conversion ? '+' : ''}
            {((conversionPfr - conversion) * 100).toFixed(1)}%)
          </p>

          <CSTRScene conversion={conversion} kFraction={kFraction} flowFraction={flowFraction} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Concentration vs. Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <ConcentrationChart x={T_sweep} matrix={C_sweep} params={params} xLabel="Temperature (K)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion vs. Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart x={T_sweep} y={Xa_sweep} xLabel="Temperature (K)" />
          </CardContent>
        </Card>
      </div>
      </div>

      <EquationsPanel params={params} reactor="cstr" />
    </div>
  )
}
