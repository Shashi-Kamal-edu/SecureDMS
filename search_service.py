from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.document import Document
from app.models.user import User


def global_search(db: Session, query: str, *, limit: int = 50) -> list[dict]:
    like = f"%{query}%"

    results: list[dict] = []

    docs = (
        db.query(Document)
        .join(Case, Document.case_id == Case.id)
        .filter(
            or_(
                Document.document_id.ilike(like),
                Document.filename.ilike(like),
                Document.title.ilike(like),
                Document.ocr_text.ilike(like),
                Case.case_number.ilike(like),
                Case.case_name.ilike(like),
            )
        )
        .limit(limit)
        .all()
    )

    for doc in docs:
        case = db.query(Case).filter(Case.id == doc.case_id).first()
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first()

        matched_field = "unknown"
        q_lower = query.lower()
        if q_lower in (doc.document_id or "").lower():
            matched_field = "document_id"
        elif q_lower in (doc.filename or "").lower():
            matched_field = "filename"
        elif q_lower in (doc.title or "").lower():
            matched_field = "title"
        elif doc.ocr_text and q_lower in doc.ocr_text.lower():
            matched_field = "ocr_text"
        elif case and q_lower in (case.case_number or "").lower():
            matched_field = "case_number"
        elif case and q_lower in (case.case_name or "").lower():
            matched_field = "case_name"

        snippet = None
        if matched_field == "ocr_text" and doc.ocr_text:
            idx = doc.ocr_text.lower().find(q_lower)
            start = max(0, idx - 40)
            end = min(len(doc.ocr_text), idx + 40)
            snippet = doc.ocr_text[start:end]

        results.append(
            {
                "document": {
                    "id": doc.id,
                    "document_id": doc.document_id,
                    "title": doc.title,
                    "filename": doc.filename,
                    "document_type": doc.document_type.value,
                },
                "matched_field": matched_field,
                "snippet": snippet,
                "uploader": uploader.name if uploader else None,
                "case": {
                    "id": case.id,
                    "case_number": case.case_number,
                    "case_name": case.case_name,
                }
                if case
                else None,
            }
        )

    return results
