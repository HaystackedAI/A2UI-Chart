import type { A2uiMessage, A2uiClientMessage } from '@a2ui/web_core/v0_9'

// The transport the package ships so the host does NOT write one. Browser-side
// fetch + SSE parse: turns a POST into a stream of A2UI messages, calling onChunk
// per SSE event so the renderer draws as data arrives. Knows nothing about charts
// or the processor — pure plumbing. The host only picks the endpoint URL.

export const A2UIChart_DEFAULT_ENDPOINT = '/api/v1/a2ui'

// What useA2UIChart needs from a transport — swap in your own (WebSocket, mock, …)
// by passing { transport } as long as it matches this shape.
export interface A2UIChartTransport {
    send(
        message: A2uiClientMessage | string,
        onChunk?: (messages: A2uiMessage[]) => void,
        onMeta?: (meta: unknown) => void,
    ): Promise<A2uiMessage[]>
}

// One "part" of an A2A streamed message. We only care about kind:'data'
// (an A2UI message) and kind:'error'. 'text' parts are ignored here.
interface A2UIChart_Part {
    kind: 'data' | 'text' | 'error'
    data?: Record<string, unknown>
    text?: string
    mimeType?: string
}

export class A2UIChart_Client implements A2UIChartTransport {
    constructor(private readonly endpoint: string = A2UIChart_DEFAULT_ENDPOINT) {}

    async send(
        message: A2uiClientMessage | string,
        onChunk?: (messages: A2uiMessage[]) => void,
        onMeta?: (meta: unknown) => void,
    ): Promise<A2uiMessage[]> {
        const body = typeof message === 'string' ? message : JSON.stringify(message)

        const response = await fetch(this.endpoint, { method: 'POST', body })

        // A proxy/error page is often HTML, not JSON — surface it clearly instead
        // of a confusing parse error below.
        if (!response.ok && !response.headers.get('Content-Type')?.includes('application/json')) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('Content-Type')
        const allMessages: A2uiMessage[] = []
        const seenSurfaceIds = new Set<string>()

        if (contentType?.includes('text/event-stream')) {
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })

                    // Split on blank lines (SSE event boundary); keep the last
                    // partial event in the buffer for the next read.
                    const lines = buffer.split(/\r?\n\r?\n/)
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue
                        try {
                            const parts = JSON.parse(line.slice(6)) as A2UIChart_Part[]
                            const chunkMessages: A2uiMessage[] = []
                            for (const part of parts) {
                                if (part.kind === 'error') throw new Error(part.text)
                                if (part.kind === 'data' && part.data) {
                                    // Side-channel meta (backend trace + token usage) — not an A2UI message.
                                    if ((part.data as { voa_meta?: unknown }).voa_meta !== undefined) {
                                        onMeta?.((part.data as { voa_meta: unknown }).voa_meta)
                                        continue
                                    }
                                    const uiMessage = part.data as unknown as A2uiMessage
                                    const createSurface = (uiMessage as { createSurface?: { surfaceId: string } }).createSurface
                                    if (createSurface) {
                                        if (seenSurfaceIds.has(createSurface.surfaceId)) continue
                                        seenSurfaceIds.add(createSurface.surfaceId)
                                    }
                                    chunkMessages.push(uiMessage)
                                }
                            }
                            if (chunkMessages.length > 0) {
                                allMessages.push(...chunkMessages)
                                onChunk?.(chunkMessages)
                            }
                        } catch (e) {
                            console.error('Error processing SSE chunk:', e)
                        }
                    }
                }
            }
        } else {
            // Non-streaming fallback: a plain JSON array of parts.
            const data = await response.json()
            if (data.error) throw new Error(data.error)
            for (const part of data as A2UIChart_Part[]) {
                if (part.kind === 'data' && part.data) {
                    allMessages.push(part.data as unknown as A2uiMessage)
                }
            }
        }

        return allMessages
    }
}
