# A2UI-Chart — open-source positioning & launch doc

Source to extract from: `C:\dev\voa\A4UI_Package` (internal codename "A4UI").
Target: a public GitHub repo under the user's own scope (`@haystackedai`), Apache-2.0.

---

## 1. Name & one-liner

**Project name:** `A2UI-Chart`

**Tagline:** *The charting layer the A2UI protocol doesn't ship — agent-driven charts where the model never touches your data.*

Why this name:
- A2UI (Google's open server-driven-UI standard) deliberately ships only basic components (Card, Button, TextField). **Charts are not built in.** `A2UI-Chart` names exactly that gap.
- Rides a real, searchable standard (A2UI is at v0.9.1, v1.0 candidate, ~16.7k stars). Anyone searching "a2ui chart" lands here.
- Honest about scope: an *extension of* A2UI, not a fork or reinvention.

**Unofficial/community disclaimer (put this near the top of the README):**
> A2UI-Chart is an **unofficial, community** charting catalog + agent producer built on the [A2UI protocol](https://a2ui.org). It is not affiliated with or endorsed by Google or the A2UI maintainers.

This one line removes any "looks like `@a2ui/*` official scope" ambiguity — reads as confident, not defensive.

---

## 2. The pitch (what makes it worth open-sourcing)

Three differentiators, in priority order. Lead with #1 and #2 everywhere.

1. **Symmetry — two insertion points per side.** One React hook (`useChart`) + one view component on the frontend; one `Chart` producer object on the agent. Both **hide the entire A2UI message loop** (MessageProcessor, catalog merge, surface mirroring, transport, drill wiring). You keep your own page shell and your own Bedrock/AgentCore/Strands/LangGraph/whatever agent — you add charts in ~2 lines each side.

2. **"Data-outside" safety.** The LLM composes the surface, picks the chart type, and names column *roles* — **from the question and column names only. It never sees or emits the numbers.** Code binds the real rows into `updateDataModel` via A2UI `{path}` bindings. For an AI-charting tool this is *the* trust story: the model cannot silently corrupt a figure, because the model never had the figure.

3. **Contract-injected, versioned, drift-gated.** The chart catalog isn't baked into the package — the **host injects it** (`catalogId` + control/datashape schemas). A byte-equality version handshake between frontend and agent disables chart input on skew. "Production-grade, not a demo."

Headline to use: **"Agent-driven charts where the model never touches your data."**

---

## 3. What ships (the package pair)

Extract from `A4UI_Package/`. Rename on the way out — drop the internal `@swel` scope and the `A4`/`a4ui` codename.

| In repo now | Public name (proposed) | What it is |
|---|---|---|
| `A4UI_Package/A4React` (`@swel/a4react`) | `@haystackedai/a2ui-chart-react` (npm) | The whole A2UI chart runtime as `useChart` hook + `ChartView` component. Contract injected by host. Peer-deps `@a2ui/*`, recharts, zod. |
| `A4UI_Package/A4Agent` (`a4ui-agent`) | `a2ui-chart-agent` (pip) | Chart *producer*: `Chart(rows, columns, answer) → validated A2UI surface messages`, plus `.rechart()`, `.drill_prompt()`, `.version()`. Deps only `a2ui-core` + `pydantic`. |

Both are already BUILT and working against the live app; the open-source job is **extraction + rename + public packaging**, not new feature work ("tech is done").

---

## 4. Quickstart to put in the README

**Frontend (React):**
```tsx
import { useChart, ChartView } from "@haystackedai/a2ui-chart-react";

const { surfaces, send, drill, loading } = useChart({
  catalogId, controlSchema, datashapeSchema,   // host injects the contract
  endpoint: "/api/chart",
});
return <ChartView surfaces={surfaces} drill={drill} />;
```

**Agent (Python):**
```python
from a2ui_chart_agent import Chart, a2ui_frame

chart = Chart(contract=REAL_CONTRACT)           # host injects the contract
rows, columns, answer = run_your_agent(question)  # your logic, unchanged
for frame in a2ui_frame(chart.surface(rows, columns, answer)):
    yield frame
```

That side-by-side symmetry **is** the money diagram for both the README and LinkedIn.

---

## 5. The contract model (explain it, it's the credential)

- One source of truth: two JSON Schemas — `chart.control.json` (allowed `plotType`: scatter/bar/column/line/area/pie/donut/KPI_CARD/table) and `chart.datashape.json`.
- Generators fan it out to both ends (zod for the frontend, Pydantic for the agent).
- Each carries a `version` + `catalogId`; the frontend handshakes on mount and **disables chart input on byte-mismatch**.
- The package ships a **MOCK default contract** on purpose (`regen-before-deploy`) — the host overrides it via `Chart(contract=...)` / `useChart({...})`. Document this clearly so adopters don't ship the mock.

> For the OSS repo, include a tiny example contract + the generator so adopters can define their own chart vocabulary. The single-source codegen (`A2UI_catalog_src/`) is a strong thing to show but may stay as an "example tooling" folder rather than a published package.

---

## 6. Extraction checklist (A4UI_Package → public repo)

- [ ] New public repo, Apache-2.0 (match A2UI's license).
- [ ] Rename npm pkg `@swel/a4react` → `@haystackedai/a2ui-chart-react`; drop `.npmrc`/`publishConfig` pointing at Sanofi JFrog.
- [ ] Rename pip pkg `a4ui-agent` → `a2ui-chart-agent`; drop the `[[tool.uv.index]]` Artifactory source.
- [ ] Purge all Sanofi-internal references: ARNs, `voa.sanofi.com` catalogId, `rnd_pulseai_*`, ALB hostnames, internal infra. Replace the baked catalogId with a neutral example (e.g. `https://example.com/a2ui/catalogs/demo/v1/catalog.json`).
- [ ] Fix the stale `A4Agent/instruction_agent.md` (documents an old `make_a4ui_agent()` API that doesn't match the shipped `Chart` exports) — delete or rewrite to match the README.
- [ ] Add a minimal runnable demo (a tiny agent + a tiny React page) so the repo is a working example, not just two libraries.
- [ ] README with: disclaimer, pitch (§2), quickstart (§4), contract model (§5), roadmap (§7).
- [ ] CONTRIBUTING + a clear "how to define your own catalog" guide.

---

## 7. Roadmap to show (signals it's alive, not abandoned)

- **Track A2UI v1.0.** Its new `actionResponse` RPC + action IDs will retire the custom `DrillContext` bridge that currently works around @a2ui/react 0.12 being unable to dispatch actions from a custom component. "Drill-down gets simpler when v1.0 lands" is a good public note.
- **Eval harness** for chart-type / role selection (the honest biggest gap).
- **Semantic data-profiler** — upgrade the LLM's input from bare column names → chart-ready roles, so the chart choice is right every time.
- More renderers beyond Recharts (the renderer is pluggable).

---

## 8. Honest scope note for the repo

State plainly that this came out of a real internal analytics app (text-to-SQL → chart), so the design is battle-shaped, but the OSS release is the *reusable* core with the contract injectable. Don't overclaim "production-proven at scale" — it's a working, well-designed extraction. The data-outside property and the symmetry are the genuine, defensible contributions.
