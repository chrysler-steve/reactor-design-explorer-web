import { useParamsStore } from '@/store/paramsStore'
import { equationString } from '@/lib/rxKinetics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Shared parameter panel — species/stoichiometry, kinetics, reactor, and
 * operating-range inputs feeding the Zustand store every reactor tab reads
 * from. Layout/visual styling here is functional only; the real design pass
 * (frontend-design + ui-ux-pro-max) lands in a later task. */
export function ParamPanel() {
  const params = useParamsStore((s) => s.params)
  const setSpeciesName = useParamsStore((s) => s.setSpeciesName)
  const setNu = useParamsStore((s) => s.setNu)
  const setC0 = useParamsStore((s) => s.setC0)
  const setRateForm = useParamsStore((s) => s.setRateForm)
  const setField = useParamsStore((s) => s.setField)

  return (
    <div className="flex flex-col gap-4">
      <p
        data-testid="equation-preview"
        className="rounded-lg bg-muted px-4 py-2 text-center font-mono text-sm"
      >
        {equationString(params)}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Species</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_4rem_4rem] gap-2 text-xs text-muted-foreground">
              <span>Name</span>
              <span>ν</span>
              <span>C₀</span>
            </div>
            {([0, 1, 2, 3] as const).map((i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_4rem] gap-2">
                <Input
                  aria-label={`species ${i + 1} name`}
                  value={params.species[i]}
                  onChange={(e) => setSpeciesName(i, e.target.value)}
                />
                <Input
                  aria-label={`species ${i + 1} nu`}
                  type="number"
                  value={params.nu[i]}
                  onChange={(e) => setNu(i, Number(e.target.value))}
                />
                <Input
                  aria-label={`species ${i + 1} C0`}
                  type="number"
                  min={0}
                  value={params.C0s[i]}
                  onChange={(e) => setC0(i, Number(e.target.value))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kinetics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Eₐ (J/mol)">
              <Input
                type="number"
                value={params.Ea}
                onChange={(e) => setField('Ea', Number(e.target.value))}
              />
            </Field>
            <Field label="A (pre-exponential)">
              <Input
                type="number"
                value={params.A}
                onChange={(e) => setField('A', Number(e.target.value))}
              />
            </Field>
            <Field label="Rate form">
              <Select
                value={String(params.rateForm)}
                onValueChange={(v) => setRateForm(Number(v) === 2 ? 2 : 1)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1 — nth-order (analytical)</SelectItem>
                  <SelectItem value="2">Form 2 — A·B power law (numerical)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="n (order in species 1)">
              <Input
                type="number"
                step="any"
                value={params.nA}
                onChange={(e) => setField('nA', Number(e.target.value))}
              />
            </Field>
            {params.rateForm === 2 && (
              <Field label="n (order in species 2)">
                <Input
                  type="number"
                  step="any"
                  value={params.nB}
                  onChange={(e) => setField('nB', Number(e.target.value))}
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reactor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Vᵣ (L)">
              <Input
                type="number"
                min={0}
                value={params.Vr}
                onChange={(e) => setField('Vr', Number(e.target.value))}
              />
            </Field>
            <Field label="t max (min)">
              <Input
                type="number"
                min={0}
                value={params.tmax}
                onChange={(e) => setField('tmax', Number(e.target.value))}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Ranges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="T min (K)">
              <Input
                type="number"
                value={params.Tmin}
                onChange={(e) => setField('Tmin', Number(e.target.value))}
              />
            </Field>
            <Field label="T max (K)">
              <Input
                type="number"
                value={params.Tmax}
                onChange={(e) => setField('Tmax', Number(e.target.value))}
              />
            </Field>
            <Field label="q min (L/min)">
              <Input
                type="number"
                min={0}
                value={params.qmin}
                onChange={(e) => setField('qmin', Number(e.target.value))}
              />
            </Field>
            <Field label="q max (L/min)">
              <Input
                type="number"
                min={0}
                value={params.qmax}
                onChange={(e) => setField('qmax', Number(e.target.value))}
              />
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </Label>
  )
}
