from collections.abc import Iterable
from typing import Any


def to_sse_events(events: Iterable[dict[str, Any]]) -> Iterable[str]:
    for event in events:
        yield f"event: {event.get('type', 'message')}\ndata: {event}\n\n"
