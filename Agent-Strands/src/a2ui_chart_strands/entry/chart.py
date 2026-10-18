"""Chart — the one thing this package IS: an A2UI chart producer.

The package does NOT wrap your runtime. bedrock / agentcore / strands and your
own business logic stay exactly where they are. You keep your agent; you add a
few lines where you already have the answer data, and you get the A2UI chart
surface — the same chart the React client renders, far richer than a hand-rolled
one, and validated against the shared catalog.

Mirror of the React side: there a dev drops in ``useA2UIChart`` + ``A2UIChartView``
without wrapping their server; here you drop in ``Chart`` without wrapping your
runtime.

    from a2ui_chart_strands import Chart, a2ui_frame

    chart = Chart()                                   # once (baked contract)

    # inside your existing entrypoint, where YOUR pipeline already produced data:
    rows, columns, answer = my_pipeline(prompt)       # your biz logic, untouched
    yield a2ui_frame(chart.surface(rows, columns, answer))

    # chart-type toggle the UI dispatches:
    if action and action["name"] == "rechart":
        yield a2ui_frame(chart.rechart(action["context"]["plotType"]))

No a2ui-core wiring, no catalog assembly, no surface-message dicts, no
validation call — Chart owns all of that. It needs only ``a2ui-core`` + ``pydantic``.
"""
from __future__ import annotations

from ..contract import Contract, DEFAULT_CONTRACT
from ..render import (
    DEFAULT_CHART_TYPE_BUTTONS,
    SurfaceEngine,
    build_catalog,
    build_series,
    format_answer,
    pick_and_shape,
)
from ..render import drill_prompt as _drill_prompt


def _as_dataset(rows, columns, answer) -> dict:
    """Normalize the agent's data into the engine's dataset shape. Columns are
    inferred from the first row when the caller doesn't pass them."""
    rows = list(rows or [])
    if not columns:
        columns = list(rows[0].keys()) if rows and isinstance(rows[0], dict) else []
    return {"rows": rows, "columns": list(columns or []), "answer": answer or ""}


def _infer_roles(dataset: dict) -> dict:
    """Default column roles from the data shape, so a bare `plot_type` works without
    the caller hand-mapping columns. First categorical → label/x, first numeric →
    value; two numerics → x/y for scatter. Explicit roles always override these."""
    cols = dataset.get("columns") or []
    rows = dataset.get("rows") or []
    isnum = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    nums = [c for c in cols if any(isnum(r.get(c)) for r in rows)]
    cats = [c for c in cols if c not in nums]
    label = cats[0] if cats else (cols[0] if cols else None)
    value = nums[0] if nums else (cols[1] if len(cols) > 1 else None)
    roles: dict = {}
    if label:
        roles["label_column"] = roles["x_column"] = label
    if value:
        roles["value_column"] = value
    if len(nums) >= 2:
        roles["x_column"], roles["y_column"] = nums[0], nums[1]
    return roles


class Chart:
    """A2UI chart producer bound to one Contract. Reusable across agents; holds
    the catalog + validator so every surface it emits is on-contract.

    Chart does NOT touch bedrock, agentcore or strands — it turns data you
    already have into A2UI wire messages. Deterministic by default (zero LLM); if
    your own code (LLM or rules) already chose a chart type / column roles, pass
    them in and Chart just shapes + validates — your model still never sees a
    data value.
    """

    def __init__(self, *, contract: Contract = DEFAULT_CONTRACT, chart_type_buttons=None,
                 validate: bool = True):
        self._contract = contract
        self._engine = SurfaceEngine(
            build_catalog(contract), model=None,
            chart_type_buttons=chart_type_buttons or DEFAULT_CHART_TYPE_BUTTONS,
        )
        self._validate = validate

    @property
    def catalog_id(self) -> str:
        """The catalogId the client's createSurface must byte-match."""
        return self._engine.catalog_id

    def surface(self, rows, columns=None, answer: str = "", *, plot_type=None, roles=None) -> list[dict]:
        """Build the A2UI chart surface (createSurface + updateComponents + updateDataModel)
        from your data. `plot_type` / `roles` are optional — if YOUR code already
        decided the chart, pass them; otherwise Chart infers them deterministically
        from the column shapes. Values are copied straight from `rows`, never recomputed."""
        dataset = _as_dataset(rows, columns, answer)
        if plot_type or roles:
            effective_roles = {**_infer_roles(dataset), **(roles or {})}
            pt, series = build_series({**effective_roles, "plotType": plot_type}, dataset)
        else:
            pt, series = pick_and_shape(dataset)
        messages = self._engine.build_surface(pt, series, format_answer(dataset["answer"]))
        if self._validate:
            self._engine._validate_surface(messages)   # raises if off-contract
        return messages

    def rechart(self, plot_type: str) -> list[dict]:
        """Layout-only re-emit for the UI's chart-type toggle (no data; the client
        already holds the data model)."""
        return [self._engine.rechart_message(plot_type)]

    def version(self) -> dict:
        """The contract version handshake the client compares against its baked version."""
        return {"control": self._contract.control_version,
                "datashape": self._contract.datashape_version}

    @staticmethod
    def drill_prompt(value: str, question: str) -> str:
        """Compose the scoped follow-up for a drill click. RUNNING it is your biz
        logic (re-query with this prompt, then call surface() on the new data)."""
        return _drill_prompt(value, question)


__all__ = ["Chart"]
