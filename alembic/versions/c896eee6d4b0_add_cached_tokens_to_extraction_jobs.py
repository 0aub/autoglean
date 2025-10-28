"""add_cached_tokens_to_extraction_jobs

Revision ID: c896eee6d4b0
Revises: 
Create Date: 2025-10-20 06:36:04.799872

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c896eee6d4b0'
down_revision: Union[str, None] = '16883bbf4217'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cached_tokens column to extraction_jobs table
    op.add_column('extraction_jobs', sa.Column('cached_tokens', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove cached_tokens column from extraction_jobs table
    op.drop_column('extraction_jobs', 'cached_tokens')
