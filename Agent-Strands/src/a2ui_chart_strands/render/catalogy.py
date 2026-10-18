"""Assemble the A2UI catalog + validator from a Contract — the a2ui-core plumbing.

Hidden from the dev entirely. We take the contract's control/datashape models, build
the custom A2UI_Chart component against a2ui-core's CatalogComponentCommon, add it to
a2ui-core's BasicCatalog (v0_9), and build the PayloadValidator run on every surface
component before emit. This is the agent-side mirror of a2ui-chart-react's
A2UIChart_makeCatalog.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, get_args

from pydantic import BaseModel, Field, create_model

from a2ui.core import PayloadValidator, STRICT_VALIDATION
from a2ui.core.basic_catalog.v0_9 import BasicCatalog
from a2ui.core.basic_catalog.v0_9.components import CatalogComponentCommon
from a2ui.core.catalog import ModelComponentApi
from a2ui.core.schema.v0_9.common_types import DataBinding, DynamicString

from ..contract import Contract


@dataclass
class BuiltCatalog:
    """Everything the surface engine needs, derived once from the Contract."""
    catalog_id: str
    validator: PayloadValidator
    series_model: type[BaseModel]        # the datashape model (A2UIChartSeries)
    plot_types: list[str]
    schema_desc: str


def build_catalog(contract: Contract) -> BuiltCatalog:
    """Build the full catalog (basic + A2UI_Chart) and its validator from the contract."""
    # plotType vocabulary comes FROM the contract's control model — single-sourced.
    plot_type_annotation = contract.control_model.model_fields["plotType"].annotation
    series_model = contract.datashape_model

    # Build the custom component dynamically from the injected schemas. create_model
    # lets plotType/series be contract-driven types (a class body can't take type vars).
    chart_component: type[BaseModel] = create_model(
        "A2UIChartComponent",
        __base__=CatalogComponentCommon,
        component=(Literal["A2UI_Chart"], "A2UI_Chart"),
        plotType=(plot_type_annotation, Field(..., description="The chart type to render.")),
        title=(DynamicString | None, Field(None, description="Optional chart title.")),
        series=(series_model | DataBinding, Field(
            ..., description="The chart data (a {path} binding, or an inline series object).")),
    )
    chart_api = ModelComponentApi(chart_component)

    # Start from a2ui-core's basic catalog (standard components); set our catalog id;
    # add the custom A2UI_Chart → the full catalog.
    catalog = BasicCatalog()
    catalog.catalog_id = contract.catalog_id
    catalog.components["A2UI_Chart"] = chart_api
    validator = PayloadValidator(catalog, STRICT_VALIDATION)

    plot_types = list(get_args(plot_type_annotation))
    required = [n for n, f in chart_component.model_fields.items() if f.is_required()]
    schema_desc = (
        f"A2UI_Chart{{plotType∈{plot_types}, title?:DynamicString, "
        f"series:A2UIChartSeries|DataBinding}} required={required}"
    )
    return BuiltCatalog(contract.catalog_id, validator, series_model, plot_types, schema_desc)
