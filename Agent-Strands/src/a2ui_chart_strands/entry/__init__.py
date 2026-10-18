"""Entry concern — the drop-in a dev adds to an existing agent. Mirror of the
React client's entry layer (useA2UIChart + A2UIChartView); here it's `Chart`.
"""
from __future__ import annotations

from .chart import Chart

__all__ = ["Chart"]
