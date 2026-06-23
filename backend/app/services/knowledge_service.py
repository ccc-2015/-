import hashlib
import math
import re
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.knowledge import KnowledgeChunk, KnowledgeCleaningReport, KnowledgeDocument
from app.models.user import User

settings = get_settings()

SUPPORTED_KNOWLEDGE_EXTENSIONS = {".txt", ".md", ".csv", ".xlsx", ".xls"}
EMBEDDING_DIMENSIONS = 64
QUALITY_YEAR_PATTERN = re.compile(r"(20\d{2})")
MIN_PUBLISH_QUALITY_SCORE = 65


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
    commit: bool = True,
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
    if commit:
        db.commit()
        db.refresh(document)
    return document


def rebuild_document_chunks(db: Session, document: KnowledgeDocument, chunk_size: int = 800, overlap: int = 120, refresh_report: bool = True) -> int:
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
    if refresh_report:
        refresh_cleaning_report(db, document, chunks=chunks)
    return len(chunks)


def refresh_cleaning_report(db: Session, document: KnowledgeDocument, chunks: list[str] | None = None) -> KnowledgeCleaningReport:
    chunk_texts = chunks if chunks is not None else [chunk.content for chunk in document.chunks]
    if chunks is None and not chunk_texts and document.id:
        chunk_texts = list(
            db.scalars(select(KnowledgeChunk.content).where(KnowledgeChunk.document_id == document.id).order_by(KnowledgeChunk.chunk_index)).all()
        )
    scores, issues, metrics = evaluate_document_quality(db, document, chunk_texts)
    overall_score = round(sum(scores.values()) / len(scores)) if scores else 0
    report = document.cleaning_report or db.scalar(select(KnowledgeCleaningReport).where(KnowledgeCleaningReport.document_id == document.id))
    if report is None:
        report = KnowledgeCleaningReport(document=document)
        db.add(report)
    report.overall_score = overall_score
    report.status = _quality_status(overall_score, issues)
    report.text_extract_score = scores["text_extract_score"]
    report.ocr_confidence = scores["ocr_confidence"]
    report.metadata_complete_score = scores["metadata_complete_score"]
    report.dedup_score = scores["dedup_score"]
    report.table_parse_score = scores["table_parse_score"]
    report.policy_validity_score = scores["policy_validity_score"]
    report.chunk_ready_score = scores["chunk_ready_score"]
    report.issues_json = issues
    report.metrics_json = metrics
    return report


def validate_document_publishable(db: Session, document: KnowledgeDocument) -> tuple[bool, list[str], KnowledgeCleaningReport]:
    report = refresh_cleaning_report(db, document)
    metrics = report.metrics_json or {}
    issues = report.issues_json or []
    reasons: list[str] = []

    if report.overall_score < MIN_PUBLISH_QUALITY_SCORE:
        reasons.append(f"清洗质量评分 {report.overall_score}/100，低于发布阈值 {MIN_PUBLISH_QUALITY_SCORE}。")
    if report.status == "failed":
        reasons.append("清洗质量报告状态为未通过。")
    if int(metrics.get("chunk_count") or 0) <= 0:
        reasons.append("文档没有可检索切片。")
    if not (document.source_type or "").strip():
        reasons.append("缺少来源类型。")
    if not (document.source_url or "").strip():
        reasons.append("缺少来源 URL 或原始文件路径。")
    latest_year = metrics.get("latest_year")
    if isinstance(latest_year, int) and latest_year < 2026:
        reasons.append(f"检测到最新年份为 {latest_year}，低于当前 2026 报考基线。")
    if latest_year is None:
        reasons.append("未识别到政策或招生数据年份。")
    if any(issue.get("severity") == "error" for issue in issues):
        reasons.append("质量报告包含错误级问题。")

    return not reasons, reasons, report


def evaluate_document_quality(
    db: Session,
    document: KnowledgeDocument,
    chunks: list[str] | None = None,
) -> tuple[dict[str, int], list[dict[str, str]], dict[str, Any]]:
    content = document.content or ""
    chunk_texts = chunks or split_text(content)
    issues: list[dict[str, str]] = []

    text_length = len(content.strip())
    line_count = len([line for line in content.splitlines() if line.strip()])
    duplicated_line_count = _duplicate_line_count(content)
    duplicate_ratio = duplicated_line_count / line_count if line_count else 0
    table_like_lines = _table_like_line_count(content)
    has_table_signal = table_like_lines >= 3 or (document.category or "").lower() in {"table", "score", "plan", "admission"}
    years = [int(value) for value in QUALITY_YEAR_PATTERN.findall(" ".join(filter(None, [document.title, document.category, content[:1000]])))]
    latest_year = max(years) if years else None
    source_url = (document.source_url or "").strip()
    source_type = (document.source_type or "").strip()

    if text_length < 80:
        issues.append(_issue("error", "正文过短，无法形成可靠知识库切片。", "text_extract"))
    elif text_length < 300:
        issues.append(_issue("warning", "正文内容偏短，建议人工确认是否解析完整。", "text_extract"))
    if duplicate_ratio > 0.35:
        issues.append(_issue("warning", "重复行比例较高，可能存在页眉页脚或重复上传内容。", "dedup"))
    if not document.category:
        issues.append(_issue("warning", "缺少文档分类，不利于按政策、章程或问答分层检索。", "metadata"))
    if not source_type:
        issues.append(_issue("warning", "缺少来源类型。", "metadata"))
    if not source_url:
        issues.append(_issue("warning", "缺少来源 URL 或原始文件路径，引用追溯不足。", "metadata"))
    if source_url and source_url.startswith("http") is False and source_type != "file_upload":
        issues.append(_issue("warning", "来源 URL 不是可访问链接，请确认是否应标记为文件上传。", "metadata"))
    if latest_year and latest_year < 2026:
        issues.append(_issue("warning", f"检测到最新年份为 {latest_year}，可能不适用于 2026 报考。", "validity"))
    if not latest_year:
        issues.append(_issue("warning", "未识别到政策或招生数据年份。", "validity"))
    if has_table_signal and table_like_lines < 3:
        issues.append(_issue("warning", "文档疑似表格类资料，但未检测到稳定表格结构。", "table"))
    if not chunk_texts:
        issues.append(_issue("error", "尚未生成切片，Agent 无法检索此文档。", "chunk"))
    if chunk_texts and any(len(chunk) < 80 for chunk in chunk_texts):
        issues.append(_issue("warning", "存在过短切片，可能影响检索命中质量。", "chunk"))

    scores = {
        "text_extract_score": _text_extract_score(text_length),
        "ocr_confidence": 100,
        "metadata_complete_score": _metadata_score(document, latest_year),
        "dedup_score": _dedup_score(duplicate_ratio),
        "table_parse_score": _table_score(has_table_signal, table_like_lines),
        "policy_validity_score": _validity_score(latest_year),
        "chunk_ready_score": _chunk_score(chunk_texts),
    }
    metrics = {
        "text_length": text_length,
        "line_count": line_count,
        "duplicate_line_count": duplicated_line_count,
        "duplicate_ratio": round(duplicate_ratio, 4),
        "chunk_count": len(chunk_texts),
        "min_chunk_size": min((len(chunk) for chunk in chunk_texts), default=0),
        "max_chunk_size": max((len(chunk) for chunk in chunk_texts), default=0),
        "table_like_line_count": table_like_lines,
        "latest_year": latest_year,
    }
    return scores, issues, metrics


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


def _text_extract_score(text_length: int) -> int:
    if text_length >= 1000:
        return 95
    if text_length >= 300:
        return 82
    if text_length >= 80:
        return 60
    if text_length > 0:
        return 30
    return 0


def _metadata_score(document: KnowledgeDocument, latest_year: int | None) -> int:
    checks = [
        bool(document.title),
        bool(document.category),
        bool(document.source_type),
        bool(document.source_url),
        bool(document.tags),
        bool(latest_year),
    ]
    return round(sum(1 for passed in checks if passed) / len(checks) * 100)


def _dedup_score(duplicate_ratio: float) -> int:
    return max(20, round(100 - duplicate_ratio * 180))


def _table_score(has_table_signal: bool, table_like_lines: int) -> int:
    if not has_table_signal:
        return 100
    if table_like_lines >= 8:
        return 90
    if table_like_lines >= 3:
        return 72
    return 45


def _validity_score(latest_year: int | None) -> int:
    if latest_year is None:
        return 55
    if latest_year >= 2026:
        return 95
    if latest_year == 2025:
        return 70
    return 45


def _chunk_score(chunks: list[str]) -> int:
    if not chunks:
        return 0
    short_chunks = sum(1 for chunk in chunks if len(chunk) < 80)
    short_ratio = short_chunks / len(chunks)
    return max(35, round(95 - short_ratio * 45))


def _duplicate_line_count(text: str) -> int:
    lines = [line.strip() for line in text.splitlines() if len(line.strip()) >= 12]
    seen: set[str] = set()
    duplicates = 0
    for line in lines:
        normalized = re.sub(r"\s+", "", line)
        if normalized in seen:
            duplicates += 1
        else:
            seen.add(normalized)
    return duplicates


def _table_like_line_count(text: str) -> int:
    count = 0
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        separators = stripped.count("；") + stripped.count(",") + stripped.count("\t") + stripped.count("|")
        key_value_pairs = len(re.findall(r"[\u4e00-\u9fffA-Za-z0-9_]+[:：]", stripped))
        if separators >= 3 or key_value_pairs >= 3:
            count += 1
    return count


def _quality_status(overall_score: int, issues: list[dict[str, str]]) -> str:
    if any(issue["severity"] == "error" for issue in issues):
        return "failed"
    if overall_score >= 85:
        return "passed"
    if overall_score >= 65:
        return "warning"
    return "failed"


def _issue(severity: str, message: str, code: str) -> dict[str, str]:
    return {"severity": severity, "message": message, "code": code}


def _is_chinese_text(value: str) -> bool:
    return bool(value) and all("\u4e00" <= char <= "\u9fff" for char in value)


def _is_chinese_bigram(value: str) -> bool:
    return len(value) == 2 and _is_chinese_text(value)


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
