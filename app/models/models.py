"""SQLAlchemy модели для работы с БД."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Enum,
    Numeric,
    Boolean,
    Uuid,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.enums import UserRole, WasteStatus, WasteClass, EventType
import uuid


class Organization(Base):
    """Организация (учреждение медицины, переработчик и т.д.)."""

    __tablename__ = "organizations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    inn = Column(String(12), unique=True, nullable=False)
    kpp = Column(String(9), nullable=True)
    name = Column(String(255), nullable=False)

    # Отношения
    users = relationship(
        "User", back_populates="organization", cascade="all, delete-orphan"
    )
    batches = relationship(
        "WasteBatch",
        foreign_keys="WasteBatch.organization_id",
        back_populates="organization",
    )
    processor_batches = relationship(
        "WasteBatch",
        foreign_keys="WasteBatch.processor_organization_id",
        back_populates="processor_organization",
    )


class User(Base):
    """Пользователь системы (базовая информация)."""

    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    organization_id = Column(Uuid, ForeignKey(
        "organizations.id"), nullable=False)

    # Отношения
    organization = relationship("Organization", back_populates="users")
    batches = relationship(
        "WasteBatch",
        foreign_keys="WasteBatch.educator_id",
        back_populates="educator",
    )
    assigned_batches = relationship(
        "WasteBatch",
        foreign_keys="WasteBatch.driver_id",
        back_populates="driver",
    )
    events = relationship("Event", back_populates="user")
    educator_profile = relationship(
        "EducatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    driver_profile = relationship(
        "DriverProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    processor_profile = relationship(
        "ProcessorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    inspector_profile = relationship(
        "InspectorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class WasteType(Base):
    """Тип отходов (класс опасности и описание)."""

    __tablename__ = "waste_types"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    waste_class = Column(Enum(WasteClass), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    batches = relationship("WasteBatch", back_populates="waste_type")


class WasteBatch(Base):
    """Партия отходов для переработки."""

    __tablename__ = "waste_batches"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    waste_type_id = Column(Uuid, ForeignKey("waste_types.id"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(20), nullable=False)
    educator_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    driver_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    organization_id = Column(Uuid, ForeignKey(
        "organizations.id"), nullable=False)
    processor_organization_id = Column(
        Uuid, ForeignKey("organizations.id"), nullable=False)
    pickup_address = Column(Text, nullable=False)
    delivery_address = Column(Text, nullable=False)
    status = Column(Enum(WasteStatus),
                    default=WasteStatus.CREATED, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    waste_type = relationship("WasteType", back_populates="batches")
    educator = relationship("User", foreign_keys=[
                            educator_id], back_populates="batches")
    driver = relationship("User", foreign_keys=[
                          driver_id], back_populates="assigned_batches")
    organization = relationship("Organization", foreign_keys=[
                                organization_id], back_populates="batches")
    processor_organization = relationship(
        "Organization",
        foreign_keys=[processor_organization_id],
        back_populates="processor_batches",
    )
    qr_tokens = relationship(
        "QRToken", back_populates="batch", cascade="all, delete-orphan")
    status_history = relationship(
        "BatchStatusHistory", back_populates="batch", cascade="all, delete-orphan"
    )


class QRToken(Base):
    """QR токен для отслеживания партии отходов."""

    __tablename__ = "qr_tokens"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    token = Column(String(255), unique=True, nullable=False)
    batch_id = Column(Uuid, ForeignKey("waste_batches.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scanned_count = Column(Integer, default=0)

    # Отношения
    batch = relationship("WasteBatch", back_populates="qr_tokens")


class BatchStatusHistory(Base):
    """История изменений статуса партии."""

    __tablename__ = "batch_status_history"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id = Column(Uuid, ForeignKey("waste_batches.id"), nullable=False)
    old_status = Column(Enum(WasteStatus), nullable=True)
    new_status = Column(Enum(WasteStatus), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by_id = Column(Uuid, ForeignKey("users.id"), nullable=True)

    # Отношения
    batch = relationship("WasteBatch", back_populates="status_history")


class Event(Base):
    """Событие в журнале аудита."""

    __tablename__ = "events"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    event_type = Column(Enum(EventType), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    object_type = Column(String(50), nullable=False)
    object_id = Column(Uuid, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="events")


# ============================================================================
# Role-Specific Profile Tables (JOIN Inheritance)
# ============================================================================


class EducatorProfile(Base):
    """Профиль образователя (учреждение медицины)."""

    __tablename__ = "educator_profiles"

    user_id = Column(Uuid, ForeignKey("users.id"), primary_key=True)
    waste_license_number = Column(String(50), nullable=True)
    educator_call_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="educator_profile")


class DriverProfile(Base):
    """Профиль водителя (транспортировка)."""

    __tablename__ = "driver_profiles"

    user_id = Column(Uuid, ForeignKey("users.id"), primary_key=True)
    vehicle_number = Column(String(20), nullable=True)
    waste_license_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="driver_profile")


class ProcessorProfile(Base):
    """Профиль переработчика (утилизация)."""

    __tablename__ = "processor_profiles"

    user_id = Column(Uuid, ForeignKey("users.id"), primary_key=True)
    processor_license_number = Column(String(50), nullable=True)
    processor_facility_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="processor_profile")


class InspectorProfile(Base):
    """Профиль инспектора (надзор)."""

    __tablename__ = "inspector_profiles"

    user_id = Column(Uuid, ForeignKey("users.id"), primary_key=True)
    inspector_license_number = Column(String(50), nullable=True)
    department = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="inspector_profile")
