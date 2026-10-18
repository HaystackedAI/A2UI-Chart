# Baked DEFAULT contract model — code-generated from a chart.control.json catalog schema.
# DO NOT hand-edit. This is the package's shipped default; a deployment regenerates its OWN
# models from A2UI_catalog_src/*.json and injects them via Contract (never regenerated here).

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class A2UIChartControl(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    plotType: Literal[
        'scatter', 'bar', 'column', 'line', 'area', 'pie', 'donut', 'KPI_CARD', 'table'
    ] = Field(..., description='The chart type to render.')
