"""Database models for AutoGlean multi-user system."""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime, ForeignKey,
    Index, CheckConstraint, Enum as SQLEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from autoglean.db.base import Base


class VisibilityEnum(str, enum.Enum):
    """Extractor visibility options."""
    PUBLIC = "public"
    PRIVATE = "private"
    SHARED = "shared"


class GeneralManagement(Base):
    """General Management table - top level organizational units."""
    __tablename__ = "general_managements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_ar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    departments = relationship("Department", back_populates="general_management")

    def __repr__(self):
        return f"<GeneralManagement(id={self.id}, name_en='{self.name_en}', name_ar='{self.name_ar}')>"


class Department(Base):
    """Department table - departments within general managements."""
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    gm_id: Mapped[int] = mapped_column(Integer, ForeignKey("general_managements.id"), nullable=False)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_ar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    general_management = relationship("GeneralManagement", back_populates="departments")
    users = relationship("User", back_populates="department")

    # Unique constraint: department name must be unique within a GM
    __table_args__ = (
        Index('ix_dept_name_gm', 'name_en', 'name_ar', 'gm_id', unique=True),
    )

    def __repr__(self):
        return f"<Department(id={self.id}, name_en='{self.name_en}', name_ar='{self.name_ar}', gm_id={self.gm_id})>"


class User(Base):
    """User table - hardcoded users for the system."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    department = relationship("Department", back_populates="users")
    extractors = relationship("Extractor", back_populates="owner", foreign_keys="Extractor.owner_id")
    shared_extractors = relationship("ExtractorShare", back_populates="user")
    favorites = relationship("UserFavorite", back_populates="user")
    extraction_jobs = relationship("ExtractionJob", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', full_name_en='{self.full_name_en}', full_name_ar='{self.full_name_ar}')>"


class Extractor(Base):
    """Extractor table - user-owned extractors with visibility control."""
    __tablename__ = "extractors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    extractor_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="File")
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_ar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Owner
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Visibility
    visibility: Mapped[VisibilityEnum] = mapped_column(
        SQLEnum(VisibilityEnum, name="visibility_enum"),
        default=VisibilityEnum.PRIVATE,
        nullable=False,
        index=True
    )

    # LLM Configuration
    llm: Mapped[str] = mapped_column(String(100), nullable=False, default="gemini-flash")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    output_format: Mapped[str] = mapped_column(String(50), nullable=False, default="markdown")
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)

    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="extractors", foreign_keys=[owner_id])
    shares = relationship("ExtractorShare", back_populates="extractor", cascade="all, delete-orphan")
    favorites = relationship("UserFavorite", back_populates="extractor", cascade="all, delete-orphan")
    history = relationship("ExtractorHistory", back_populates="extractor", cascade="all, delete-orphan")
    jobs = relationship("ExtractionJob", back_populates="extractor")
    usage_stats = relationship("ExtractorUsageStats", back_populates="extractor", uselist=False, cascade="all, delete-orphan")
    ratings = relationship("ExtractorRating", back_populates="extractor", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_extractor_owner_visibility", "owner_id", "visibility"),
    )

    def __repr__(self):
        return f"<Extractor(id={self.id}, extractor_id='{self.extractor_id}', name_en='{self.name_en}', name_ar='{self.name_ar}', owner_id={self.owner_id})>"


class ExtractorShare(Base):
    """Extractor sharing table - tracks which users have access to shared extractors."""
    __tablename__ = "extractor_shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shared_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    extractor = relationship("Extractor", back_populates="shares")
    user = relationship("User", back_populates="shared_extractors")

    __table_args__ = (
        Index("idx_extractor_share_unique", "extractor_id", "user_id", unique=True),
    )

    def __repr__(self):
        return f"<ExtractorShare(extractor_id={self.extractor_id}, user_id={self.user_id})>"


class UserFavorite(Base):
    """User favorites table - tracks user's favorite extractors."""
    __tablename__ = "user_favorites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="favorites")
    extractor = relationship("Extractor", back_populates="favorites")

    __table_args__ = (
        Index("idx_user_favorite_unique", "user_id", "extractor_id", unique=True),
    )

    def __repr__(self):
        return f"<UserFavorite(user_id={self.user_id}, extractor_id={self.extractor_id})>"


class ExtractorHistory(Base):
    """Extractor history table - tracks all changes to extractors."""
    __tablename__ = "extractor_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)  # created, updated, deleted, visibility_changed
    changes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string of changes
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    extractor = relationship("Extractor", back_populates="history")
    changed_by = relationship("User")

    def __repr__(self):
        return f"<ExtractorHistory(id={self.id}, extractor_id={self.extractor_id}, change_type='{self.change_type}')>"


class ExtractionJob(Base):
    """Extraction jobs table - tracks all extraction operations."""
    __tablename__ = "extraction_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id"), nullable=False, index=True)

    # File information
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # in bytes

    # Job status
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)  # pending, processing, success, failure
    result_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_cached_result: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True if result was reused from cache

    # LLM Usage
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cached_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Cached prompt tokens
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timing
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="extraction_jobs")
    extractor = relationship("Extractor", back_populates="jobs")

    __table_args__ = (
        Index("idx_job_user_created", "user_id", "created_at"),
        Index("idx_job_extractor_created", "extractor_id", "created_at"),
    )

    def __repr__(self):
        return f"<ExtractionJob(id={self.id}, job_id='{self.job_id}', status='{self.status}')>"


class ExtractorUsageStats(Base):
    """Extractor usage statistics table - aggregated stats for leaderboard."""
    __tablename__ = "extractor_usage_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Usage statistics
    total_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    successful_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Ratings
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)

    # Tokens
    total_tokens_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timing
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    extractor = relationship("Extractor", back_populates="usage_stats")

    def __repr__(self):
        return f"<ExtractorUsageStats(extractor_id={self.extractor_id}, total_uses={self.total_uses})>"


class ExtractorRating(Base):
    """Extractor ratings table - user ratings for extractors."""
    __tablename__ = "extractor_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    extractor_id: Mapped[int] = mapped_column(Integer, ForeignKey("extractors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5 stars
    review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    extractor = relationship("Extractor", back_populates="ratings")
    user = relationship("User")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
        Index("idx_extractor_rating_unique", "extractor_id", "user_id", unique=True),
    )

    def __repr__(self):
        return f"<ExtractorRating(extractor_id={self.extractor_id}, user_id={self.user_id}, rating={self.rating})>"
