"""add_api_export_tables

Revision ID: d5f7e8a9b2c3
Revises: c896eee6d4b0
Create Date: 2025-10-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5f7e8a9b2c3'
down_revision: Union[str, None] = 'c896eee6d4b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create extractor_api_keys table
    op.create_table(
        'extractor_api_keys',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('extractor_id', sa.Integer(), nullable=False),
        sa.Column('api_key', sa.String(128), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['extractor_id'], ['extractors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('extractor_id'),
        sa.UniqueConstraint('api_key')
    )
    op.create_index('ix_extractor_api_keys_extractor_id', 'extractor_api_keys', ['extractor_id'])
    op.create_index('ix_extractor_api_keys_api_key', 'extractor_api_keys', ['api_key'])

    # Create api_extraction_jobs table
    op.create_table(
        'api_extraction_jobs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('job_id', sa.String(128), nullable=False),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('extractor_id', sa.Integer(), nullable=False),
        sa.Column('requester_user_id', sa.Integer(), nullable=False),
        sa.Column('request_label', sa.String(512), nullable=False),
        sa.Column('file_name', sa.String(512), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('result_content', sa.Text(), nullable=True),
        sa.Column('result_path', sa.String(1024), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('cached_tokens', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(128), nullable=True),
        sa.Column('is_cached_result', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['api_key_id'], ['extractor_api_keys.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['extractor_id'], ['extractors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requester_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id')
    )
    op.create_index('ix_api_extraction_jobs_job_id', 'api_extraction_jobs', ['job_id'])
    op.create_index('ix_api_extraction_jobs_api_key_id', 'api_extraction_jobs', ['api_key_id'])
    op.create_index('ix_api_extraction_jobs_extractor_id', 'api_extraction_jobs', ['extractor_id'])
    op.create_index('ix_api_extraction_jobs_requester_user_id', 'api_extraction_jobs', ['requester_user_id'])
    op.create_index('ix_api_extraction_jobs_created_at', 'api_extraction_jobs', ['created_at'])


def downgrade() -> None:
    # Drop api_extraction_jobs table
    op.drop_index('ix_api_extraction_jobs_created_at', 'api_extraction_jobs')
    op.drop_index('ix_api_extraction_jobs_requester_user_id', 'api_extraction_jobs')
    op.drop_index('ix_api_extraction_jobs_extractor_id', 'api_extraction_jobs')
    op.drop_index('ix_api_extraction_jobs_api_key_id', 'api_extraction_jobs')
    op.drop_index('ix_api_extraction_jobs_job_id', 'api_extraction_jobs')
    op.drop_table('api_extraction_jobs')

    # Drop extractor_api_keys table
    op.drop_index('ix_extractor_api_keys_api_key', 'extractor_api_keys')
    op.drop_index('ix_extractor_api_keys_extractor_id', 'extractor_api_keys')
    op.drop_table('extractor_api_keys')
