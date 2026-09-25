"""
Expense Model
"""

from datetime import date

from sqlalchemy import String, Numeric, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Expense(BaseModel):
    __tablename__ = "expenses"

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

    amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    expense_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    quantity: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )

    unit_price: Mapped[float | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    is_recurring: Mapped[bool | None] = mapped_column(
        Boolean,
        default=False,
        nullable=True,
    )

    recurrence_frequency: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    next_due_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    receipt_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    organization = relationship("Organization")
    user = relationship("User")