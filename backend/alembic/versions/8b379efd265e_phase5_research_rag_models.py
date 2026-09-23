"""phase5_research_rag_models

Revision ID: 8b379efd265e
Revises: 715dcf202576
Create Date: 2026-09-21 14:05:22.891042

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b379efd265e'
down_revision: Union[str, Sequence[str], None] = '715dcf202576'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create research_conversations
    op.create_table(
        'research_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_research_conversations_id'), 'research_conversations', ['id'], unique=False)
    op.create_index(op.f('ix_research_conversations_conversation_id'), 'research_conversations', ['conversation_id'], unique=True)
    op.create_index(op.f('ix_research_conversations_user_id'), 'research_conversations', ['user_id'], unique=False)

    # Create research_messages
    op.create_table(
        'research_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('grounded', sa.Boolean(), nullable=True),
        sa.Column('evidence_count', sa.Integer(), nullable=True),
        sa.Column('citations_json', sa.Text(), nullable=True),
        sa.Column('retrieved_chunk_ids', sa.Text(), nullable=True),
        sa.Column('retrieved_document_ids', sa.Text(), nullable=True),
        sa.Column('retrieved_page_ids', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['research_conversations.conversation_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_research_messages_id'), 'research_messages', ['id'], unique=False)
    op.create_index(op.f('ix_research_messages_conversation_id'), 'research_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_research_messages_status'), 'research_messages', ['status'], unique=False)

    # Create research_audit_logs
    op.create_table(
        'research_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sa.String(length=100), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('retrieved_document_ids', sa.Text(), nullable=True),
        sa.Column('retrieved_page_ids', sa.Text(), nullable=True),
        sa.Column('retrieved_chunk_ids', sa.Text(), nullable=True),
        sa.Column('generation_status', sa.String(length=50), nullable=False),
        sa.Column('citation_validation_status', sa.String(length=50), nullable=False),
        sa.Column('llm_provider', sa.String(length=50), nullable=True),
        sa.Column('llm_model', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_research_audit_logs_id'), 'research_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_research_audit_logs_user_id'), 'research_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_research_audit_logs_conversation_id'), 'research_audit_logs', ['conversation_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('research_audit_logs')
    op.drop_table('research_messages')
    op.drop_table('research_conversations')
