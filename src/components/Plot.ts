// Plotly, cut down to just what this app draws.
//
// plotly.js-dist-min is the everything bundle — 4.84 MB of chart types, WebGL
// renderers, map projections and financial charts, of which we use exactly one:
// 2D line scatter. It compiled into a single ~1.39 MB gzipped chunk, by a wide
// margin the heaviest thing shipped, and it was fetched by every reactor page.
//
// Building from plotly.js/lib/core and registering only the scatter trace keeps
// every chart in the app rendering identically at a fraction of the weight. Add
// a register() line here if a chart ever needs another trace type — importing
// the dist bundle again would undo this.
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js/lib/core'
import scatter from 'plotly.js/lib/scatter'

Plotly.register([scatter])

const Plot = createPlotlyComponent(Plotly)

export default Plot
