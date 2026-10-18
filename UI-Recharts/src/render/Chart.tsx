import { z } from 'zod'
import { useContext } from 'react'
import { A2UIChart_DrillContext } from './drill.js'
import { createComponentImplementation } from '@a2ui/react/v0_9'
import { DynamicStringSchema, DataBindingSchema } from '@a2ui/web_core/v0_9'
import {
    ScatterChart, Scatter, BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// This package carries NO contract. The control/datashape schemas are the HOST's
// (generated from that project's own catalog JSON) and are INJECTED via A2UIChart_makeChart.
// One published package serves many projects, each with its own PO-editable catalog.

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// Dark-theme tokens, matched to the host (css/App.css palette).
const A2UIChart_ACCENT = '#2eb88a'
const A2UIChart_AXIS = '#7a7a84'
const A2UIChart_GRID = '#2a2a44'
const A2UIChart_TOOLTIP = { background: '#16162a', border: '1px solid #2a2a44', borderRadius: 8, color: '#e0e0e0' }
const A2UIChart_PALETTE = ['#2eb88a', '#f5a623', '#f44336', '#2196f3', '#9c27b0', '#ff9800', '#00bcd4', '#8bc34a']
const A2UIChart_MARGIN = { top: 8, right: 16, bottom: 24, left: 8 }

// The render — generic over whatever plotType the injected contract allows. bar =
// horizontal bars; column = vertical; area = filled line; donut = pie with a hole.
// bar/column/line/area/pie/donut share {items}; scatter uses {points}.
function A2UIChart_renderChart({ props }: { props: any }) {
    const s = props.series as { points?: { x: number; y: number }[]; items?: { label: string; value: number }[]; value?: number | string; columns?: string[]; rows?: Record<string, unknown>[] } | undefined
    const items = (s?.items ?? []).map((d) => ({ label: d.label, value: num(d.value) }))
    const points = (s?.points ?? []).map((p) => ({ x: num(p.x), y: num(p.y) }))

    // Drill: clicking a slice/bar asks the agent for that category's breakdown.
    // Bridged via our own context since @a2ui/react 0.12 can't dispatch from a custom component.
    const drill = useContext(A2UIChart_DrillContext)
    const onSlice = (d: any) => { const l = d?.payload?.label ?? d?.label ?? d?.name; if (l != null) drill(String(l)) }

    const chart = () => {
        switch (props.plotType) {
            case 'bar':
                return (
                    <BarChart data={items} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke={A2UIChart_GRID} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} width={130} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={A2UIChart_TOOLTIP} />
                        <Bar dataKey="value" fill={A2UIChart_ACCENT} radius={[0, 4, 4, 0]} onClick={onSlice} style={{ cursor: 'pointer' }} />
                    </BarChart>
                )
            case 'column':
                return (
                    <BarChart data={items} margin={A2UIChart_MARGIN}>
                        <CartesianGrid stroke={A2UIChart_GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={A2UIChart_TOOLTIP} />
                        <Bar dataKey="value" fill={A2UIChart_ACCENT} radius={[4, 4, 0, 0]} onClick={onSlice} style={{ cursor: 'pointer' }} />
                    </BarChart>
                )
            case 'line':
                return (
                    <LineChart data={items} margin={A2UIChart_MARGIN}>
                        <CartesianGrid stroke={A2UIChart_GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <Tooltip contentStyle={A2UIChart_TOOLTIP} />
                        <Line type="monotone" dataKey="value" stroke={A2UIChart_ACCENT} strokeWidth={2} dot={{ r: 3, fill: A2UIChart_ACCENT }} />
                    </LineChart>
                )
            case 'area':
                return (
                    <AreaChart data={items} margin={A2UIChart_MARGIN}>
                        <CartesianGrid stroke={A2UIChart_GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <Tooltip contentStyle={A2UIChart_TOOLTIP} />
                        <Area type="monotone" dataKey="value" stroke={A2UIChart_ACCENT} strokeWidth={2} fill={A2UIChart_ACCENT} fillOpacity={0.2} />
                    </AreaChart>
                )
            case 'pie':
            case 'donut':
                return (
                    <PieChart>
                        <Pie data={items} dataKey="value" nameKey="label" cx="50%" cy="50%"
                             onClick={onSlice} style={{ cursor: 'pointer' }}
                             innerRadius={props.plotType === 'donut' ? 105 : 0} outerRadius={150}>
                            {items.map((_, i) => <Cell key={i} fill={A2UIChart_PALETTE[i % A2UIChart_PALETTE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={A2UIChart_TOOLTIP} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: A2UIChart_AXIS }} />
                    </PieChart>
                )
            default:
                return (
                    <ScatterChart margin={A2UIChart_MARGIN}>
                        <CartesianGrid stroke={A2UIChart_GRID} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <YAxis type="number" dataKey="y" tick={{ fontSize: 12, fill: A2UIChart_AXIS }} stroke={A2UIChart_GRID} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={A2UIChart_TOOLTIP} />
                        <Scatter data={points} fill={A2UIChart_ACCENT} fillOpacity={0.8} />
                    </ScatterChart>
                )
        }
    }

    return (
        <div style={{ padding: 8, background: 'transparent' }}>
            {props.title && <div style={{ fontSize: 13, fontWeight: 600, color: '#cfcfe0', marginBottom: 6 }}>{props.title}</div>}
            {props.plotType === 'KPI_CARD' ? (
                <div style={{ fontSize: '3.5rem', fontWeight: 800, color: A2UIChart_ACCENT, textAlign: 'center', padding: '1rem 0' }}>{String(s?.value ?? '—')}</div>
            ) : props.plotType === 'table' ? (
                <div style={{ maxHeight: 320, overflow: 'auto' }}>
                    <table className="chart-table">
                        <thead>
                            <tr>{(s?.columns ?? Object.keys(s?.rows?.[0] ?? {})).map((c) => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                            {(s?.rows ?? []).map((r, i) => (
                                <tr key={i}>{(s?.columns ?? Object.keys(r)).map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>{chart()}</ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

// Build the chart component implementation from the HOST's injected schemas.
// `name` is the A2UI component type the agent emits (defaults to 'A2UI_Chart').
export function A2UIChart_makeChart(opts: {
    controlSchema: z.ZodObject<any>
    datashapeSchema: z.ZodTypeAny
    name?: string
}) {
    const api = {
        name: opts.name ?? 'A2UI_Chart',
        schema: z.object({
            plotType: opts.controlSchema.shape.plotType,
            title: DynamicStringSchema.optional(),
            series: z.union([opts.datashapeSchema, DataBindingSchema]),
        }).strict(),
    }
    return createComponentImplementation(api, A2UIChart_renderChart)
}
