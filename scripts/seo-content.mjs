/**
 * Indexable prose for each route, emitted into a <noscript> block by
 * prerender-routes.mjs.
 *
 * Why this exists: the app is a client-rendered SPA, so the HTML actually
 * served is `<div id="root"></div>` and nothing else — 51 bytes of body. Google
 * runs the JS and indexes the real app; Bing's renderer largely does not, so it
 * saw five URLs with no text on them and had nothing to rank. This gives every
 * page a truthful plain-HTML summary of what the app shows there.
 *
 * Build-time only — deliberately not in pageMeta.data.json, which ships to the
 * browser in the JS bundle. Keep it accurate: it must describe what the page
 * genuinely does, or it is cloaking.
 */

/** Shared by every page, so a crawler landing anywhere can reach the rest. */
export const NAV = [
  { path: '/', label: 'Home' },
  { path: '/batch', label: 'Batch reactor' },
  { path: '/cstr', label: 'CSTR' },
  { path: '/pfr', label: 'PFR' },
  { path: '/compare', label: 'Compare all three' },
]

export const CONTENT = {
  '/': {
    heading: 'Reactor Design Explorer',
    body: [
      'An interactive chemical reaction engineering simulator that runs entirely in the browser. Define a custom multi-species reaction — species names, stoichiometric coefficients and initial concentrations — choose a rate law, then watch ideal Batch, CSTR and PFR reactors solve it in real time with the physics rendered live in 3D.',
      'Two rate laws are supported: a pseudo-order form r = k·[A]ⁿ, solved in closed form, and a two-species form r = k·[A]^nA·[B]^nB, solved by RK4 integration with bisection for the CSTR steady state. The rate constant follows the Arrhenius expression k = A·exp(−Eₐ/RT), so temperature drives everything on the page.',
      'Drag temperature and volumetric flow rate and the charts, numeric readouts and 3D vessels all update together: liquid colour tracks conversion, agitators turn with the rate constant, and feed and product particles flow at the volumetric flow rate. Any configuration can be shared as a URL.',
      'The physics core is a function-for-function TypeScript port of a MATLAB App Designer application, tested against fixtures captured from a live MATLAB session so the browser and the desktop app agree on the numbers. Free, open source under the MIT licence, and requires no installation or account.',
    ],
  },
  '/batch': {
    heading: 'Batch reactor simulator',
    body: [
      'A batch reactor is a closed, well-mixed vessel with no inflow or outflow: reactants are charged at the start and composition changes with time alone. This page integrates the mole balance for your custom reaction and plots how each species concentration evolves over the batch time.',
      'For a simple nth-order rate law r = k·[A]ⁿ the concentration profile follows the closed-form solution of dC/dt = −k·Cⁿ; for second order this is the familiar C = C₀ / (1 + k·C₀·t). Two-species kinetics are integrated numerically with RK4 instead.',
      'Conversion, the rate constant k and the batch time are shown live and recompute as you change temperature, since k = A·exp(−Eₐ/RT). The 3D vessel alongside the chart shows a stirred tank whose liquid colour tracks conversion and whose impeller speed tracks the rate constant.',
    ],
  },
  '/cstr': {
    heading: 'CSTR simulator — continuous stirred-tank reactor',
    body: [
      'A continuous stirred-tank reactor is a continuously fed, perfectly mixed vessel operating at steady state, so the exit stream has the same composition as the reactor contents. This page solves the steady-state mole balance for your custom reaction and shows how exit conversion responds to temperature and volumetric flow rate.',
      'The steady-state balance C₀ − C = k·τ·Cⁿ is solved for the exit concentration, where the residence time τ = V/q. For second-order kinetics this gives the closed form C = 2C₀ / (1 + √(1 + 4k·τ·C₀)); the two-species rate law is solved by bisection instead, which is robust where an analytical root does not exist.',
      'Residence time, rate constant and exit conversion update live as you drag the temperature and flow-rate sliders. The 3D tank renders the feed and product streams as flowing particles at the actual volumetric flow rate, with liquid colour tracking conversion.',
    ],
  },
  '/pfr': {
    heading: 'PFR simulator — plug-flow reactor',
    body: [
      'A plug-flow reactor is a tubular reactor in which fluid moves as discrete plugs with no axial mixing, so composition varies along the reactor length rather than with time. This page integrates the mole balance down the reactor volume and plots the axial conversion profile that develops from inlet to outlet.',
      'The design equation dC/dV = −r/q is integrated along the volume coordinate; for second-order kinetics the outlet concentration reduces to C = C₀ / (1 + k·C₀·V/q). Because a PFR sees the full undiluted inlet concentration at its entrance, it achieves higher conversion than a CSTR of equal volume for any positive-order rate law.',
      'The reactor is rendered as a 3D shell-and-tube vessel, with a colour gradient along the tube showing the conversion profile in the same coordinate the chart plots. Temperature and flow rate update the profile, the rate constant and the outlet conversion together.',
    ],
  },
  '/compare': {
    heading: 'Compare Batch vs CSTR vs PFR',
    body: [
      'This page overlays all three ideal reactors on the same axes so their performance can be read against one another directly, across both temperature and volumetric flow rate, for whatever reaction and kinetics you have configured.',
      'The classic reaction engineering result is visible here rather than merely asserted: for any positive-order rate law a plug-flow reactor outperforms a continuous stirred-tank reactor of the same volume, because the CSTR operates entirely at its low exit concentration while the PFR sees a concentration that falls gradually from the inlet value. The gap widens as reaction order and target conversion increase.',
      'All three curves recompute together as you change temperature, flow rate, stoichiometry or rate law, which makes the crossover conditions and the size of the CSTR penalty easy to explore.',
    ],
  },
}
