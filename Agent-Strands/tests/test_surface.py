"""Chart-producer smoke test: no AWS, no model, no runtime — just prove the baked
contract assembles a valid catalog and that `Chart.surface(...)` passes the a2ui-core
validator. Run with a Python that has a2ui-core installed:

    python tests/test_surface.py            # plain asserts
    pytest tests/test_surface.py            # if pytest present
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from a2ui_chart_strands import Chart, DEFAULT_CONTRACT, a2ui_frame

ROWS = [{"STATUS": "Active", "CNT": 5}, {"STATUS": "Closed", "CNT": 3}]
COLUMNS = ["STATUS", "CNT"]
ANSWER = "Two statuses - Active and Closed."


def test_deterministic_surface_validates():
    chart = Chart()                        # baked contract, model-free

    messages = chart.surface(ROWS, COLUMNS, ANSWER)   # raises if off-catalog
    assert len(messages) == 3
    assert messages[0]["createSurface"]["catalogId"] == DEFAULT_CONTRACT.catalog_id
    assert any(m.get("updateDataModel") for m in messages)   # data model present
    chart_comp = next(
        c for m in messages for c in (m.get("updateComponents") or {}).get("components", [])
        if c.get("component") == "A2UI_Chart"
    )
    assert chart_comp["plotType"]            # a chart type was chosen (category+number → bar)


def test_explicit_plot_type_is_honored():
    chart = Chart()
    messages = chart.surface(ROWS, COLUMNS, ANSWER, plot_type="donut")
    chart_comp = next(
        c for m in messages for c in (m.get("updateComponents") or {}).get("components", [])
        if c.get("component") == "A2UI_Chart"
    )
    assert chart_comp["plotType"] == "donut"


def test_rechart_is_layout_only():
    chart = Chart()
    msgs = chart.rechart("donut")
    assert len(msgs) == 1
    msg = msgs[0]
    assert "createSurface" not in msg and "updateComponents" in msg
    comp = next(c for c in msg["updateComponents"]["components"] if c.get("component") == "A2UI_Chart")
    assert comp["plotType"] == "donut"


def test_frame_and_version():
    chart = Chart()
    frame = a2ui_frame(chart.surface(ROWS, COLUMNS, ANSWER))
    assert frame["kind"] == "a2ui" and frame["a2ui_messages"]
    # version() is the handshake the client byte-matches; it must mirror the contract.
    v = chart.version()
    assert v == {"control": DEFAULT_CONTRACT.control_version,
                 "datashape": DEFAULT_CONTRACT.datashape_version}


if __name__ == "__main__":
    test_deterministic_surface_validates()
    test_explicit_plot_type_is_honored()
    test_rechart_is_layout_only()
    test_frame_and_version()
    print("ALL OK")
