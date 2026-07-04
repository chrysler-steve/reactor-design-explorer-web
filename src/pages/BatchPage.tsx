import { useMemo, useState } from 'react'
import { useParamsStore } from '@/store/paramsStore'
import { conversionOf, rateConstant, rateFraction, solve_batch } from '@/lib/rxKinetics'
import { ConcentrationChart } from '@/components/ConcentrationChart'
import { EquationsPanel } from '@/components/EquationsPanel'
import { BatchScene } from '@/components/reactors/BatchScene'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

const N_POINTS = 200

export function BatchPage() {
  const params = useParamsStore((s) => s.params)
  const [T, setT] = useState(params.Tmin)

  // Keep the slider's current value inside range if Tmin/Tmax change in the panel.
  const clampedT = Math.min(Math.max(T, params.Tmin), params.Tmax)

  const t = useMemo(
    () => Array.from({ length: N_POINTS }, (_, i) => (params.tmax * i) / (N_POINTS - 1)),
    [params.tmax],
  )

  const k = rateConstant(params, clampedT)
  const C = useMemo(() => solve_batch(params, k, t), [params, k, t])

  const finalC1 = C[0][C[0].length - 1]
  const conversion = conversionOf(params, finalC1)
  const tempFraction =
    params.Tmax > params.Tmin ? (clampedT - params.Tmin) / (params.Tmax - params.Tmin) : 0

  const xaTrajectory = useMemo(
    () => C[0].map((c1) => conversionOf(params, c1)),
    [C, params],
  )
  const kFraction = rateFraction(params, k)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Batch Reactor</CardTitle>
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

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Rate constant k</dt>
              <dd className="text-right font-mono">{k.toExponential(3)}</dd>
              <dt className="text-muted-foreground">Final conversion Xₐ</dt>
              <dd className="text-right font-mono">{(conversion * 100).toFixed(1)}%</dd>
            </dl>

            <BatchScene xaTrajectory={xaTrajectory} kFraction={kFraction} tempFraction={tempFraction} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concentration vs. Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ConcentrationChart x={t} matrix={C} params={params} xLabel="t (min)" />
          </CardContent>
        </Card>
      </div>

      <EquationsPanel params={params} reactor="batch" />
    </div>
  )
}
