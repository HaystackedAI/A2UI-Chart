# a2ui-chart-strands

Agent-side **A2UI chart producer** for [`@haystackedai/a2ui-chart-react`](../UI-Recharts) clients.

This package does **not** wrap your runtime — bedrock, agentcore, strands and your own
business logic stay yours. It packages the one reusable, hard part: the A2UI **chart**
(richer than a hand-rolled one, validated against the shared catalog). You keep your agent
and add a few lines where you already build the response — mirroring how a React dev drops
in `useA2UIChart` + `A2UIChartView` without wrapping their server.

```python
from a2ui_chart_strands import Chart, a2ui_frame, version_frame

chart = Chart()                                   # once (baked contract)

# in your existing entrypoint, where YOUR pipeline already produced the data:
rows, columns, answer = my_pipeline(prompt)       # your biz logic, untouched
yield a2ui_frame(chart.surface(rows, columns, answer))

# the UI's chart-type toggle:
if action and action["name"] == "rechart":
    yield a2ui_frame(chart.rechart(action["context"]["plotType"]))

# the contract-version handshake the client fires on mount:
if action and action["name"] == "version":
    yield version_frame(chart.version())
```

No `a2ui-core` wiring, catalog assembly, surface-message building or validation to write.
Dependencies are only `a2ui-core` + `pydantic` — nothing about your runtime.

## The contract

The contract — `catalogId` + the `plotType` vocabulary + the series shape + the version —
is the one thing this agent and the React client **must byte-match**. It is **not** fetched
from the client at runtime; both sides are generated independently from a single source
(`A2UI_catalog_src/*.json`) by a generator you run **before every deploy**.

The package ships a `DEFAULT_CONTRACT` baked from the `contract/` modules, so `pip install`
→ `Chart()` just works for a smoke test. The shipped versions are deliberate **mock
placeholders** (`MOCK.*.regen-before-deploy`) — your pre-deploy generator overwrites them
with the real, matching versions in both the client and this agent. Deploy without
regenerating and the client's handshake fails loudly (chart input disabled) by design.

A deployment with its own catalog overrides everything via a custom `Contract`:

```python
from a2ui_chart_strands import Chart, Contract
chart = Chart(contract=Contract(catalog_id=..., control_model=..., datashape_model=...,
                                control_version=..., datashape_version=...))
```

## Layout (separation of concerns)

Grouped to mirror the React client (`entry` / `render` / `transport`), plus a first-class
`contract` concern (the agent *bakes* a default; the client injects one):

```
src/a2ui_chart_strands/
  __init__.py          public surface (barrel)
  entry/    chart.py        the Chart drop-in
  render/   catalog.py · surface.py · drill.py    catalog build, series shaping + validation, drill prompt
  transport/frames.py       a2ui / version / trace wire frames the gateway forwards
  contract/ __init__.py + chart_control.py · chart_datashape.py · contract_version.py   the baked, overridable default
```

Each concern's module docstring is the detailed guide; `entry/chart.py` documents the two
insertion points and the drill/rechart/version handling.
