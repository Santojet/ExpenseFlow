"""
Budget Model — Monthly spending limit per category
"""

from sqlalchemy import String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Budget(BaseModel):
    __tablename__ = "budgets"

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", "category", "month", name="uq_budget_user_category_month"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Format: "YYYY-MM" e.g. "2026-09"
    month: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
    )

    monthly_limit: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    organization = relationship("Organization")
    user = relationship("User")
