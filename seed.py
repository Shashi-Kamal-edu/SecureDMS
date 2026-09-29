"""
Seed script for local/demo use.

Creates four fictional demo users (one per role), a handful of fictional
cases, and a couple of placeholder documents so the frontend has data to
render against. NONE of this is real police/legal/personal data.

Usage:
    python -m app.seed
"""
from __future__ import annotations

import hashlib
import os

from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
from app.models.case import Case, CaseStatus
from app.models.document import (
    BlockchainStatus,
    Document,
    DocumentType,
    IntegrityStatus,
    OCRStatus,
)
from app.models.user import User, UserRole

DEMO_USERS = [
    {
        "name": "Demo Admin",
        "email": "admin@securedms.demo",
        "password": "DemoAdmin!2026",
        "role": UserRole.ADMIN,
    },
    {
        "name": "Demo Investigator",
        "email": "investigator@securedms.demo",
        "password": "DemoInvestigator!2026",
        "role": UserRole.INVESTIGATOR,
    },
    {
        "name": "Demo Reviewer",
        "email": "reviewer@securedms.demo",
        "password": "DemoReviewer!2026",
        "role": UserRole.REVIEWER,
    },
    {
        "name": "Demo Viewer",
        "email": "viewer@securedms.demo",
        "password": "DemoViewer!2026",
        "role": UserRole.VIEWER,
    },
]

DEMO_CASES = [
    {
        "case_number": "CASE-2026-0001",
        "case_name": "Fictional Warehouse Burglary",
        "case_type": "Property Crime",
        "department": "Central Investigations Unit",
        "assigned_officer": "Demo Investigator",
        "status": CaseStatus.UNDER_INVESTIGATION,
        "description": "A fictional demo case used to showcase the system. Not a real investigation.",
    },
    {
        "case_number": "CASE-2026-0002",
        "case_name": "Fictional Contract Dispute",
        "case_type": "Civil Matter",
        "department": "Legal Affairs",
        "assigned_officer": "Demo Reviewer",
        "status": CaseStatus.REVIEW,
        "description": "A fictional demo case involving a mock civil contract dispute.",
    },
    {
        "case_number": "CASE-2026-0003",
        "case_name": "Fictional Closed Vandalism Case",
        "case_type": "Property Crime",
        "department": "Central Investigations Unit",
        "assigned_officer": "Demo Investigator",
        "status": CaseStatus.CLOSED,
        "description": "A fictional, closed demo case retained for reporting examples.",
    },
]


def _placeholder_file_bytes(text: str) -> bytes:
    return text.encode("utf-8")


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        users_by_email = {}
        for demo in DEMO_USERS:
            existing = db.query(User).filter(User.email == demo["email"]).first()
            if existing:
                users_by_email[demo["email"]] = existing
                continue
            user = User(
                name=demo["name"],
                email=demo["email"],
                password_hash=hash_password(demo["password"]),
                role=demo["role"],
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            users_by_email[demo["email"]] = user
            print(f"Created demo user: {demo['email']} / {demo['password']} ({demo['role'].value})")

        investigator = users_by_email["investigator@securedms.demo"]

        cases_by_number = {}
        for demo in DEMO_CASES:
            existing = db.query(Case).filter(Case.case_number == demo["case_number"]).first()
            if existing:
                cases_by_number[demo["case_number"]] = existing
                continue
            case = Case(**demo)
            db.add(case)
            db.commit()
            db.refresh(case)
            cases_by_number[demo["case_number"]] = case
            print(f"Created demo case: {case.case_number} - {case.case_name}")

        # Storage dir
        storage_dir = os.path.abspath("storage/documents")
        os.makedirs(storage_dir, exist_ok=True)

        demo_docs = [
            {
                "case_number": "CASE-2026-0001",
                "document_id": "DOC-DEMO0001",
                "title": "Fictional Incident Report",
                "document_type": DocumentType.POLICE_REPORT,
                "content": "This is a fictional demo incident report used for seeding the system.",
            },
            {
                "case_number": "CASE-2026-0002",
                "document_id": "DOC-DEMO0002",
                "title": "Fictional Contract Excerpt",
                "document_type": DocumentType.LEGAL_NOTICE,
                "content": "This is a fictional demo legal notice used for seeding the system.",
            },
        ]

        for demo in demo_docs:
            existing = db.query(Document).filter(Document.document_id == demo["document_id"]).first()
            if existing:
                continue
            content_bytes = _placeholder_file_bytes(demo["content"])
            storage_path = os.path.join(storage_dir, f"{demo['document_id']}.txt")
            with open(storage_path, "wb") as f:
                f.write(content_bytes)
            file_hash = hashlib.sha256(content_bytes).hexdigest()

            doc = Document(
                document_id=demo["document_id"],
                case_id=cases_by_number[demo["case_number"]].id,
                title=demo["title"],
                filename=f"{demo['document_id']}.txt",
                document_type=demo["document_type"],
                description="Seeded demo document. Fictional content only.",
                storage_path=storage_path,
                file_size=len(content_bytes),
                mime_type="text/plain",
                version=1,
                uploaded_by=investigator.id,
                ocr_status=OCRStatus.PENDING,
                sha256_hash=file_hash,
                blockchain_status=BlockchainStatus.NOT_REGISTERED,
                integrity_status=IntegrityStatus.NOT_VERIFIED,
            )
            db.add(doc)
            db.commit()
            print(f"Created demo document: {demo['document_id']}")

        print("\nSeed complete. Demo credentials (DEMO ONLY -- do not use in production):")
        for demo in DEMO_USERS:
            print(f"  {demo['role'].value:<14} {demo['email']:<32} {demo['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
