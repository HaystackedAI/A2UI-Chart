import { z } from 'zod'
import { Catalog } from '@a2ui/web_core/v0_9'
import { basicCatalog, type ReactComponentImplementation } from '@a2ui/react/v0_9'
import { A2UIChart_makeChart } from './Chart.js'

// Build the A2UI catalog from the HOST's own inputs — nothing here is baked.
// The host passes:
//   - catalogId      : its deployment's id (must byte-match the agent's createSurface.catalogId)
//   - controlSchema  : its generated plotType schema (from its catalog JSON)
//   - datashapeSchema: its generated series schema
//   - name?          : the component type the agent emits (default 'A2UI_Chart')
// Result = all basic components + the A2UIChart chart, under the host's catalogId.
// In A2UIChart the host never calls this directly — useA2UIChart does it internally.
export function A2UIChart_makeCatalog(opts: {
    catalogId: string
    controlSchema: z.ZodObject<any>
    datashapeSchema: z.ZodTypeAny
    name?: string
}) {
    const chart = A2UIChart_makeChart(opts)
    return new Catalog<ReactComponentImplementation>(
        opts.catalogId,
        basicCatalog.protocolVersion,                              // same spec version (v0.9) as basic
        [...basicCatalog.components.values(), chart],              // basic components + our chart
        [...basicCatalog.functions.values()],                      // reuse basic's expression functions
        basicCatalog.themeSchema,                                  // reuse basic's theme schema
    )
}
