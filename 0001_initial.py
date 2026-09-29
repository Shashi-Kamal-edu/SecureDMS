"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("ADMIN", "INVESTIGATOR", "REVIEWER", "VIEWER", name="userrole")
    case_status = sa.Enum(
        "OPEN", "UNDER_INVESTIGATION", "REVIEW", "CLOSED", name="casestatus"
    )
    document_type = sa.Enum(
        "FIR",
        "POLICE_REPORT",
        "WITNESS_STATEMENT",
        "CHARGE_SHEET",
        "COURT_FILING",
        "FORENSIC_REPORT",
        "LEGAL_NOTICE",
        "JUDGMENT",
        "OTHER",
        name="documenttype",
    )
    ocr_status = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="ocrstatus")
    blockchain_status = sa.Enum(
        "NOT_REGISTERED", "REGISTERED", "FAILED", name="blockchainstatus"
    )
    integrity_status = sa.Enum(
        "NOT_VERIFIED", "VERIFIED", "FAILED", name="integritystatus"
    )
    audit_action = sa.Enum(
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
        "UNAUTHORIZED_ACCESS",
        "INVALID_JWT",
        "FORBIDDEN_ACCESS",
        "CREATE_CASE",
        "UPDATE_CASE",
        "UPLOAD_DOCUMENT",
        "VIEW_DOCUMENT",
        "DOWNLOAD_DOCUMENT",
        "UPDATE_DOCUMENT",
        "DELETE_DOCUMENT",
        "OCR_PROCESS",
        "VERIFY_DOCUMENT",
        "BLOCKCHAIN_REGISTER",
        "CREATE_VERSION",
        "SEARCH_DOCUMENT",
        name="auditaction",
    )
    audit_status = sa.Enum("SUCCESS", "FAILED", name="auditstatus")

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "cases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("case_number", sa.String(64), nullable=False, unique=True),
        sa.Column("case_name", sa.String(255), nullable=False),
        sa.Column("case_type", sa.String(100), nullable=False),
        sa.Column("department", sa.String(100), nullable=True),
        sa.Column("assigned_officer", sa.String(255), nullable=True),
        sa.Column("status", case_status, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cases_case_number", "cases", ["case_number"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(64), nullable=False, unique=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("document_type", document_type, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(150), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ocr_status", ocr_status, nullable=False),
        sa.Column("ocr_text", sa.Text(), nullable=True),
        sa.Column("sha256_hash", sa.String(64), nullable=False),
        sa.Column("blockchain_tx_hash", sa.String(120), nullable=True),
        sa.Column("blockchain_status", blockchain_status, nullable=False),
        sa.Column("integrity_status", integrity_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_document_id", "documents", ["document_id"])
    op.create_index("ix_documents_case_id", "documents", ["case_id"])

    op.create_table(
        "document_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("sha256_hash", sa.String(64), nullable=False),
        sa.Column("ocr_text", sa.Text(), nullable=True),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("blockchain_tx_hash", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_document_versions_document_id", "document_versions", ["document_id"]
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", audit_action, nullable=False),
        sa.Column("document_id", sa.String(36), nullable=True),
        sa.Column("case_id", sa.String(36), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("status", audit_status, nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_document_id", "audit_logs", ["document_id"])
    op.create_index("ix_audit_logs_case_id", "audit_logs", ["case_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("document_versions")
    op.drop_table("documents")
    op.drop_table("cases")
    op.drop_table("users")

    sa.Enum(name="auditstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="auditaction").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="integritystatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="blockchainstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="ocrstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="documenttype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="casestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
