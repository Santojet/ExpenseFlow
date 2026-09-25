"""Add password reset code fields to users

Revision ID: 9f1a2c7d3e4b
Revises: 22b18aaf4cb1
Create Date: 2026-09-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f1a2c7d3e4b'
down_revision = '22b18aaf4cb1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('reset_code_hash', sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column('reset_code_expires_at', sa.DateTime(), nullable=True)
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('reset_code_expires_at')
        batch_op.drop_column('reset_code_hash')
