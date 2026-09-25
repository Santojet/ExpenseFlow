"""
Debt and Loan Model
"""

from datetime import date
from sqlalchemy import String, Numeric, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Debt(BaseModel):
    __tablename__ = "debts"

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

    person_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # "lent" = I gave money (asset/receivable)
    # "borrowed" = I received money (liability/payable)
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="lent",
    )

    amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    paid_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.00,
        nullable=False,
    )

    due_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    # "pending", "partial", "settled"
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    organization = relationship("Organization")
    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "person_name": self.person_name,
            "phone": self.phone or "",
            "type": self.type,
            "amount": float(self.amount),
            "paid_amount": float(self.paid_amount) if self.paid_amount is not None else 0.0,
            "remaining_amount": max(0.0, float(self.amount) - (float(self.paid_amount) if self.paid_amount is not None else 0.0)),
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
