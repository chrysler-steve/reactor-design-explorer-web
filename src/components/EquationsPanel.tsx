import type { ReactNode } from 'react'
import { equationString, type RxParams } from '@/lib/rxKinetics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ReactorKind = 'batch' | 'cstr' | 'pfr'

function rateLaw(params: RxParams): string {
  const a = params.species[0] || 'A'
  const b = params.species[1] || 'B'
  return params.rateForm === 1
    ? `r = k · [${a}]^${params.nA}`
    : `r = k · [${a}]^${params.nA} · [${b}]^${params.nB}`
}

function designEquation(reactor: ReactorKind, species1: string): string {
  const a = species1 || 'A'
  switch (reactor) {
    case 'batch':
      return `d[${a}]/dt = −r`
    case 'cstr':
      return `[${a}]₀ − [${a}] = τ · r`
    case 'pfr':
      return `d[${a}]/dV = −r / q`
  }
}

function solveMethod(reactor: ReactorKind, params: RxParams): string {
  if (params.rateForm === 1) return 'Solved analytically — closed-form nth-order rate law.'
  return reactor === 'cstr'
    ? 'Solved numerically — bisection on the steady-state mole balance.'
    : 'Solved numerically — 4th-order Runge–Kutta integration.'
}

function EquationRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  )
}

interface EquationsPanelProps {
  params: RxParams
  reactor: ReactorKind
}

/** Surfaces the real rate-law math behind the current reactor tab: the
 * reaction stoichiometry, the rate law, the reactor's governing (design)
 * equation, and how it's actually being solved for the current rate form. */
export function EquationsPanel({ params, reactor }: EquationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <EquationRow label="Reaction">{equationString(params)}</EquationRow>
        <EquationRow label="Rate law">{rateLaw(params)}</EquationRow>
        <EquationRow label="Design equation">{designEquation(reactor, params.species[0])}</EquationRow>
        <p className="pt-1 text-xs text-muted-foreground">{solveMethod(reactor, params)}</p>
      </CardContent>
    </Card>
  )
}
