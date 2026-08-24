# Reactor Design Explorer

An interactive chemical reaction engineering simulator. Define a custom
multi-species reaction and its kinetics, then watch Batch, CSTR and PFR
reactors solve it in real time — with the physics rendered live in 3D, in the
browser.

**→ [reactor-design-explorer-web.vercel.app](https://reactor-design-explorer-web.vercel.app)**

## What it does

Set up any reaction across four species — names, stoichiometric coefficients,
initial concentrations — pick a rate law, then explore how the three ideal
reactors respond:

- **Batch** — a well-mixed vessel; concentration evolving over time.
- **CSTR** — a continuously stirred tank, solved at steady state.
- **PFR** — a tubular plug-flow reactor with an axial conversion profile.
- **Compare** — all three overlaid, so the classic result that a PFR
  outperforms a CSTR for positive-order kinetics is visible rather than
  asserted.

Drag temperature and flow rate and everything updates together: the charts, the
readouts, and the 3D vessels — liquid colour tracking conversion, agitators
turning with the rate constant, feed and product particles flowing at the
volumetric flow rate.

Any configuration can be shared as a URL via **Copy share link**.

## Kinetics

Two rate laws are supported:

| Form | Rate law | Solved by |
| --- | --- | --- |
| 1 | r = k·[A]ⁿ | Closed-form nth-order solutions |
| 2 | r = k·[A]^nA·[B]^nB | RK4 integration; bisection for the CSTR |

with k from the Arrhenius expression k = A·exp(−Eₐ/RT).

Form 1 depends on species 1 alone — a pseudo-order law, valid while every other
reactant is in excess. Feed a co-reactant that runs out first and the app says
so, and points you at form 2, which tracks the second species properly.

## Provenance

This is a TypeScript port of a MATLAB App Designer application. The physics core
(`src/lib/rxKinetics.ts`) is a function-for-function port of `rxKinetics.m`, and
its test suite checks the port against fixtures captured from a live MATLAB
session rather than against itself — so the browser and the desktop app agree on
the numbers.

## Running it

```bash
npm install
npm run dev        # dev server
npm test           # unit tests
npm run typecheck  # tsc, no emit
npm run build      # production build
```

## Built with

React 19, TypeScript, Vite, Three.js via React Three Fiber, Plotly (a
scatter-only custom build), Zustand, Tailwind CSS and shadcn/ui.

## License

MIT — see [LICENSE](./LICENSE).
