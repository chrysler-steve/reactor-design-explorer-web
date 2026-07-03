import { useMemo, useState } from 'react'
import { useParamsStore } from '@/store/paramsStore'
import { rateConstant, solve_PFR, solve_CSTR } from '@/lib/rxKinetics'
import { ConcentrationChart } from '@/components/ConcentrationChart'
import { ConversionChart } from '@/components/ConversionChart'
import { PFRScene } from '@/components/reactors/PFRScene'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

const N_POINTS = 200

export function PFRPage() {
  const params = useParamsStore((s) => s.params)
  const [T, setT] = useState(params.Tmin)
  const [q, setQ] = useState(params.qmin)

  const clampedT = Math.min(Math.max(T, params.Tmin), params.Tmax)
  const clampedQ = Math.min(Math.max(q, params.qmin), params.qmax)
  const tau = params.Vr / clampedQ
  const k_point = rateConstant(params, clampedT)

  const V_sweep = useMemo(
    () => Array.from({ length: N_POINTS }, (_, i) => (params.Vr * i) / (N_POINTS - 1)),
    [params.Vr],
  )
  // solve_PFR vectorizes over V directly for both rate forms (unlike solve_CSTR's
  // form-2 branch, which requires a scalar k) — a single call covers the whole sweep.
  const C_sweep = useMemo(
    () => solve_PFR(params, k_point, V_sweep, clampedQ),
    [params, k_point, V_sweep, clampedQ],
  )
  const Xa_sweep = useMemo(
    () => C_sweep[0].map((c1) => (params.C0s[0] > 0 ? 1 - c1 / params.C0s[0] : 0)),
    [C_sweep, params.C0s],
  )

  const Ca = C_sweep[0][C_sweep[0].length - 1]
  const conversion = params.C0s[0] > 0 ? 1 - Ca / params.C0s[0] : 0

  const Ca_cstr = useMemo(() => solve_CSTR(params, k_point, tau)[0][0], [params, k_point, tau])
  const conversionCstr = params.C0s[0] > 0 ? 1 - Ca_cstr / params.C0s[0] : 0

  const flowFraction =
    params.qmax > params.qmin ? (clampedQ - params.qmin) / (params.qmax - params.qmin) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>PFR</CardTitle>
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
            T={clampedT.toFixed(0)} K, q={clampedQ.toFixed(3)} L/min: PFR Xₐ=
            {(conversion * 100).toFixed(1)}% | CSTR Xₐ={(conversionCstr * 100).toFixed(1)}% (PFR{' '}
            {conversion >= conversionCstr ? '+' : ''}
            {((conversion - conversionCstr) * 100).toFixed(1)}%)
          </p>

          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>FEED →</span>
            <span>→ PRODUCT</span>
          </div>
          <PFRScene xaProfile={Xa_sweep} flowFraction={flowFraction} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Concentration Profile along PFR</CardTitle>
          </CardHeader>
          <CardContent>
            <ConcentrationChart x={V_sweep} matrix={C_sweep} params={params} xLabel="Reactor Volume (L)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Profile along PFR</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart x={V_sweep} y={Xa_sweep} xLabel="Reactor Volume (L)" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
