// A2UIChartView — renders the A2UI surfaces useA2UIChart produced.
//
// The display half, packaged so the host writes no A2UI render code. It wraps the
// surfaces in the two context providers Chart needs (drill bridge + markdown)
// and renders each via <A2uiSurface>. Pure presentation — no state, no transport.
//
// A2UIChart_DrillContext is the SAME context object Chart reads internally, so the
// Provider here feeds that component's drills back to the hook's `drill`.

import { A2uiSurface, MarkdownContext } from '@a2ui/react/v0_9'
import { renderMarkdown } from '@a2ui/markdown-it'
import { A2UIChart_DrillContext } from '../render/drill.js'
import type { A2UIChartSurface } from './useChart.js'

export function A2UIChartView({ surfaces, drill }: { surfaces: A2UIChartSurface[]; drill: (value: string) => void }) {
    if (surfaces.length === 0) return null
    return (
        <A2UIChart_DrillContext.Provider value={drill}>
            <MarkdownContext.Provider value={renderMarkdown}>
                {surfaces.map((s) => <A2uiSurface key={s.id} surface={s} />)}
            </MarkdownContext.Provider>
        </A2UIChart_DrillContext.Provider>
    )
}
