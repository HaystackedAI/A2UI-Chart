"""Render concern — build the catalog, shape the series, assemble + validate the
A2UI surface, and compose drill prompts. One import surface for the rest of the
package; callers depend on `render`, not on its internal module layout.
"""
from __future__ import annotations

from .catalog import BuiltCatalog, build_catalog
from .drill import drill_prompt
from .surface import (
    DEFAULT_CHART_TYPE_BUTTONS,
    SurfaceEngine,
    build_series,
    format_answer,
    pick_and_shape,
)

__all__ = [
    "BuiltCatalog",
    "build_catalog",
    "drill_prompt",
    "DEFAULT_CHART_TYPE_BUTTONS",
    "SurfaceEngine",
    "build_series",
    "format_answer",
    "pick_and_shape",
]
