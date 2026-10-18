// Flow-trace model + the chart narration helper the runtime logs. One A2UIChartTraceEntry
// per real step, so a host's panel can show who-calls-what each turn. The package
// produces these; the host only displays them (actor → colour is the host's call).

export interface A2UIChartTraceEntry {
    seq: number
    ts: number       // epoch ms — orders client + backend entries into one timeline
    t: string        // wall-clock time
    actor: string    // who is acting (e.g. "processor → onSurfaceCreated")
    action: string   // what they did
    detail?: string  // optional payload / id
}

// The <A2uiSurface> render each plotType turns into — names the exact Recharts
// call Chart emits (see ../render/Chart).
const A2UIChart_RECHARTS: Record<string, string> = {
    bar: '<BarChart data={items} layout="vertical"><Bar dataKey="value"/></BarChart>',
    column: '<BarChart data={items}><Bar dataKey="value"/></BarChart>',
    line: '<LineChart data={items}><Line dataKey="value"/></LineChart>',
    area: '<AreaChart data={items}><Area dataKey="value"/></AreaChart>',
    pie: '<PieChart><Pie data={items} dataKey="value" nameKey="label"/></PieChart>',
    donut: '<PieChart><Pie data={items} dataKey="value" nameKey="label" innerRadius/></PieChart>',
    scatter: '<ScatterChart><Scatter data={points}/></ScatterChart>',
    KPI_CARD: 'big-number <div>{series.value}</div> (no Recharts)',
    table: '<table> over series.rows (no Recharts)',
}

// Spell out how Chart joins the TWO A2UI messages (layout + data) via the
// {path} binding and feeds the resolved array into Recharts. Returns null when the
// chunk carries no chart (e.g. a createSurface-only chunk).
export function A2UIChart_chartTraceDetail(chunk: unknown[]): string | null {
    let plotType: string | undefined
    let binding: string | undefined          // the {path} the component declares for series
    let series: Record<string, unknown> | undefined
    for (const raw of chunk) {
        const m = raw as Record<string, unknown>
        const uc = m.updateComponents as { components?: Array<Record<string, unknown>> } | undefined
        const chart = uc?.components?.find((c) => c.component === 'A2UI_Chart')
        if (chart) {
            plotType = chart.plotType as string | undefined
            binding = (chart.series as { path?: string } | undefined)?.path
        }
        const udm = m.updateDataModel as { value?: { series?: Record<string, unknown> } } | undefined
        if (udm?.value?.series) series = udm.value.series
    }
    if (!plotType) return null
    const path = binding ?? '/series'
    const key = series ? (['items', 'points', 'rows'] as const).find((k) => Array.isArray(series![k])) : undefined
    const arr = (key && series ? series[key] : []) as unknown[]
    // A real sample of the resolved array (first 2), so it's visibly the SQL values, not prose.
    const sample = arr.slice(0, 2).map((v) => JSON.stringify(v)).join(', ')
    const more = arr.length > 2 ? `, … +${arr.length - 2}` : ''
    const resolved = key
        ? `props.series.${key} = [${sample}${more}]   (${arr.length} ${key}, resolved from the data model)`
        : `props.series = ${JSON.stringify(series)}`
    const recharts = A2UIChart_RECHARTS[plotType] ?? '(data-table fallback)'
    return [
        `Chart is the integration point — it joins the 2 A2UI messages into one chart:`,
        `  from updateComponents → props.plotType=${plotType}, props.series={path:"${path}"}  (a BINDING, holds NO data)`,
        `  from updateDataModel  → ${path} = {${key ?? 'value'}${arr.length ? ` × ${arr.length}` : ''}}`,
        `  processor resolves "${path}" → ${resolved}`,
        `  Chart feeds that array → Recharts ${recharts}`,
    ].join('\n')
}
