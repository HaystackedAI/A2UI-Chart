"""Chart/surface producer — turns (rows, columns, answer) into A2UI wire messages.

This is the heart of what the package hides. Two paths:

PRIMARY (model set): LLM composes the surface STRUCTURE + picks plotType + column roles
from the question + COLUMN NAMES only (never the rows); then CODE fills updateDataModel
(series from the real rows, note from the answer) behind the {path} bindings. The model
never sees a data value, so the dev's numbers reach the chart unaltered.

DETERMINISTIC (no model): pick_and_shape() + build_surface() build a surface with no LLM
— the zero-config default so install → chart.
"""
from __future__ import annotations

import re

from .catalog import BuiltCatalog

# Chart types offered as a toggle row under the chart. All share the same label/value
# series, so switching is layout-only (rechart action → updateComponents, same /series).
# v0.9 Button uses `child` (a Text node) for its label + action.event.{name,context}.
DEFAULT_CHART_TYPE_BUTTONS = [
    ("donut", "Donut"), ("pie", "Pie"), ("bar", "Bar"), ("column", "Column"), ("table", "Table"),
]

_SURFACE_ID = "A2UI_dev"


# ── pure data helpers (plotType vocabulary is the standard chart set) ──────────────
def format_answer(text: str) -> str:
    """Normalize prose into clean, renderable markdown: blank line around a
    '**... Insights:**' header and each spaced-hyphen bullet on its own line."""
    if not text:
        return text
    t = text.strip()
    t = re.sub(r"\s*\*\*([^*]*Insights[^*]*)\*\*\s*", r"\n\n**\1**\n\n", t, flags=re.I)
    t = re.sub(r"[ \t]+-[ \t]+", "\n- ", t)
    return t.strip()


def _col(columns: list, name) -> str | None:
    """Case-insensitive column match (SQL engines often upper-case)."""
    if name:
        for c in columns:
            if str(c).lower() == str(name).lower():
                return c
    return None


def build_series(intent: dict, dataset: dict):
    """Build the chart series from the chosen plotType + column roles + the REAL rows.
    Every value is copied straight from dataset['rows'] — never recomputed. Returns
    (plot_type, series); may fall back to 'table' if the roles don't resolve."""
    cols = dataset.get("columns") or []
    rows = dataset.get("rows") or []
    pt = intent.get("plotType")
    if pt == "table":
        return "table", {"columns": cols, "rows": rows[:50]}
    if pt in ("line", "area"):
        xc = _col(cols, intent.get("x_column")) or _col(cols, intent.get("label_column"))
        vc = _col(cols, intent.get("value_column"))
        if xc and vc:
            return pt, {"items": [{"label": str(r.get(xc)), "value": r.get(vc)} for r in rows[:100]]}
    if pt in ("pie", "donut"):
        lc, vc = _col(cols, intent.get("label_column")), _col(cols, intent.get("value_column"))
        if lc and vc:
            return pt, {"items": [{"label": str(r.get(lc)), "value": r.get(vc)} for r in rows[:12]]}
    if pt == "column":
        lc, vc = _col(cols, intent.get("label_column")), _col(cols, intent.get("value_column"))
        if lc and vc:
            return "column", {"items": [{"label": str(r.get(lc)), "value": r.get(vc)} for r in rows[:100]]}
    if pt == "KPI_CARD":
        vc = _col(cols, intent.get("value_column")) or (cols[0] if cols else None)
        return "KPI_CARD", {"value": rows[0].get(vc) if rows and vc else None}
    if pt == "scatter":
        xc, yc = _col(cols, intent.get("x_column")), _col(cols, intent.get("y_column"))
        if xc and yc:
            return "scatter", {"points": [{"x": r.get(xc), "y": r.get(yc)} for r in rows[:150]]}
    lc, vc = _col(cols, intent.get("label_column")), _col(cols, intent.get("value_column"))
    if not (lc and vc):
        return "table", {"columns": cols, "rows": rows[:50]}   # honest fallback: show rows, don't fake a bar
    return "bar", {"items": [{"label": str(r.get(lc)), "value": r.get(vc)} for r in rows[:100]]}


def pick_and_shape(dataset: dict):
    """Infer a chart type + series from column shapes (no LLM, no roles)."""
    cols = dataset.get("columns") or []
    rows = dataset.get("rows") or []
    isnum = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    nums = [c for c in cols if any(isnum(r.get(c)) for r in rows)]
    cats = [c for c in cols if c not in nums]
    if len(rows) == 1 and nums:                                   # single_value → KPI
        return "KPI_CARD", {"value": rows[0].get(nums[0])}
    if len(nums) >= 2 and not cats:                               # xy_point → scatter
        x, y = nums[0], nums[1]
        return "scatter", {"points": [{"x": r.get(x), "y": r.get(y)} for r in rows[:150]]}
    val = nums[0] if nums else (cols[1] if len(cols) > 1 else (cols[0] if cols else None))  # label_value → bar
    lab = next((c for c in cols if c != val), (cols[0] if cols else None))
    items = [{"label": str(r.get(lab)), "value": r.get(val)} for r in rows[:100]] if (lab and val) else []
    return "bar", {"items": items}


class SurfaceEngine:
    """Builds + validates A2UI surfaces for one Contract. Holds the catalog_id, the
    validator and the series model so the surface functions stay contract-bound."""

    def __init__(self, built: BuiltCatalog, *, model=None, agent_name="a2ui chart",
                 chart_type_buttons=None):
        self._built = built
        self.catalog_id = built.catalog_id
        self.validator = built.validator
        self.series_model = built.series_model
        self.schema_desc = built.schema_desc
        self.model = model
        self.agent_name = agent_name
        self.chart_type_buttons = chart_type_buttons or DEFAULT_CHART_TYPE_BUTTONS

    # ── surface structure ─────────────────────────────────────────────────────────
    def _button_row(self):
        ids, nodes = [], []
        for pt, label in self.chart_type_buttons:
            bid, lid = f"btn_{pt}", f"lbl_{pt}"
            nodes.append({"id": bid, "component": "Button", "child": lid,
                          "action": {"event": {"name": "rechart", "context": {"plotType": pt}}}})
            nodes.append({"id": lid, "component": "Text", "text": label})
            ids.append(bid)
        return ids, nodes

    def _components(self, plot_type: str):
        """Canonical surface tree: chart on top, a toggle Row of chart-type buttons, then the note."""
        btn_ids, btn_nodes = self._button_row()
        return [
            {"id": "root", "component": "Column", "children": ["c", "btns", "n"]},
            {"id": "c", "component": "A2UI_Chart", "plotType": plot_type, "series": {"path": "/series"}},
            {"id": "btns", "component": "Row", "children": btn_ids},
            {"id": "n", "component": "Text", "text": {"path": "/note"}},
            *btn_nodes,
        ]

    def rechart_message(self, plot_type: str) -> dict:
        """Layout-only update for the rechart action: same tree, new plotType, same
        bindings (no createSurface, no data — the client already holds the data model)."""
        return {"version": "v0.9", "updateComponents": {"surfaceId": _SURFACE_ID,
                                                         "components": self._components(plot_type)}}

    def build_surface(self, plot_type: str, series: dict, note: str) -> list[dict]:
        """Assemble the 3-message surface (createSurface + updateComponents + updateDataModel)."""
        return [
            {"version": "v0.9", "createSurface": {"surfaceId": _SURFACE_ID, "catalogId": self.catalog_id}},
            {"version": "v0.9", "updateComponents": {"surfaceId": _SURFACE_ID, "components": self._components(plot_type)}},
            {"version": "v0.9", "updateDataModel": {"surfaceId": _SURFACE_ID, "path": "/",
                                                    "value": {"note": note, "series": series}}},
        ]

    # ── validation guardrail ────────────────────────────────────────────────────
    def _validate_surface(self, messages: list) -> list[str]:
        """Every component on-catalog/valid, and the code-built series matches the
        A2UI_Chart series shape. Returns a per-item description for the trace."""
        checked: list[str] = []
        for msg in messages:
            for comp in (msg.get("updateComponents") or {}).get("components") or []:
                self.validator.validate_component(comp)
                d = f"{comp.get('component')}#{comp.get('id')}"
                if comp.get("component") == "A2UI_Chart":
                    d += f"(plotType={comp.get('plotType')!r})"
                checked.append(d)
            series = ((msg.get("updateDataModel") or {}).get("value") or {}).get("series")
            if series is not None:
                self.series_model.model_validate(series)
                shape = next((f"{k}×{len(series[k])}" for k in ("items", "points", "rows")
                              if series.get(k) is not None), "value")
                checked.append(f"series:{shape}")
        return checked
