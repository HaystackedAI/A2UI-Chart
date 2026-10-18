"""The contract — catalogId + the two schema models + versions.

The contract is the one thing the agent package and the React client
(``@haystackedai/a2ui-chart-react``) MUST byte-match: the ``catalogId`` the client
stamps on ``createSurface``, the ``plotType`` vocabulary, and the series shape.

Nothing here is hand-typed. Every value is read from the sibling modules shipped
with the package — ``chart_control`` (plotType vocabulary), ``chart_datashape``
(series shape), ``contract_version`` (versions + catalogId). Those are the baked
DEFAULT; a deployment regenerates its OWN contract from ``A2UI_catalog_src/*.json``
and injects it (below), so the package's default is never regenerated in place.

The package ships ``DEFAULT_CONTRACT`` so ``pip install`` → ``Chart()`` just works;
a deployment with its own catalog overrides it by passing a custom ``Contract``
to ``Chart(contract=...)``.
"""
from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel

from .chart_control import A2UIChartControl
from .chart_datashape import A2UIChartDataShape
from .contract_version import CATALOG_ID, CONTROL_VERSION, DATASHAPE_VERSION

# The default catalog id — read from contract_version (the shipped default), never
# hand-typed here, so it can't drift from the source JSON. MUST byte-match the
# client's createSurface.catalogId (@haystackedai/a2ui-chart-react's catalogId).
DEFAULT_CATALOG_ID = CATALOG_ID


@dataclass(frozen=True)
class Contract:
    """What the agent and client agree on. ``control_model`` must expose a
    ``plotType`` field (a Literal enum); ``datashape_model`` is the series shape.
    Both are Pydantic models, mirroring the client's controlSchema / datashapeSchema."""

    catalog_id: str
    control_model: type[BaseModel]
    datashape_model: type[BaseModel]
    control_version: str
    datashape_version: str


# The baked default — assembled entirely from the shipped default modules.
DEFAULT_CONTRACT = Contract(
    catalog_id=CATALOG_ID,
    control_model=A2UIChartControl,
    datashape_model=A2UIChartDataShape,
    control_version=CONTROL_VERSION,
    datashape_version=DATASHAPE_VERSION,
)

__all__ = ["Contract", "DEFAULT_CONTRACT", "DEFAULT_CATALOG_ID"]
