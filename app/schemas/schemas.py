"""Pydantic схемы валидации для API."""

from pydantic import BaseModel, EmailStr, field_validator, Field
from datetime import datetime
from typing import Optional, List, Any
from app.enums import UserRole, WasteStatus, WasteClass, EventType
from decimal import Decimal
from uuid import UUID


# ============================================================================
# Organization Schemas
# ============================================================================


class OrganizationBase(BaseModel):
    """Базовая схема организации."""

    inn: str
    kpp: Optional[str] = None
    name: str


class OrganizationCreate(OrganizationBase):
    """Схема создания организации."""

    @field_validator("inn")
    @classmethod
    def validate_inn(cls, value: str) -> str:
        inn = value.strip()
        if not inn.isdigit() or len(inn) not in (10, 12):
            raise ValueError("inn must contain 10 or 12 digits")
        return inn

    @field_validator("kpp", mode="before")
    @classmethod
    def normalize_kpp(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("kpp")
    @classmethod
    def validate_kpp(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        kpp = value.strip()
        if not kpp.isdigit() or len(kpp) != 9:
            raise ValueError("kpp must contain 9 digits")
        return kpp

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("name must not be empty")
        return name


class OrganizationUpdate(BaseModel):
    """Схема обновления организации (частичное обновление)."""

    inn: Optional[str] = None
    kpp: Optional[str] = None
    name: Optional[str] = None

    @field_validator("inn")
    @classmethod
    def validate_inn(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        inn = value.strip()
        if not inn.isdigit() or len(inn) not in (10, 12):
            raise ValueError("inn must contain 10 or 12 digits")
        return inn

    @field_validator("kpp", mode="before")
    @classmethod
    def normalize_kpp(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("kpp")
    @classmethod
    def validate_kpp(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        kpp = value.strip()
        if not kpp.isdigit() or len(kpp) != 9:
            raise ValueError("kpp must contain 9 digits")
        return kpp

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        name = value.strip()
        if not name:
            raise ValueError("name must not be empty")
        return name


class OrganizationResponse(OrganizationBase):
    """Схема ответа организации."""

    id: UUID

    class Config:
        from_attributes = True


# ============================================================================
# User Schemas
# ============================================================================


class UserBase(BaseModel):
    """Базовая схема пользователя."""

    username: str
    email: str
    full_name: str
    role: UserRole


class UserCreate(UserBase):
    """Схема создания пользователя."""

    password: str
    organization_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    """Схема обновления пользователя (частичное обновление)."""

    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    organization_id: Optional[UUID] = None


class UserResponse(UserBase):
    """Схема ответа пользователя."""

    id: UUID
    organization_id: Optional[UUID] = None
    organization: Optional['OrganizationResponse'] = None

    class Config:
        from_attributes = True


# ============================================================================
# WasteType Schemas
# ============================================================================


class WasteTypeBase(BaseModel):
    """Базовая схема типа отходов."""

    code: str
    name: str
    waste_class: WasteClass
    description: Optional[str] = None


class WasteTypeCreate(WasteTypeBase):
    """Схема создания типа отходов."""

    pass


class WasteTypeUpdate(BaseModel):
    """Схема обновления типа отходов (частичное обновление)."""

    code: Optional[str] = None
    name: Optional[str] = None
    waste_class: Optional[WasteClass] = None
    description: Optional[str] = None


class WasteTypeResponse(WasteTypeBase):
    """Схема ответа типа отходов."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# WasteBatch Schemas
# ============================================================================


class WasteBatchBase(BaseModel):
    """Базовая схема партии отходов."""

    waste_type_id: UUID
    driver_id: Optional[UUID] = None
    processor_organization_id: UUID
    quantity: Decimal
    unit: str
    pickup_address: str
    delivery_address: str


class WasteBatchCreate(WasteBatchBase):
    """Схема создания партии отходов."""

    pass


class WasteBatchResponse(WasteBatchBase):
    """Схема ответа партии отходов."""

    id: UUID
    educator_id: UUID
    organization_id: UUID
    status: WasteStatus
    created_at: datetime
    updated_at: datetime
    waste_type: Optional['WasteTypeResponse'] = None

    class Config:
        from_attributes = True


class WasteBatchDetailResponse(WasteBatchResponse):
    """Подробная схема ответа партии отходов."""

    waste_type: WasteTypeResponse


# ============================================================================
# QRToken Schemas
# ============================================================================


class QRTokenCreate(BaseModel):
    """Схема создания QR токена."""

    batch_id: UUID
    lifetime_days: int = Field(default=7, ge=1, le=7)


class QRTokenResponse(BaseModel):
    """Схема ответа QR токена."""

    id: UUID
    token: str
    batch_id: UUID
    expires_at: datetime
    is_valid: bool
    scanned_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class QRTokenScanRequest(BaseModel):
    """Схема запроса сканирования QR токена."""

    token: str


class QRTokenScanResponse(BaseModel):
    """Схема ответа сканирования QR токена."""

    message: str
    batch_id: UUID
    status: WasteStatus
    waste_type_name: str
    quantity: Decimal
    unit: str
    pickup_address: str
    delivery_address: str
    educator_name: str
    educator_organization_name: str
    processor_organization_name: str
    access_expires_at: datetime


# ============================================================================
# Auth Schemas
# ============================================================================


class LoginRequest(BaseModel):
    """Схема запроса входа."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Схема ответа с токеном доступа."""

    access_token: str
    token_type: str = "bearer"


# ============================================================================
# Event Schemas
# ============================================================================


class EventResponse(BaseModel):
    """Схема ответа события."""

    id: UUID
    event_type: EventType
    user_id: Optional[UUID]
    object_type: str
    object_id: UUID
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Profile Schemas (Role-Specific)
# ============================================================================


class EducatorProfileCreate(BaseModel):
    """Схема создания профиля образователя."""

    waste_license_number: Optional[str] = None
    educator_call_address: Optional[str] = None


class EducatorProfileResponse(EducatorProfileCreate):
    """Схема ответа профиля образователя."""

    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DriverProfileCreate(BaseModel):
    """Схема создания профиля водителя."""

    vehicle_number: Optional[str] = None
    waste_license_number: Optional[str] = None


class DriverProfileResponse(DriverProfileCreate):
    """Схема ответа профиля водителя."""

    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProcessorProfileCreate(BaseModel):
    """Схема создания профиля переработчика."""

    processor_license_number: Optional[str] = None
    processor_facility_address: Optional[str] = None


class ProcessorProfileResponse(ProcessorProfileCreate):
    """Схема ответа профиля переработчика."""

    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InspectorProfileCreate(BaseModel):
    """Схема создания профиля инспектора."""

    inspector_license_number: Optional[str] = None
    department: Optional[str] = None


class InspectorProfileResponse(InspectorProfileCreate):
    """Схема ответа профиля инспектора."""

    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# User with Profile Schemas
# ============================================================================


class UserWithEducatorProfile(UserResponse):
    """Пользователь с профилем образователя."""

    educator_profile: Optional[EducatorProfileResponse] = None


class UserWithDriverProfile(UserResponse):
    """Пользователь с профилем водителя."""

    driver_profile: Optional[DriverProfileResponse] = None


class UserWithProcessorProfile(UserResponse):
    """Пользователь с профилем переработчика."""

    processor_profile: Optional[ProcessorProfileResponse] = None


class UserWithInspectorProfile(UserResponse):
    """Пользователь с профилем инспектора."""

    inspector_profile: Optional[InspectorProfileResponse] = None
