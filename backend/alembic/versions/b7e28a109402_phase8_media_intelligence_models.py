"""phase8_media_intelligence_models

Revision ID: b7e28a109402
Revises: a8f1729b4301
Create Date: 2026-09-22 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e28a109402'
down_revision: Union[str, Sequence[str], None] = 'a8f1729b4301'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Phase 8 Audio/Video Archive & Media Intelligence."""
    # 1. media_collections
    op.create_table(
        'media_collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image_path', sa.String(length=500), nullable=True),
        sa.Column('access_level', sa.String(length=20), nullable=True, server_default='PUBLIC'),
        sa.Column('source', sa.String(length=255), nullable=True),
        sa.Column('verification_status', sa.String(length=30), nullable=True, server_default='VERIFIED'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_collections_id'), 'media_collections', ['id'], unique=False)
    op.create_index(op.f('ix_media_collections_name'), 'media_collections', ['name'], unique=True)
    op.create_index(op.f('ix_media_collections_slug'), 'media_collections', ['slug'], unique=True)
    op.create_index(op.f('ix_media_collections_access_level'), 'media_collections', ['access_level'], unique=False)
    op.create_index(op.f('ix_media_collections_verification_status'), 'media_collections', ['verification_status'], unique=False)

    # 2. media_assets
    op.create_table(
        'media_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('archive_id', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('subtitle', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('media_type', sa.String(length=50), nullable=False),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=False),
        sa.Column('source_name', sa.String(length=255), nullable=False, server_default='Dr. Ambedkar National Memorial'),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('source_identifier', sa.String(length=100), nullable=True),
        sa.Column('creator', sa.String(length=255), nullable=True),
        sa.Column('date', sa.String(length=50), nullable=True),
        sa.Column('date_precision', sa.String(length=30), nullable=True, server_default='EXACT_DAY'),
        sa.Column('language', sa.String(length=50), nullable=True, server_default='English'),
        sa.Column('original_language', sa.String(length=50), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('collection_id', sa.Integer(), nullable=True),
        sa.Column('rights', sa.String(length=255), nullable=True, server_default='Public Domain / Institutional Heritage Access'),
        sa.Column('license', sa.String(length=255), nullable=True),
        sa.Column('access_level', sa.String(length=20), nullable=True, server_default='PUBLIC'),
        sa.Column('download_policy', sa.String(length=30), nullable=True, server_default='STREAM_ONLY'),
        sa.Column('verification_status', sa.String(length=30), nullable=True, server_default='UNVERIFIED'),
        sa.Column('archival_status', sa.String(length=30), nullable=True, server_default='MASTER_PRESERVED'),
        sa.Column('is_demo_data', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('storage_path', sa.String(length=500), nullable=False),
        sa.Column('thumbnail_path', sa.String(length=500), nullable=True),
        sa.Column('poster_path', sa.String(length=500), nullable=True),
        sa.Column('waveform_data_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['media_collections.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_assets_id'), 'media_assets', ['id'], unique=False)
    op.create_index(op.f('ix_media_assets_archive_id'), 'media_assets', ['archive_id'], unique=True)
    op.create_index(op.f('ix_media_assets_title'), 'media_assets', ['title'], unique=False)
    op.create_index(op.f('ix_media_assets_media_type'), 'media_assets', ['media_type'], unique=False)
    op.create_index(op.f('ix_media_assets_checksum_sha256'), 'media_assets', ['checksum_sha256'], unique=False)
    op.create_index(op.f('ix_media_assets_source_identifier'), 'media_assets', ['source_identifier'], unique=False)
    op.create_index(op.f('ix_media_assets_collection_id'), 'media_assets', ['collection_id'], unique=False)
    op.create_index(op.f('ix_media_assets_access_level'), 'media_assets', ['access_level'], unique=False)
    op.create_index(op.f('ix_media_assets_download_policy'), 'media_assets', ['download_policy'], unique=False)
    op.create_index(op.f('ix_media_assets_verification_status'), 'media_assets', ['verification_status'], unique=False)
    op.create_index(op.f('ix_media_assets_archival_status'), 'media_assets', ['archival_status'], unique=False)
    op.create_index(op.f('ix_media_assets_is_demo_data'), 'media_assets', ['is_demo_data'], unique=False)

    # 3. media_versions
    op.create_table(
        'media_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('derivative_type', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('codec', sa.String(length=50), nullable=True),
        sa.Column('container', sa.String(length=50), nullable=True),
        sa.Column('resolution', sa.String(length=50), nullable=True),
        sa.Column('frame_rate', sa.Float(), nullable=True),
        sa.Column('bit_rate', sa.Integer(), nullable=True),
        sa.Column('sample_rate', sa.Integer(), nullable=True),
        sa.Column('channels', sa.Integer(), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_versions_id'), 'media_versions', ['id'], unique=False)
    op.create_index(op.f('ix_media_versions_media_id'), 'media_versions', ['media_id'], unique=False)
    op.create_index(op.f('ix_media_versions_derivative_type'), 'media_versions', ['derivative_type'], unique=False)

    # 4. media_technical_metadata
    op.create_table(
        'media_technical_metadata',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('metadata_category', sa.String(length=50), nullable=False),
        sa.Column('raw_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_technical_metadata_id'), 'media_technical_metadata', ['id'], unique=False)
    op.create_index(op.f('ix_media_technical_metadata_media_id'), 'media_technical_metadata', ['media_id'], unique=False)
    op.create_index(op.f('ix_media_technical_metadata_metadata_category'), 'media_technical_metadata', ['metadata_category'], unique=False)

    # 5. media_transcripts
    op.create_table(
        'media_transcripts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('language', sa.String(length=50), nullable=True, server_default='en'),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True, server_default='MACHINE_GENERATED'),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_transcripts_id'), 'media_transcripts', ['id'], unique=False)
    op.create_index(op.f('ix_media_transcripts_media_id'), 'media_transcripts', ['media_id'], unique=False)
    op.create_index(op.f('ix_media_transcripts_source_type'), 'media_transcripts', ['source_type'], unique=False)
    op.create_index(op.f('ix_media_transcripts_status'), 'media_transcripts', ['status'], unique=False)

    # 6. media_transcript_segments
    op.create_table(
        'media_transcript_segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transcript_id', sa.Integer(), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('start_timestamp_str', sa.String(length=20), nullable=False),
        sa.Column('end_timestamp_str', sa.String(length=20), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('speaker_label', sa.String(length=100), nullable=True, server_default='UNKNOWN'),
        sa.Column('confidence', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('verification_status', sa.String(length=30), nullable=True, server_default='PENDING_REVIEW'),
        sa.Column('source_reference', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['transcript_id'], ['media_transcripts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_transcript_segments_id'), 'media_transcript_segments', ['id'], unique=False)
    op.create_index(op.f('ix_media_transcript_segments_transcript_id'), 'media_transcript_segments', ['transcript_id'], unique=False)

    # 7. media_captions
    op.create_table(
        'media_captions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('transcript_id', sa.Integer(), nullable=True),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=True, server_default='en'),
        sa.Column('caption_text', sa.Text(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('verification_status', sa.String(length=30), nullable=True, server_default='PENDING_REVIEW'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transcript_id'], ['media_transcripts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_captions_id'), 'media_captions', ['id'], unique=False)
    op.create_index(op.f('ix_media_captions_media_id'), 'media_captions', ['media_id'], unique=False)

    # 8. media_collection_items
    op.create_table(
        'media_collection_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['collection_id'], ['media_collections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_collection_items_id'), 'media_collection_items', ['id'], unique=False)
    op.create_index(op.f('ix_media_collection_items_collection_id'), 'media_collection_items', ['collection_id'], unique=False)
    op.create_index(op.f('ix_media_collection_items_media_id'), 'media_collection_items', ['media_id'], unique=False)

    # 9. media_processing_jobs
    op.create_table(
        'media_processing_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('job_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=True, server_default='QUEUED'),
        sa.Column('progress', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('attempt', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('configuration_json', sa.Text(), nullable=True),
        sa.Column('tool_name', sa.String(length=100), nullable=True),
        sa.Column('tool_version', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_processing_jobs_id'), 'media_processing_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_media_processing_jobs_media_id'), 'media_processing_jobs', ['media_id'], unique=False)
    op.create_index(op.f('ix_media_processing_jobs_job_type'), 'media_processing_jobs', ['job_type'], unique=False)
    op.create_index(op.f('ix_media_processing_jobs_status'), 'media_processing_jobs', ['status'], unique=False)

    # 10. media_integrity_records
    op.create_table(
        'media_integrity_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('media_version_id', sa.Integer(), nullable=True),
        sa.Column('expected_sha256', sa.String(length=64), nullable=False),
        sa.Column('actual_sha256', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['media_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_version_id'], ['media_versions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_integrity_records_id'), 'media_integrity_records', ['id'], unique=False)
    op.create_index(op.f('ix_media_integrity_records_media_id'), 'media_integrity_records', ['media_id'], unique=False)
    op.create_index(op.f('ix_media_integrity_records_status'), 'media_integrity_records', ['status'], unique=False)

    # 11. Add optional linkage columns to timeline_events and graph_relationships
    try:
        with op.batch_alter_table('timeline_events') as batch_op:
            batch_op.add_column(sa.Column('media_asset_id', sa.Integer(), nullable=True))
            batch_op.add_column(sa.Column('media_timestamp', sa.String(length=50), nullable=True))
            batch_op.create_foreign_key('fk_timeline_events_media_asset', 'media_assets', ['media_asset_id'], ['id'], ondelete='SET NULL')
            batch_op.create_index(batch_op.f('ix_timeline_events_media_asset_id'), ['media_asset_id'], unique=False)
    except Exception:
        pass

    try:
        with op.batch_alter_table('graph_relationships') as batch_op:
            batch_op.add_column(sa.Column('media_asset_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_graph_relationships_media_asset', 'media_assets', ['media_asset_id'], ['id'], ondelete='SET NULL')
            batch_op.create_index(batch_op.f('ix_graph_relationships_media_asset_id'), ['media_asset_id'], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade Phase 8 schema."""
    try:
        with op.batch_alter_table('graph_relationships') as batch_op:
            batch_op.drop_column('media_asset_id')
    except Exception:
        pass

    try:
        with op.batch_alter_table('timeline_events') as batch_op:
            batch_op.drop_column('media_timestamp')
            batch_op.drop_column('media_asset_id')
    except Exception:
        pass

    op.drop_table('media_integrity_records')
    op.drop_table('media_processing_jobs')
    op.drop_table('media_collection_items')
    op.drop_table('media_captions')
    op.drop_table('media_transcript_segments')
    op.drop_table('media_transcripts')
    op.drop_table('media_technical_metadata')
    op.drop_table('media_versions')
    op.drop_table('media_assets')
    op.drop_table('media_collections')
