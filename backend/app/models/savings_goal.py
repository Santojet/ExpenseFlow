"""
SavingsGoal Model — User-defined financial targets
"""

from datetime import date
from typing import Optional

from sqlalchemy import String, Numeric, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class SavingsGoal(BaseModel):
    __tablename__ = "savings_goals"

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

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    target_amount: Mapped[float] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    target_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    organization = relationship("Organization")
    user = relationship("User")
