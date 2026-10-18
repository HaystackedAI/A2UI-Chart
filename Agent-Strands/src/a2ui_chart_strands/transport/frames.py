"""Transport — the wire frames the agent yields and the gateway forwards.

Three frame kinds the frontend package parses, each a plain dict with a ``kind``:

* ``a2ui``    — the chart surface (createSurface + updateComponents + updateDataModel)
* ``version`` — the contract-version handshake the client compares to its baked version
* ``trace``   — one flow-trace step for the client's flow panel

The frame SHAPES are the transport contract with the frontend, so they are frozen
here. This is the agent-side mirror of the client's transport layer.
"""
from __future__ import annotations

import time

# Cap each detail string so a single trace frame stays small on the wire — large
# enough to show the emitted A2UI surface (3 messages) in full.
TRACE_DETAIL_CAP = 3000


def a2ui_frame(messages: list[dict], usage: dict | None = None) -> dict:
    """Wrap surface messages in the a2ui frame the client reads. Yield this from
    your streaming entrypoint."""
    return {"kind": "a2ui", "a2ui_messages": messages, "usage": usage or {}}


def version_frame(versions: dict) -> dict:
    """Wrap a Chart.version() result as the client's version-handshake frame."""
    return {"kind": "version", "version": versions}


def trace_frame(actor: str, action: str, detail: str = "") -> dict:
    """Build one 'trace' frame (kind:'trace'); the gateway re-wraps it as a meta part."""
    return {"kind": "trace", "entry": {
        "ts": int(time.time() * 1000),
        "actor": actor,
        "action": action,
        "detail": str(detail)[:TRACE_DETAIL_CAP],
    }}
