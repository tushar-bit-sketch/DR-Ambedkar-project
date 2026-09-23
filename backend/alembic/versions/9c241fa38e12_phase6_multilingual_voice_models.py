"""phase6_multilingual_voice_models

Revision ID: 9c241fa38e12
Revises: 8b379efd265e
Create Date: 2026-09-21 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c241fa38e12'
down_revision: Union[str, Sequence[str], None] = '8b379efd265e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Phase 6 translations and audio derivatives."""
    op.create_table(
        'translations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('document_version_id', sa.Integer(), nullable=True),
        sa.Column('ocr_text_version_id', sa.Integer(), nullable=True),
        sa.Column('ocr_page_id', sa.Integer(), nullable=True),
        sa.Column('source_language', sa.String(length=50), nullable=False),
        sa.Column('target_language', sa.String(length=50), nullable=False),
        sa.Column('translated_title', sa.String(length=500), nullable=True),
        sa.Column('translated_text', sa.Text(), nullable=False),
        sa.Column('translation_provider', sa.String(length=100), nullable=False),
        sa.Column('translation_model', sa.String(length=100), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('translation_version', sa.Integer(), nullable=False, default=1),
        sa.Column('status', sa.String(length=50), nullable=False, default="MACHINE_GENERATED"),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_version_id'], ['document_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['ocr_text_version_id'], ['ocr_text_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['ocr_page_id'], ['ocr_pages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_translations_id'), 'translations', ['id'], unique=False)
    op.create_index(op.f('ix_translations_document_id'), 'translations', ['document_id'], unique=False)
    op.create_index(op.f('ix_translations_target_language'), 'translations', ['target_language'], unique=False)
    op.create_index(op.f('ix_translations_status'), 'translations', ['status'], unique=False)

    op.create_table(
        'audio_derivatives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('audio_id', sa.String(length=100), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('document_version_id', sa.Integer(), nullable=True),
        sa.Column('ocr_page_id', sa.Integer(), nullable=True),
        sa.Column('translation_id', sa.Integer(), nullable=True),
        sa.Column('source_text_version_id', sa.Integer(), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('voice', sa.String(length=100), nullable=True),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('file_format', sa.String(length=20), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('checksum', sa.String(length=128), nullable=False),
        sa.Column('timing_data_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default="COMPLETED"),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_version_id'], ['document_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['ocr_page_id'], ['ocr_pages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['translation_id'], ['translations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_text_version_id'], ['ocr_text_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audio_derivatives_id'), 'audio_derivatives', ['id'], unique=False)
    op.create_index(op.f('ix_audio_derivatives_audio_id'), 'audio_derivatives', ['audio_id'], unique=True)
    op.create_index(op.f('ix_audio_derivatives_document_id'), 'audio_derivatives', ['document_id'], unique=False)
    op.create_index(op.f('ix_audio_derivatives_checksum'), 'audio_derivatives', ['checksum'], unique=False)
    op.create_index(op.f('ix_audio_derivatives_status'), 'audio_derivatives', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('audio_derivatives')
    op.drop_table('translations')
