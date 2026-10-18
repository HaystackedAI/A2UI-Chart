# a2ui-chart-strands — public surface.
#
# What this package IS: an A2UI CHART producer for agents. It does NOT wrap your
# runtime — bedrock, agentcore, strands and your business logic stay yours. You
# keep your agent and add a few lines where you already have the answer data; you
# get the A2UI chart surface the React client (@haystackedai/a2ui-chart-react)
# renders — richer than a hand-rolled chart, and validated against the shared catalog.
#
# Mirror of the React side: there you drop in useA2UIChart + A2UIChartView without
# wrapping your server; here you drop in Chart without wrapping your runtime.
#
#   from a2ui_chart_strands import Chart, a2ui_frame
#   chart = Chart()                                   # once (baked contract)
#   # in your existing entrypoint, where YOUR pipeline produced the data:
#   yield a2ui_frame(chart.surface(rows, columns, answer))
#
# The contract (catalogId + schemas) is baked (DEFAULT_CONTRACT) so install → it
# works; pass a custom Contract to match a client on a different catalog.
#
# This module is only a barrel: it re-exports the public surface from the four
# concern packages (entry / render / transport / contract). Nothing is defined here.

# The chart producer (the whole public story).
from .entry import Chart

# The wire-frame helpers the streaming entrypoint yields.
from .transport import a2ui_frame, version_frame, trace_frame

# The contract: the baked default + the type for overriding it.
from .contract import Contract, DEFAULT_CONTRACT, DEFAULT_CATALOG_ID

# Lower-level building blocks (if you shape the series / surface yourself).
from .render import build_catalog, BuiltCatalog, build_series, pick_and_shape, format_answer

__all__ = [
    "Chart", "a2ui_frame", "version_frame", "trace_frame",
    "Contract", "DEFAULT_CONTRACT", "DEFAULT_CATALOG_ID",
    "build_catalog", "BuiltCatalog",
    "build_series", "pick_and_shape", "format_answer",
]
