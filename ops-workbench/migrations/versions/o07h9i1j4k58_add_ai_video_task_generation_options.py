"""add ai video task generation options

Revision ID: o07h9i1j4k58
Revises: n06g8h0i3j47
Create Date: 2026-08-20
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "o07h9i1j4k58"
down_revision = "n06g8h0i3j47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("wb_ai_video_generation_tasks", sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("wb_ai_video_generation_tasks", sa.Column("aspect_ratio", sa.String(length=20), nullable=False, server_default="9:16"))
    op.add_column("wb_ai_video_generation_tasks", sa.Column("resolution", sa.String(length=20), nullable=False, server_default="720p"))


def downgrade() -> None:
    op.drop_column("wb_ai_video_generation_tasks", "resolution")
    op.drop_column("wb_ai_video_generation_tasks", "aspect_ratio")
    op.drop_column("wb_ai_video_generation_tasks", "duration_seconds")
