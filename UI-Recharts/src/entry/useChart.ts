// useA2UIChart — the WHOLE A2UI chart runtime, packaged.
//
// MessageProcessor,
// wires a transport, mirrors surfaces, routes drill actions. The host calls useA2UIChart({ catalogId, controlSchema, datashapeSchema })
// and gets back { surfaces, send, drill, trace, usage, … }.
//
// The contract (catalogId + the two schemas) is still INJECTED, not baked: the
// real agent/A2UI package is a separate deliverable, and this frontend package
// must compose with that future contract rather than freeze today's dev surface.

import { useCallback, useEffect, useRef, useState } from 'react'
import { basicCatalog, type ReactComponentImplementation } from '@a2ui/react/v0_9'
import { MessageProcessor, type A2uiMessage } from '@a2ui/web_core/v0_9'
import type { z } from 'zod'

import { A2UIChart_makeCatalog } from '../render/catalog.js'
import { A2UIChart_Client, A2UIChart_DEFAULT_ENDPOINT, type A2UIChartTransport } from '../transport/client.js'
import { A2UIChart_chartTraceDetail, type A2UIChartTraceEntry } from './_trace.js'

// The surface type the processor emits (SurfaceModel<…>), derived from its own
// onSurfaceCreated signature so we need no extra import and stay in lockstep.
export type A2UIChartSurface = Parameters<Parameters<MessageProcessor<ReactComponentImplementation>['onSurfaceCreated']>[0]>[0]

export interface UseA2UIChartOptions {
    catalogId: string
    controlSchema: z.ZodObject<any>
    datashapeSchema: z.ZodTypeAny
    name?: string                 // component type the agent emits (default 'A2UI_Chart')
    endpoint?: string             // transport URL (default '/api/v1/a2ui')
    transport?: A2UIChartTransport       // or inject your own transport entirely
}

export interface UseA2UIChartResult {
    surfaces: A2UIChartSurface[]
    loading: boolean
    sending: boolean
    submitted: string
    trace: A2UIChartTraceEntry[]
    usage: unknown
    send: (text: string) => Promise<void>
    drill: (value: string) => void
}

export function useA2UIChart(opts: UseA2UIChartOptions): UseA2UIChartResult {
    const [surfaces, setSurfaces] = useState<A2UIChartSurface[]>([])
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [submitted, setSubmitted] = useState('')

    // Build the catalog + transport ONCE (static per the contract). Lazy initial
    // state keeps the reference stable for the hook's lifetime.
    const [catalog] = useState(() => A2UIChart_makeCatalog({
        catalogId: opts.catalogId,
        controlSchema: opts.controlSchema,
        datashapeSchema: opts.datashapeSchema,
        name: opts.name,
    }))
    const [client] = useState<A2UIChartTransport>(() => opts.transport ?? new A2UIChart_Client(opts.endpoint ?? A2UIChart_DEFAULT_ENDPOINT))
    const endpointLabel = opts.endpoint ?? A2UIChart_DEFAULT_ENDPOINT

    // --- Flow trace. The hook OWNS tracing: one entry per real step, so a host
    // panel is pure display. ---
    const [trace, setTrace] = useState<A2UIChartTraceEntry[]>([])
    const [usage, setUsage] = useState<unknown>(null)
    const log = useCallback((actor: string, action: string, detail?: string) => {
        setTrace((prev) => [...prev, { seq: prev.length + 1, ts: Date.now(), t: new Date().toLocaleTimeString(), actor, action, detail }])
    }, [])

    // Backend flow trace + token usage from the gateway/agent (meta side-channel).
    const handleMeta = useCallback((meta: unknown) => {
        const m = meta as { trace?: { ts: number; actor: string; action: string; detail?: string }[]; usage?: unknown }
        if (m.trace && m.trace.length) {
            setTrace((prev) => [
                ...prev,
                ...m.trace!.map((e, i) => ({ seq: prev.length + 1 + i, ts: e.ts, t: new Date(e.ts).toLocaleTimeString(), actor: e.actor, action: e.action, detail: e.detail })),
            ])
        }
        setUsage(m.usage ?? null)
    }, [])

    // The processor is created in an effect (NOT during render) and held in a ref.
    // Building it in an effect keeps us clear of the React Compiler rules that forbid
    // reading a ref during render. It MUST be a single instance for the page lifetime.
    const processorRef = useRef<MessageProcessor<ReactComponentImplementation> | null>(null)

    // Outbound action channel: a Button in a surface fires the processor's action
    // callback → actionRef.current → the latest sendAction. The ref breaks the
    // processor↔sendAction cycle and is only read at event time.
    const actionRef = useRef<(action: unknown) => void>(() => {})

    useEffect(() => {
        const processor = new MessageProcessor<ReactComponentImplementation>(
            [basicCatalog, catalog],
            (action) => actionRef.current(action),
        )
        processorRef.current = processor
        const s1 = processor.onSurfaceCreated((surface) => {
            log('processor → onSurfaceCreated', 'surface created → add to React state', surface.id)
            setSurfaces((prev) => (prev.some((s) => s.id === surface.id) ? prev : [...prev, surface]))
        })
        const s2 = processor.onSurfaceDeleted((id) => {
            log('processor → onSurfaceDeleted', 'surface deleted → remove from React state', id)
            setSurfaces((prev) => prev.filter((s) => s.id !== id))
        })
        return () => { s1.unsubscribe(); s2.unsubscribe(); processorRef.current = null } // StrictMode-safe
    }, [catalog, log])

    // Feed a batch of A2UI messages into the processor → render. A createSurface for
    // an id that already exists (a drill's fresh data turn) replaces the old surface:
    // delete first so the tree remounts. A layout-only rechart has no createSurface,
    // so it updates the existing surface in place.
    const handleChunk = useCallback((chunk: A2uiMessage[]) => {
        const processor = processorRef.current
        if (!processor) return
        const types = (chunk as Record<string, unknown>[]).map((m) => ['createSurface', 'updateComponents', 'updateDataModel'].find((k) => k in m) ?? 'message')
        log('A2UIChart_client → onChunk', 'processor.processMessages(chunk)', `${chunk.length} msg(s): ${types.join(' + ')}`)
        for (const m of chunk as Record<string, unknown>[]) {
            const sid = (m.createSurface as { surfaceId?: string } | undefined)?.surfaceId
            if (sid && processor.model.surfacesMap.has(sid)) processor.model.deleteSurface(sid)
        }
        processor.processMessages(chunk)
        const chartDetail = A2UIChart_chartTraceDetail(chunk)
        if (chartDetail) log('Chart (package catalog)', 'bind layout + data → render final chart via Recharts', chartDetail)
    }, [log])

    // Run a query: clear the old surface NOW (surfaceId is constant, so the dedupe
    // could otherwise keep it), then stream the new one in.
    const send = useCallback(async (text: string) => {
        const q = text.trim()
        if (!q) return
        const processor = processorRef.current
        setLoading(true)
        setSubmitted(q)
        setSurfaces([])
        setTrace([])
        setUsage(null)
        if (processor) Array.from(processor.model.surfacesMap.keys()).forEach((id) => processor.model.deleteSurface(id))
        try {
            log('useA2UIChart.send', 'clear surfaces → client.send(text)', q)
            log('A2UIChart_client → gateway', 'POST', endpointLabel) // boundary: leaves the browser
            await client.send(q, handleChunk, handleMeta)
        } catch (err) {
            log('useA2UIChart.send', 'ERROR', String(err))
        } finally {
            setLoading(false)
        }
    }, [client, handleChunk, handleMeta, log, endpointLabel])

    // Outbound: POST a Button action to the gateway, feed the returned surface back
    // through the same handler. No surface clear — a rechart is layout-only, the data
    // model stays, so the chart re-renders with the new plotType over the same data.
    const sendingRef = useRef(false)
    const sendAction = useCallback(async (rawAction: unknown) => {
        if (sendingRef.current) return // debounce clicks while a turn is in flight
        const ev = (rawAction as { event?: { name?: string; context?: unknown } })?.event ?? (rawAction as { name?: string; context?: unknown })
        const action = { name: ev?.name, context: ev?.context ?? {} }
        sendingRef.current = true; setSending(true)
        log('useA2UIChart.sendAction → gateway', 'POST {action} (layout re-emit)', JSON.stringify(action))
        try {
            log('A2UIChart_client → gateway', 'POST', endpointLabel) // boundary: leaves the browser
            await client.send(JSON.stringify({ action }), handleChunk, handleMeta)
        } catch (err) {
            log('useA2UIChart.sendAction', 'ERROR', String(err))
        } finally {
            sendingRef.current = false; setSending(false)
        }
    }, [client, handleChunk, handleMeta, log, endpointLabel])

    useEffect(() => { actionRef.current = sendAction }, [sendAction])

    // Drill (Rung 2): a slice/bar click → scoped new query. Carries the clicked value
    // plus the original question (so the agent needs no session memory).
    const drill = useCallback((value: string) => {
        sendAction({ event: { name: 'drill', context: { value, question: submitted } } })
    }, [sendAction, submitted])

    return { surfaces, loading, sending, submitted, send, drill, trace, usage }
}
