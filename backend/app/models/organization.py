"""
Organization Model
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Organization(BaseModel):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    logo: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        default="BDT",
        nullable=False,
    )

    timezone: Mapped[str] = mapped_column(
        String(50),
        default="Asia/Dhaka",
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    users = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan",
    )