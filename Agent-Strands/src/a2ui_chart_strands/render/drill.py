"""Drill — compose the scoped follow-up prompt for a slice-click drill-down.

The agent-side counterpart to the client's drill bridge (render/drill.ts over
there is a React event bridge; here it's prompt composition). When the UI reports
a drill on a chart value, this builds the re-query prompt. RUNNING it is the
host's biz logic — re-query with this prompt, then call Chart.surface() on the new
data. Exposed via Chart.drill_prompt() so callers have one entry point.
"""
from __future__ import annotations


def drill_prompt(value: str, question: str) -> str:
    """Compose the scoped follow-up for a drill click: keep the original question,
    then narrow to the clicked value one level deeper."""
    return (f"{question}\n\nNow focus ONLY on '{value}' and show its breakdown one level "
            f"deeper (e.g. by phase, status, or sub-category) as a chart.")
