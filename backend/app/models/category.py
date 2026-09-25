"""
Category Model
"""

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Category(BaseModel):
    __tablename__ = "categories"

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

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    color: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    icon: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    organization = relationship("Organization")
    user = relationship("User")
