// @haystackedai/a2ui-chart-react — public surface.
//
// A2UIChart: the A2UI chart experience for @a2ui/react hosts, WITH the runtime
// included. Unlike a leaf-renderer package, A2UIChart hides the whole A2UI loop:
// the host calls one hook + drops in one view component and gets an agent-driven,
// drillable chart — no MessageProcessor, no transport, no catalog merge, no drill
// wiring.
//
//   import { useA2UIChart, A2UIChartView } from '@haystackedai/a2ui-chart-react'
//   const { surfaces, send, drill, trace, usage } = useA2UIChart({
//     catalogId: MY_CATALOG_ID,              // byte-matches the agent
//     controlSchema: MyControlSchema,        // generated from MY catalog JSON
//     datashapeSchema: MyDataShapeSchema,
//   })
//   // ... <A2UIChartView surfaces={surfaces} drill={drill} />
//
// The contract (catalogId + schemas) is INJECTED, not baked — one publish serves
// every project, and it composes with whatever agent/A2UI package emits the surface.

// The two public entries.
export { useA2UIChart } from './entry/useChart.js'
export { A2UIChartView } from './entry/ChartView.js'

// Types that appear in those two signatures, so consumers can annotate. The
// A2UIChartTransport interface is the contract for the hook's `transport?` option —
// we expose the shape to implement, not the default A2UIChart_Client that fills it.
export type { A2UIChartSurface, UseA2UIChartOptions, UseA2UIChartResult } from './entry/useChart.js'
export type { A2UIChartTraceEntry } from './entry/_trace.js'
export type { A2UIChartTransport } from './transport/client.js'
