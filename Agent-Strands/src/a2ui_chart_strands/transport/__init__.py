"""Transport concern — the wire frames the agent yields and the gateway forwards.
One import surface for the rest of the package; callers depend on `transport`, not
on its internal module layout.
"""
from __future__ import annotations

from .frames import TRACE_DETAIL_CAP, a2ui_frame, trace_frame, version_frame

__all__ = ["a2ui_frame", "version_frame", "trace_frame", "TRACE_DETAIL_CAP"]
