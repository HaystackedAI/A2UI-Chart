uv sync --extra dev
uv run pytest tests/ -q
uv build 
uvx twine check dist/*
uv run python -m zipfile -l dist/a2ui_chart_strands-0.9.0-py3-none-any.whl
uvx --from twine twine upload dist/*