import hashlib
import math
import re
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.user import User

settings = get_settings()

SUPPORTED_KNOWLEDGE_EXTENSIONS = {".txt", ".md", ".csv", ".xlsx", ".xls"}
EMBEDDING_DIMENSIONS = 64


async def save_knowledge_upload(file: UploadFile) -> Path:
    target_dir = settings.upload_dir / "knowledge"
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = Path(file.filename or "knowledge.txt").name
    target = target_dir / filename
    suffix = target.suffix
    stem = target.stem
    counter = 1
    while target.exists():
        target = target_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    target.write_bytes(await file.read())
    return target


def extract_knowledge_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_KNOWLEDGE_EXTENSIONS:
        raise ValueError("Only .txt, .md, .csv, .xlsx and .xls files are supported")
    if suffix in {".txt", ".md"}:
        return _read_text_file(path)
    if suffix == ".csv":
        return _table_to_text(pd.read_csv(path))
    return _table_to_text(pd.read_excel(path))


def create_document_from_upload(
    db: Session,
    user: User,
    path: Path,
    title: str | None,
    category: str | None,
    source_type: str | None,
    source_url: str | None,
    status: str,
    tags: list[str] | None,
) -> KnowledgeDocument:
    content = extract_knowledge_text(path).strip()
    if not content:
        raise ValueError("Uploaded file has no extractable text")

    document = KnowledgeDocument(
        title=(title or path.stem).strip(),
        category=_optional_str(category),
        content=content,
        source_type=_optional_str(source_type) or "file_upload",
        source_url=_optional_str(source_url) or str(path),
        status=status,
        tags=tags or None,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(document)
    db.flush()
    rebuild_document_chunks(db, document)
    db.commit()
    db.refresh(document)
    return document


def rebuild_document_chunks(db: Session, document: KnowledgeDocument, chunk_size: int = 800, overlap: int = 120) -> int:
    db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
    chunks = split_text(document.content, chunk_size=chunk_size, overlap=overlap)
    for index, chunk in enumerate(chunks):
        embedding = build_local_embedding(chunk)
        embedding_id = build_embedding_id(document.id, document.version, index, chunk)
        db.add(
            KnowledgeChunk(
                document_id=document.id,
                chunk_index=index,
                content=chunk,
                embedding_id=embedding_id,
                metadata_json={
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_version": document.version,
                    "category": document.category,
                    "status": document.status,
                    "chunk_size": len(chunk),
                    "embedding_provider": "local_hash_v1",
                    "embedding_dimensions": EMBEDDING_DIMENSIONS,
                    "embedding": embedding,
                },
            )
        )
    return len(chunks)


def split_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not normalized:
        return []

    bounded_chunk_size = max(200, min(chunk_size, 2000))
    bounded_overlap = max(0, min(overlap, bounded_chunk_size // 2))
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + bounded_chunk_size)
        chunks.append(normalized[start:end].strip())
        if end >= len(normalized):
            break
        start = end - bounded_overlap
    return [chunk for chunk in chunks if chunk]


def build_embedding_id(document_id: int, version: int, chunk_index: int, content: str) -> str:
    digest = hashlib.sha1(content.encode("utf-8")).hexdigest()[:16]
    return f"local_hash_v1:{document_id}:{version}:{chunk_index}:{digest}"


def build_local_embedding(text: str, dimensions: int = EMBEDDING_DIMENSIONS) -> list[float]:
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


def _read_text_file(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def _table_to_text(df: pd.DataFrame) -> str:
    clean = df.where(pd.notnull(df), "")
    lines: list[str] = []
    for index, row in clean.iterrows():
        parts = [f"{column}: {value}" for column, value in row.items() if str(value).strip()]
        if parts:
            lines.append(f"第 {index + 2} 行 - " + "；".join(parts))
    return "\n".join(lines)


def _is_chinese_text(value: str) -> bool:
    return bool(value) and all("\u4e00" <= char <= "\u9fff" for char in value)


def _is_chinese_bigram(value: str) -> bool:
    return len(value) == 2 and _is_chinese_text(value)


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
