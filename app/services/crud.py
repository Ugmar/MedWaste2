"""CRUD операции для работы с данными."""

from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.models.models import (
    Organization,
    User,
    WasteType,
    WasteBatch,
    QRToken,
    Event,
    BatchStatusHistory,
    EducatorProfile,
    DriverProfile,
    ProcessorProfile,
    InspectorProfile,
)
from app.schemas.schemas import (
    OrganizationCreate,
    UserCreate,
    WasteTypeCreate,
    WasteBatchCreate,
)
from app.core.security import hash_password, generate_qr_token, is_token_expired
from app.enums import EventType, WasteStatus, UserRole
import uuid


class OrganizationService:

    @staticmethod
    async def create(db: AsyncSession, org: OrganizationCreate) -> Organization:
        db_org = Organization(**org.model_dump(), id=uuid.uuid4())
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return db_org

    @staticmethod
    async def get_by_id(db: AsyncSession, org_id: UUID) -> Organization | None:
        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_inn(db: AsyncSession, inn: str) -> Organization | None:
        result = await db.execute(
            select(Organization).where(Organization.inn == inn)
        )
        return result.scalars().first()

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Organization]:
        result = await db.execute(
            select(Organization).offset(skip).limit(limit)
        )
        return result.scalars().all()


class UserService:

    @staticmethod
    async def create(db: AsyncSession, user: UserCreate) -> User:
        db_user = User(
            **user.model_dump(exclude={"password"}),
            password_hash=hash_password(user.password),
            id=uuid.uuid4(),
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> User | None:
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalars().first()

    @staticmethod
    async def get_all_by_organization(
        db: AsyncSession, org_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[User]:
        result = await db.execute(
            select(User)
            .where(User.organization_id == org_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_drivers(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> list[User]:
        result = await db.execute(
            select(User)
            .where(User.role == UserRole.DRIVER)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_drivers_by_organization(
        db: AsyncSession, org_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[User]:
        result = await db.execute(
            select(User)
            .where(
                User.organization_id == org_id,
                User.role == UserRole.DRIVER,
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()


class WasteTypeService:

    @staticmethod
    async def create(db: AsyncSession, waste_type: WasteTypeCreate) -> WasteType:
        db_wt = WasteType(**waste_type.model_dump(), id=uuid.uuid4())
        db.add(db_wt)
        await db.commit()
        await db.refresh(db_wt)
        return db_wt

    @staticmethod
    async def get_by_id(db: AsyncSession, waste_type_id: UUID) -> WasteType | None:
        result = await db.execute(
            select(WasteType).where(WasteType.id == waste_type_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_code(db: AsyncSession, code: str) -> WasteType | None:
        result = await db.execute(
            select(WasteType).where(WasteType.code == code)
        )
        return result.scalars().first()

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[WasteType]:
        result = await db.execute(
            select(WasteType).offset(skip).limit(limit)
        )
        return result.scalars().all()


class WasteBatchService:

    @staticmethod
    async def create(
        db: AsyncSession,
        batch: WasteBatchCreate,
        educator_id: UUID,
        organization_id: UUID,
    ) -> WasteBatch:
        db_batch = WasteBatch(
            **batch.model_dump(),
            educator_id=educator_id,
            organization_id=organization_id,
            id=uuid.uuid4(),
            status=WasteStatus.CREATED,
        )
        db.add(db_batch)
        await db.commit()
        await db.refresh(db_batch)
        return db_batch

    @staticmethod
    async def get_by_id(db: AsyncSession, batch_id: UUID) -> WasteBatch | None:
        result = await db.execute(
            select(WasteBatch)
            .options(
                selectinload(WasteBatch.waste_type),
                selectinload(WasteBatch.educator),
                selectinload(WasteBatch.organization),
                selectinload(WasteBatch.processor_organization),
            )
            .where(WasteBatch.id == batch_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_all_by_educator(
        db: AsyncSession, educator_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[WasteBatch]:
        result = await db.execute(
            select(WasteBatch)
            .where(WasteBatch.educator_id == educator_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_all_by_organization(
        db: AsyncSession, org_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[WasteBatch]:
        result = await db.execute(
            select(WasteBatch)
            .options(selectinload(WasteBatch.waste_type))
            .where(WasteBatch.organization_id == org_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_all_by_processor_organization(
        db: AsyncSession, processor_org_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[WasteBatch]:
        result = await db.execute(
            select(WasteBatch)
            .options(selectinload(WasteBatch.waste_type))
            .where(WasteBatch.processor_organization_id == processor_org_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def update_status(
        db: AsyncSession, batch_id: UUID, new_status: WasteStatus, user_id: UUID | None = None
    ) -> WasteBatch | None:
        """Обновить статус партии."""
        db_batch = await WasteBatchService.get_by_id(db, batch_id)
        if db_batch:
            old_status = db_batch.status
            if old_status == new_status:
                return db_batch

            allowed_transitions = {
                WasteStatus.CREATED: {WasteStatus.IN_TRANSIT},
                WasteStatus.IN_TRANSIT: {WasteStatus.RECEIVED},
                WasteStatus.RECEIVED: set(),
            }
            if new_status not in allowed_transitions.get(old_status, set()):
                raise ValueError(
                    f"Недопустимый переход статуса: {old_status.value} -> {new_status.value}"
                )

            db_batch.status = new_status
            db_batch.updated_at = datetime.utcnow()

            history_entry = BatchStatusHistory(
                id=uuid.uuid4(),
                batch_id=db_batch.id,
                old_status=old_status,
                new_status=new_status,
                changed_at=datetime.utcnow(),
                changed_by_id=user_id,
            )
            db.add(history_entry)

            await db.commit()
            await db.refresh(db_batch)
        return db_batch


class QRTokenService:

    @staticmethod
    async def create(db: AsyncSession, batch_id: UUID, lifetime_days: int = 7) -> QRToken:
        existing_result = await db.execute(
            select(QRToken).where(QRToken.batch_id == batch_id)
        )
        existing_token = existing_result.scalars().first()
        if existing_token:
            raise ValueError("Для этой партии уже выпущен QR токен")

        token = generate_qr_token()
        expires_at = datetime.utcnow() + timedelta(days=lifetime_days)
        db_token = QRToken(
            id=uuid.uuid4(),
            token=token,
            batch_id=batch_id,
            expires_at=expires_at,
            is_valid=True,
        )
        db.add(db_token)
        await db.commit()
        await db.refresh(db_token)
        return db_token

    @staticmethod
    async def get_by_token(db: AsyncSession, token: str) -> QRToken | None:
        result = await db.execute(
            select(QRToken).where(QRToken.token == token)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_id(db: AsyncSession, token_id: UUID) -> QRToken | None:
        result = await db.execute(
            select(QRToken).where(QRToken.id == token_id)
        )
        return result.scalars().first()

    @staticmethod
    async def scan_token(db: AsyncSession, token: str) -> QRToken | None:
        db_token = await QRTokenService.get_by_token(db, token)
        if (
            db_token
            and db_token.is_valid
            and not is_token_expired(db_token.expires_at)
        ):
            db_token.scanned_count += 1
            await db.commit()
            await db.refresh(db_token)
            return db_token
        return None

    @staticmethod
    async def get_all_by_batch(
        db: AsyncSession, batch_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[QRToken]:
        result = await db.execute(
            select(QRToken)
            .where(QRToken.batch_id == batch_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()


class EventService:

    @staticmethod
    async def log_event(
        db: AsyncSession,
        event_type: EventType,
        user_id: UUID | None,
        object_type: str,
        object_id: UUID,
        description: str = None,
    ) -> Event:
        event = Event(
            id=uuid.uuid4(),
            event_type=event_type,
            user_id=user_id,
            object_type=object_type,
            object_id=object_id,
            description=description,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event


class EducatorProfileService:

    @staticmethod
    async def create_or_update(
        db: AsyncSession, user_id: UUID, waste_license_number: str = None, educator_call_address: str = None
    ) -> EducatorProfile:
        result = await db.execute(
            select(EducatorProfile).where(EducatorProfile.user_id == user_id)
        )
        profile = result.scalars().first()

        if profile:
            profile.waste_license_number = waste_license_number
            profile.educator_call_address = educator_call_address
            profile.updated_at = datetime.utcnow()
        else:
            profile = EducatorProfile(
                user_id=user_id,
                waste_license_number=waste_license_number,
                educator_call_address=educator_call_address,
            )
            db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: UUID) -> EducatorProfile | None:
        result = await db.execute(
            select(EducatorProfile).where(EducatorProfile.user_id == user_id)
        )
        return result.scalars().first()


class DriverProfileService:

    @staticmethod
    async def create_or_update(
        db: AsyncSession, user_id: UUID, vehicle_number: str = None, waste_license_number: str = None
    ) -> DriverProfile:
        result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == user_id)
        )
        profile = result.scalars().first()

        if profile:
            profile.vehicle_number = vehicle_number
            profile.waste_license_number = waste_license_number
            profile.updated_at = datetime.utcnow()
        else:
            profile = DriverProfile(
                user_id=user_id,
                vehicle_number=vehicle_number,
                waste_license_number=waste_license_number,
            )
            db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: UUID) -> DriverProfile | None:
        result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == user_id)
        )
        return result.scalars().first()


class ProcessorProfileService:

    @staticmethod
    async def create_or_update(
        db: AsyncSession, user_id: UUID, processor_license_number: str = None, processor_facility_address: str = None
    ) -> ProcessorProfile:
        result = await db.execute(
            select(ProcessorProfile).where(ProcessorProfile.user_id == user_id)
        )
        profile = result.scalars().first()

        if profile:
            profile.processor_license_number = processor_license_number
            profile.processor_facility_address = processor_facility_address
            profile.updated_at = datetime.utcnow()
        else:
            profile = ProcessorProfile(
                user_id=user_id,
                processor_license_number=processor_license_number,
                processor_facility_address=processor_facility_address,
            )
            db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: str) -> ProcessorProfile | None:
        result = await db.execute(
            select(ProcessorProfile).where(ProcessorProfile.user_id == user_id)
        )
        return result.scalars().first()


class InspectorProfileService:

    @staticmethod
    async def create_or_update(
        db: AsyncSession, user_id: str, inspector_license_number: str = None, department: str = None
    ) -> InspectorProfile:
        """Создать или обновить профиль инспектора."""
        result = await db.execute(
            select(InspectorProfile).where(InspectorProfile.user_id == user_id)
        )
        profile = result.scalars().first()

        if profile:
            profile.inspector_license_number = inspector_license_number
            profile.department = department
            profile.updated_at = datetime.utcnow()
        else:
            profile = InspectorProfile(
                user_id=user_id,
                inspector_license_number=inspector_license_number,
                department=department,
            )
            db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: str) -> InspectorProfile | None:
        result = await db.execute(
            select(InspectorProfile).where(InspectorProfile.user_id == user_id)
        )
        return result.scalars().first()
