"""phase7_knowledge_graph_models

Revision ID: a8f1729b4301
Revises: 9c241fa38e12
Create Date: 2026-09-22 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8f1729b4301'
down_revision: Union[str, Sequence[str], None] = '9c241fa38e12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Phase 7 Knowledge Graph, Timeline & Entities."""
    # 1. Create graph_entities table
    op.create_table(
        'graph_entities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('canonical_name', sa.String(length=255), nullable=False),
        sa.Column('alternate_names', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=True, server_default='English'),
        sa.Column('verification_status', sa.String(length=50), nullable=False, server_default='VERIFIED'),
        sa.Column('source_reference', sa.String(length=500), nullable=True),
        sa.Column('birth_date', sa.String(length=50), nullable=True),
        sa.Column('death_date', sa.String(length=50), nullable=True),
        sa.Column('start_date', sa.String(length=50), nullable=True),
        sa.Column('end_date', sa.String(length=50), nullable=True),
        sa.Column('date_precision', sa.String(length=30), nullable=True, server_default='YEAR'),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('external_identifier', sa.String(length=255), nullable=True),
        sa.Column('access_level', sa.String(length=50), nullable=False, server_default='PUBLIC'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graph_entities_id'), 'graph_entities', ['id'], unique=False)
    op.create_index(op.f('ix_graph_entities_entity_type'), 'graph_entities', ['entity_type'], unique=False)
    op.create_index(op.f('ix_graph_entities_canonical_name'), 'graph_entities', ['canonical_name'], unique=False)
    op.create_index(op.f('ix_graph_entities_verification_status'), 'graph_entities', ['verification_status'], unique=False)
    op.create_index(op.f('ix_graph_entities_access_level'), 'graph_entities', ['access_level'], unique=False)

    # 2. Create graph_entity_aliases table
    op.create_table(
        'graph_entity_aliases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('alias_name', sa.String(length=255), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=True, server_default='English'),
        sa.Column('source_reference', sa.String(length=500), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graph_entity_aliases_id'), 'graph_entity_aliases', ['id'], unique=False)
    op.create_index(op.f('ix_graph_entity_aliases_entity_id'), 'graph_entity_aliases', ['entity_id'], unique=False)
    op.create_index(op.f('ix_graph_entity_aliases_alias_name'), 'graph_entity_aliases', ['alias_name'], unique=False)

    # 3. Create graph_relationships table
    op.create_table(
        'graph_relationships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_entity_id', sa.Integer(), nullable=False),
        sa.Column('relationship_type', sa.String(length=50), nullable=False),
        sa.Column('target_entity_id', sa.Integer(), nullable=False),
        sa.Column('verification_status', sa.String(length=50), nullable=False, server_default='APPROVED'),
        sa.Column('provenance_type', sa.String(length=50), nullable=False, server_default='EXPLICIT_SOURCE_RELATION'),
        sa.Column('confidence', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('evidence_reference', sa.String(length=500), nullable=True),
        sa.Column('evidence_text', sa.Text(), nullable=True),
        sa.Column('source_document_id', sa.Integer(), nullable=True),
        sa.Column('document_version_id', sa.Integer(), nullable=True),
        sa.Column('ocr_text_version_id', sa.Integer(), nullable=True),
        sa.Column('page_id', sa.Integer(), nullable=True),
        sa.Column('chunk_id', sa.Integer(), nullable=True),
        sa.Column('access_level', sa.String(length=50), nullable=False, server_default='PUBLIC'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['source_entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['document_version_id'], ['document_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['ocr_text_version_id'], ['ocr_text_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['page_id'], ['ocr_pages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['chunk_id'], ['search_chunks.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graph_relationships_id'), 'graph_relationships', ['id'], unique=False)
    op.create_index(op.f('ix_graph_relationships_source_entity_id'), 'graph_relationships', ['source_entity_id'], unique=False)
    op.create_index(op.f('ix_graph_relationships_target_entity_id'), 'graph_relationships', ['target_entity_id'], unique=False)
    op.create_index(op.f('ix_graph_relationships_relationship_type'), 'graph_relationships', ['relationship_type'], unique=False)
    op.create_index(op.f('ix_graph_relationships_verification_status'), 'graph_relationships', ['verification_status'], unique=False)
    op.create_index(op.f('ix_graph_relationships_provenance_type'), 'graph_relationships', ['provenance_type'], unique=False)
    op.create_index(op.f('ix_graph_relationships_source_document_id'), 'graph_relationships', ['source_document_id'], unique=False)
    op.create_index(op.f('ix_graph_relationships_access_level'), 'graph_relationships', ['access_level'], unique=False)

    # 4. Create graph_entity_merges table
    op.create_table(
        'graph_entity_merges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('primary_entity_id', sa.Integer(), nullable=False),
        sa.Column('merged_entity_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='MATCH_REVIEW_REQUIRED'),
        sa.Column('merge_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['primary_entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['merged_entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graph_entity_merges_id'), 'graph_entity_merges', ['id'], unique=False)
    op.create_index(op.f('ix_graph_entity_merges_primary_entity_id'), 'graph_entity_merges', ['primary_entity_id'], unique=False)
    op.create_index(op.f('ix_graph_entity_merges_merged_entity_id'), 'graph_entity_merges', ['merged_entity_id'], unique=False)
    op.create_index(op.f('ix_graph_entity_merges_status'), 'graph_entity_merges', ['status'], unique=False)

    # 5. Create timeline_event_entities table
    op.create_table(
        'timeline_event_entities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timeline_event_id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True, server_default='SUBJECT'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['timeline_event_id'], ['timeline_events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['entity_id'], ['graph_entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_timeline_event_entities_id'), 'timeline_event_entities', ['id'], unique=False)
    op.create_index(op.f('ix_timeline_event_entities_timeline_event_id'), 'timeline_event_entities', ['timeline_event_id'], unique=False)
    op.create_index(op.f('ix_timeline_event_entities_entity_id'), 'timeline_event_entities', ['entity_id'], unique=False)

    # 6. Create graph_audit_logs table
    op.create_table(
        'graph_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graph_audit_logs_id'), 'graph_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_graph_audit_logs_action'), 'graph_audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_graph_audit_logs_target_type'), 'graph_audit_logs', ['target_type'], unique=False)
    op.create_index(op.f('ix_graph_audit_logs_target_id'), 'graph_audit_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_graph_audit_logs_timestamp'), 'graph_audit_logs', ['timestamp'], unique=False)

    # 7. Add new columns to timeline_events
    with op.batch_alter_table('timeline_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('date_precision', sa.String(length=30), nullable=True, server_default='YEAR'))
        batch_op.add_column(sa.Column('start_date', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('end_date', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('verification_status', sa.String(length=50), nullable=True, server_default='VERIFIED'))
        batch_op.add_column(sa.Column('provenance_type', sa.String(length=50), nullable=True, server_default='EXPLICIT_SOURCE_RELATION'))
        batch_op.add_column(sa.Column('confidence', sa.Float(), nullable=True, server_default='1.0'))
        batch_op.add_column(sa.Column('evidence_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('document_version_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('page_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('chunk_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_demo_data', sa.Boolean(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))
        batch_op.create_foreign_key('fk_timeline_events_doc_ver', 'document_versions', ['document_version_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_timeline_events_page', 'ocr_pages', ['page_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_timeline_events_chunk', 'search_chunks', ['chunk_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema for Phase 7."""
    with op.batch_alter_table('timeline_events', schema=None) as batch_op:
        batch_op.drop_constraint('fk_timeline_events_chunk', type_='foreignkey')
        batch_op.drop_constraint('fk_timeline_events_page', type_='foreignkey')
        batch_op.drop_constraint('fk_timeline_events_doc_ver', type_='foreignkey')
        batch_op.drop_column('created_at')
        batch_op.drop_column('is_demo_data')
        batch_op.drop_column('chunk_id')
        batch_op.drop_column('page_id')
        batch_op.drop_column('document_version_id')
        batch_op.drop_column('evidence_text')
        batch_op.drop_column('confidence')
        batch_op.drop_column('provenance_type')
        batch_op.drop_column('verification_status')
        batch_op.drop_column('end_date')
        batch_op.drop_column('start_date')
        batch_op.drop_column('date_precision')

    op.drop_table('graph_audit_logs')
    op.drop_table('timeline_event_entities')
    op.drop_table('graph_entity_merges')
    op.drop_table('graph_relationships')
    op.drop_table('graph_entity_aliases')
    op.drop_table('graph_entities')
