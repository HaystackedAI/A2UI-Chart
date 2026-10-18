# Baked DEFAULT contract model — code-generated from a chart.datashape.json catalog schema.
# DO NOT hand-edit. This is the package's shipped default; a deployment regenerates its OWN
# models from A2UI_catalog_src/*.json and injects them via Contract (never regenerated here).

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class Point(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    x: float
    y: float


class Item(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    label: str
    value: float


class A2UIChartDataShape(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    points: list[Point] | None = None
    items: list[Item] | None = None
    value: float | str | None = None
    columns: list[str] | None = None
    rows: list[dict[str, Any]] | None = None
