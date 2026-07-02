// Uses the lightweight plotly.js-dist-min build via react-plotly.js's factory
// export, instead of the default import (which pulls in the full plotly.js).
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'

const Plot = createPlotlyComponent(Plotly)

export default Plot
