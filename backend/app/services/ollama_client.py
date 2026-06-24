import json
import re
from typing import Any

import ollama

from app.settings import settings

_THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def _extract_json(text: str) -> str:
    """Strip <think> reasoning blocks and ```json fences some models wrap output in."""
    text = _THINK_TAG_RE.sub("", text).strip()
    if text.startswith("```json"):
        text = text[len("```json") :]
    elif text.startswith("```"):
        text = text[len("```") :]
    if text.endswith("```"):
        text = text[: -len("```")]
    return text.strip()


async def chat_structured(
    model: str, system: str, user: str, schema: dict[str, Any]
) -> dict[str, Any]:
    """Call Ollama with JSON-schema-constrained structured output."""
    client = ollama.AsyncClient(host=settings.ollama_host)
    response = await client.chat(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        format=schema,
        options={"temperature": 0.1, "top_p": 0.9, "num_ctx": 32768},
    )
    content = response["message"]["content"]
    return json.loads(_extract_json(content))
