import hashlib
import math
import re

from app.core.config import get_settings

settings = get_settings()

LOCAL_HASH_PROVIDER = "local_hash_v1"


def embedding_provider() -> str:
    return settings.embedding_provider


def embedding_dimensions() -> int:
    return settings.embedding_dimensions


def build_embedding_id(document_id: int, version: int, chunk_index: int, content: str) -> str:
    digest = hashlib.sha1(content.encode("utf-8")).hexdigest()[:16]
    return f"{embedding_provider()}:{document_id}:{version}:{chunk_index}:{digest}"


def embed_text(text: str) -> list[float]:
    if embedding_provider() != LOCAL_HASH_PROVIDER:
        raise ValueError(f"Unsupported embedding provider: {embedding_provider()}")
    return _build_local_hash_embedding(text, embedding_dimensions())


def cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    if not left or not right:
        return 0.0
    length = min(len(left), len(right))
    return sum(left[index] * right[index] for index in range(length))


def tokenize_for_retrieval(text: str) -> list[str]:
    normalized = text.lower()
    words = re.findall(r"[a-z0-9]+", normalized)
    chinese = re.findall(r"[\u4e00-\u9fff]", normalized)
    bigrams = [normalized[index : index + 2] for index in range(max(len(normalized) - 1, 0)) if _is_chinese_bigram(normalized[index : index + 2])]
    trigrams = [normalized[index : index + 3] for index in range(max(len(normalized) - 2, 0)) if _is_chinese_text(normalized[index : index + 3])]
    return words + chinese + bigrams + trigrams


def _build_local_hash_embedding(text: str, dimensions: int) -> list[float]:
    vector = [0.0] * dimensions
    for token in tokenize_for_retrieval(text):
        digest = hashlib.sha1(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [round(value / norm, 6) for value in vector]


def _is_chinese_text(value: str) -> bool:
    return bool(value) and all("\u4e00" <= char <= "\u9fff" for char in value)


def _is_chinese_bigram(value: str) -> bool:
    return len(value) == 2 and _is_chinese_text(value)
