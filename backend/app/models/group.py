"""
Group Hisab Models (Shared Expenses)
"""

from sqlalchemy import String, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

class Group(BaseModel):
    __tablename__ = "groups"

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("GroupExpense", back_populates="group", cascade="all, delete-orphan")

class GroupMember(BaseModel):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    group = relationship("Group", back_populates="members")
    user = relationship("User")

class GroupExpense(BaseModel):
    __tablename__ = "group_expenses"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=False, index=True)
    paid_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    
    group = relationship("Group", back_populates="expenses")
    splits = relationship("GroupExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class GroupExpenseSplit(BaseModel):
    __tablename__ = "group_expense_splits"

    expense_id: Mapped[int] = mapped_column(ForeignKey("group_expenses.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount_owed: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    expense = relationship("GroupExpense", back_populates="splits")
