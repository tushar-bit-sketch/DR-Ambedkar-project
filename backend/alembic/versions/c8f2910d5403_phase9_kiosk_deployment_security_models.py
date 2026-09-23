"""phase9_kiosk_deployment_security_models

Revision ID: c8f2910d5403
Revises: b7e28a109402
Create Date: 2026-09-23 09:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f2910d5403'
down_revision = 'b7e28a109402'
branch_labels = None
depends_on = None


def upgrade():
    # 1. kiosk_devices
    op.create_table(
        'kiosk_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_uuid', sa.String(length=64), nullable=False),
        sa.Column('device_name', sa.String(length=255), nullable=False),
        sa.Column('institution', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('kiosk_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('device_key_hash', sa.String(length=64), nullable=False),
        sa.Column('registered_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('software_version', sa.String(length=50), nullable=True),
        sa.Column('configuration_version', sa.Integer(), nullable=True),
        sa.Column('hardware_fingerprint', sa.String(length=128), nullable=True),
        sa.Column('capabilities_json', sa.Text(), nullable=True),
        sa.Column('current_ip', sa.String(length=50), nullable=True),
        sa.Column('heartbeat_interval_sec', sa.Integer(), nullable=True),
        sa.Column('last_health_report_json', sa.Text(), nullable=True),
        sa.Column('maintenance_mode', sa.Boolean(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kiosk_devices_id'), 'kiosk_devices', ['id'], unique=False)
    op.create_index(op.f('ix_kiosk_devices_device_uuid'), 'kiosk_devices', ['device_uuid'], unique=True)
    op.create_index(op.f('ix_kiosk_devices_device_key_hash'), 'kiosk_devices', ['device_key_hash'], unique=False)
    op.create_index(op.f('ix_kiosk_devices_status'), 'kiosk_devices', ['status'], unique=False)
    op.create_index(op.f('ix_kiosk_devices_last_seen_at'), 'kiosk_devices', ['last_seen_at'], unique=False)
    op.create_index(op.f('ix_kiosk_devices_maintenance_mode'), 'kiosk_devices', ['maintenance_mode'], unique=False)
    op.create_index(op.f('ix_kiosk_devices_enabled'), 'kiosk_devices', ['enabled'], unique=False)

    # 2. kiosk_heartbeat_records
    op.create_table(
        'kiosk_heartbeat_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kiosk_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('cpu_percent', sa.Float(), nullable=True),
        sa.Column('ram_percent', sa.Float(), nullable=True),
        sa.Column('disk_percent', sa.Float(), nullable=True),
        sa.Column('app_health', sa.String(length=30), nullable=True),
        sa.Column('db_health', sa.String(length=30), nullable=True),
        sa.Column('search_health', sa.String(length=30), nullable=True),
        sa.Column('rag_health', sa.String(length=30), nullable=True),
        sa.Column('media_health', sa.String(length=30), nullable=True),
        sa.Column('active_errors_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['kiosk_id'], ['kiosk_devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kiosk_heartbeat_records_id'), 'kiosk_heartbeat_records', ['id'], unique=False)
    op.create_index(op.f('ix_kiosk_heartbeat_records_kiosk_id'), 'kiosk_heartbeat_records', ['kiosk_id'], unique=False)
    op.create_index(op.f('ix_kiosk_heartbeat_records_timestamp'), 'kiosk_heartbeat_records', ['timestamp'], unique=False)

    # 3. kiosk_configurations
    op.create_table(
        'kiosk_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kiosk_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('idle_timeout_seconds', sa.Integer(), nullable=True),
        sa.Column('warning_timeout_seconds', sa.Integer(), nullable=True),
        sa.Column('home_route', sa.String(length=100), nullable=True),
        sa.Column('default_language', sa.String(length=10), nullable=True),
        sa.Column('available_languages_json', sa.Text(), nullable=True),
        sa.Column('accessibility_high_contrast', sa.Boolean(), nullable=True),
        sa.Column('accessibility_font_scale', sa.String(length=20), nullable=True),
        sa.Column('allowed_collections_json', sa.Text(), nullable=True),
        sa.Column('maintenance_message', sa.String(length=500), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['kiosk_id'], ['kiosk_devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kiosk_configurations_id'), 'kiosk_configurations', ['id'], unique=False)
    op.create_index(op.f('ix_kiosk_configurations_kiosk_id'), 'kiosk_configurations', ['kiosk_id'], unique=True)

    # 4. kiosk_audit_logs
    op.create_table(
        'kiosk_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kiosk_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['kiosk_id'], ['kiosk_devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kiosk_audit_logs_id'), 'kiosk_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_kiosk_audit_logs_kiosk_id'), 'kiosk_audit_logs', ['kiosk_id'], unique=False)
    op.create_index(op.f('ix_kiosk_audit_logs_action'), 'kiosk_audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_kiosk_audit_logs_timestamp'), 'kiosk_audit_logs', ['timestamp'], unique=False)

    # 5. offline_packages
    op.create_table(
        'offline_packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('package_name', sa.String(length=255), nullable=False),
        sa.Column('package_version', sa.String(length=50), nullable=False),
        sa.Column('manifest_sha256', sa.String(length=64), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('document_count', sa.Integer(), nullable=True),
        sa.Column('media_count', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_offline_packages_id'), 'offline_packages', ['id'], unique=False)
    op.create_index(op.f('ix_offline_packages_package_version'), 'offline_packages', ['package_version'], unique=False)
    op.create_index(op.f('ix_offline_packages_status'), 'offline_packages', ['status'], unique=False)


def downgrade():
    op.drop_table('offline_packages')
    op.drop_table('kiosk_audit_logs')
    op.drop_table('kiosk_configurations')
    op.drop_table('kiosk_heartbeat_records')
    op.drop_table('kiosk_devices')
