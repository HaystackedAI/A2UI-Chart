# A2UI-Chart

**The charting layer the [A2UI protocol](https://a2ui.org) doesn't ship — agent-driven charts where the model never touches your data.**

> A2UI-Chart is an **unofficial, community** charting catalog + agent producer built on the A2UI protocol. It is not affiliated with or endorsed by Google or the A2UI maintainers.

Licensed under MIT.

---

## Why

A2UI is an open standard that lets AI agents "speak UI" — agents emit declarative component descriptions, and clients render them with native widgets from a trusted catalog. By design, A2UI ships only basic components (Card, Button, TextField). **Charts are left to the ecosystem.**

A2UI-Chart fills that gap, and adds a safety property most AI-charting tools miss.

## How it works: data-outside

The LLM never touches your data.

The model composes the chart surface, picks the chart type, and names the column *roles* — **from the question and the column names only.** It never sees or emits the actual numbers. Code binds the real rows into the chart via A2UI's data model (`updateDataModel` + `{path}` bindings).

The model literally cannot corrupt a figure, because it never held the figure.

## Built for Strands, not ADK

Google's official A2UI agent samples run a Gemini-powered **ADK** agent, and the agent-side helper packages (`a2ui-agent-sdk`, `a2ui-adk`) are built around Google's Agent Development Kit. That path doesn't drop into a Strands agent on AWS Bedrock / AgentCore.

`a2ui-chart-agent` builds directly on the **framework-agnostic `a2ui-core`** (Pydantic only — no ADK, no Gemini, no second agent framework). It plugs into a Strands agent and emits A2UI chart surfaces from your own LLM calls. The A2UI protocol core already allows this; A2UI-Chart is the ready-made, ADK-free chart producer that makes it two lines.

## Two insertion points per side

A2UI-Chart ships as a symmetric pair that hides the entire A2UI message loop — MessageProcessor, catalog merge, surface mirroring, transport, and drill wiring. You keep your own page shell and your own agent (Bedrock / AgentCore / Strands / LangGraph / anything).

| Package | Where | What it gives you |
|---|---|---|
| `@haystackedai/a2ui-chart-react` (npm) | Frontend | One hook (`useChart`) + one view (`ChartView`) |
| `a2ui-chart-agent` (pip) | Agent | One `Chart` producer: `(rows, columns, answer) → validated A2UI surface messages`. Built on framework-agnostic `a2ui-core` (no ADK) — drops into Strands. |

## Install

```bash
# frontend
npm install @haystackedai/a2ui-chart-react

# agent
pip install a2ui-chart-agent
```

## Quickstart

**Frontend (React):**
```tsx
import { useChart, ChartView } from "@haystackedai/a2ui-chart-react";

const { surfaces, send, drill, loading } = useChart({
  catalogId, controlSchema, datashapeSchema,   // inject your contract
  endpoint: "/api/chart",
});

return <ChartView surfaces={surfaces} drill={drill} />;
```

**Agent (Python):**
```python
from a2ui_chart_agent import Chart, a2ui_frame

chart = Chart(contract=REAL_CONTRACT)              # inject your contract
rows, columns, answer = run_your_agent(question)   # your logic, unchanged

for frame in a2ui_frame(chart.surface(rows, columns, answer)):
    yield frame
```

## The contract

The chart catalog is injected by the host, not baked into the package.

- **One source of truth:** two JSON Schemas — `chart.control.json` (the allowed `plotType` vocabulary) and `chart.datashape.json` (the series shape).
- **Generated both ways:** zod schemas for the frontend, Pydantic models for the agent.
- **Drift-gated:** each side carries a `version` + `catalogId`. The frontend handshakes on mount and disables chart input on byte-mismatch, so a frontend and an agent can never silently diverge.

The package ships a mock default contract — override it (`Chart(contract=...)` / `useChart({...})`) with your own catalog before deploying.

## Chart types

`scatter`, `bar`, `column`, `line`, `area`, `pie`, `donut`, `KPI_CARD`, `table`.

The renderer is pluggable; the reference implementation uses Recharts.

## Interaction

- **Re-chart** — switch chart type over the cached series with no new query (layout-only re-emit).
- **Drill-down** — click a slice to trigger a scoped follow-up query and swap the surface in place.

## Roadmap

- Track A2UI v1.0 (`actionResponse` RPC + action IDs) to simplify the drill-down path.
- Eval harness for chart-type / role selection.
- Semantic data-profiler: upgrade the model's input from bare column names to chart-ready roles.
- Additional renderers beyond Recharts.

## License

MIT.
