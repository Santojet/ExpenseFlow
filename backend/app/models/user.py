"""
User Model
"""

import json
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    # Roles: "user" | "admin" | "super_admin"
    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )

    # Granular permissions JSON — only meaningful for role="admin"
    # Example: '{"can_reset_password":true,"can_toggle_status":true}'
    permissions: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Password reset fields
    reset_code_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    reset_code_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    # Timestamp when a user requested a password reset (pending admin action)
    reset_requested_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    organization = relationship(
        "Organization",
        back_populates="users",
    )

    salaries = relationship(
        "Salary",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def get_permissions(self) -> dict:
        """Parse permissions JSON; return defaults based on role."""
        if self.role == "super_admin":
            return {
                "can_reset_password": True,
                "can_toggle_status": True,
                "can_create_users": True,
                "can_delete_users": True,
                "can_manage_expenses": True,
                "can_manage_salary": True,
            }
        if self.role == "admin":
            defaults = {
                "can_reset_password": True,
                "can_toggle_status": True,
                "can_create_users": False,
                "can_delete_users": False,
                "can_manage_expenses": True,
                "can_manage_salary": True,
            }
            if self.permissions:
                try:
                    stored = json.loads(self.permissions)
                    defaults.update(stored)
                except (ValueError, TypeError):
                    pass
            return defaults
        # regular user
        return {
            "can_reset_password": False,
            "can_toggle_status": False,
            "can_create_users": False,
            "can_delete_users": False,
            "can_manage_expenses": False,
            "can_manage_salary": False,
        }