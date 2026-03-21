#!/usr/bin/env python3
"""Инициализация БД с полным набором тестовых данных."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import engine, Base, async_session
from app.models.models import (
    Organization, User, WasteType, WasteBatch, QRToken,
    BatchStatusHistory, Event, EducatorProfile, DriverProfile,
    ProcessorProfile, InspectorProfile
)
from app.schemas.schemas import (
    OrganizationCreate,
    UserCreate,
    WasteTypeCreate,
    WasteBatchCreate,
)
from app.enums import UserRole, WasteStatus, WasteClass, EventType
from app.core.security import hash_password, generate_qr_token


def get_utc_now() -> datetime:
    """Получить текущее UTC время без timezone информации для PostgreSQL."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def init_db():
    """Инициализировать БД с тестовыми данными."""
    print("📦 Создание таблиц БД...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Таблицы созданы\n")

    async with async_session() as db:
        try:
            # =====================================================================
            # 1. ОРГАНИЗАЦИИ
            # =====================================================================
            print("🏢 Создание организаций...")

            orgs_data = [
                {"inn": "7700000000", "kpp": "770000001",
                    "name": "Администрация MedWaste"},
                {"inn": "7701000000", "kpp": "770100001",
                    "name": "Больница №1 'Скорая помощь'"},
                {"inn": "7702000000", "kpp": "770200001",
                    "name": "Клиника 'Здоровье'"},
                {"inn": "7703000000", "kpp": "770300001",
                    "name": "Завод переработки отходов 'ЭкоПро'"},
                {"inn": "7704000000", "kpp": "770400001",
                    "name": "Центр утилизации медотходов"},
            ]

            organizations = {}
            for org_data in orgs_data:
                result = await db.execute(
                    select(Organization).where(
                        Organization.inn == org_data["inn"])
                )
                existing_org = result.scalars().first()
                if not existing_org:
                    org = Organization(
                        id=uuid.uuid4(),
                        inn=org_data["inn"],
                        kpp=org_data["kpp"],
                        name=org_data["name"],
                    )
                    db.add(org)
                    organizations[org_data["name"]] = org
                else:
                    organizations[org_data["name"]] = existing_org

            await db.commit()
            print(f"✅ Создано {len(organizations)} организаций\n")

            # =====================================================================
            # 2. ТИПЫ ОТХОДОВ
            # =====================================================================
            print("🗑️  Создание типов отходов...")

            waste_types_data = [
                {"code": "MED_001", "name": "Перчатки медицинские",
                    "waste_class": WasteClass.CLASS_2},
                {"code": "MED_002", "name": "Маски медицинские",
                    "waste_class": WasteClass.CLASS_2},
                {"code": "MED_003", "name": "Сыворотка крови",
                    "waste_class": WasteClass.CLASS_1},
                {"code": "MED_004", "name": "Шприцы использованные",
                    "waste_class": WasteClass.CLASS_1},
                {"code": "MED_005", "name": "Повязки, бинты",
                    "waste_class": WasteClass.CLASS_2},
                {"code": "MED_006", "name": "Инструменты",
                    "waste_class": WasteClass.CLASS_3},
            ]

            waste_types = {}
            for wt_data in waste_types_data:
                result = await db.execute(
                    select(WasteType).where(WasteType.code == wt_data["code"])
                )
                existing_wt = result.scalars().first()
                if not existing_wt:
                    wt = WasteType(
                        id=uuid.uuid4(),
                        code=wt_data["code"],
                        name=wt_data["name"],
                        waste_class=wt_data["waste_class"],
                        created_at=get_utc_now(),
                        updated_at=get_utc_now(),
                    )
                    db.add(wt)
                    waste_types[wt_data["code"]] = wt
                else:
                    waste_types[wt_data["code"]] = existing_wt

            await db.commit()
            print(f"✅ Создано {len(waste_types)} типов отходов\n")

            # =====================================================================
            # 3. ПОЛЬЗОВАТЕЛИ
            # =====================================================================
            print("👥 Создание пользователей...")

            users_data = [
                {"username": "admin", "email": "admin@medwaste.local", "full_name": "System Administrator",
                    "role": UserRole.ADMIN, "org_name": "Администрация MedWaste"},
                {"username": "educator_1", "email": "educator1@medwaste.local", "full_name": "Educator One",
                    "role": UserRole.EDUCATOR, "org_name": "Больница №1 'Скорая помощь'"},
                {"username": "educator_2", "email": "educator2@medwaste.local",
                    "full_name": "Educator Two", "role": UserRole.EDUCATOR, "org_name": "Клиника 'Здоровье'"},
                {"username": "driver_1", "email": "driver1@medwaste.local", "full_name": "Driver One",
                    "role": UserRole.DRIVER, "org_name": "Завод переработки отходов 'ЭкоПро'"},
                {"username": "driver_2", "email": "driver2@medwaste.local", "full_name": "Driver Two",
                    "role": UserRole.DRIVER, "org_name": "Центр утилизации медотходов"},
                {"username": "processor_1", "email": "processor1@medwaste.local", "full_name": "Processor One",
                    "role": UserRole.PROCESSOR, "org_name": "Завод переработки отходов 'ЭкоПро'"},
                {"username": "processor_2", "email": "processor2@medwaste.local", "full_name": "Processor Two",
                    "role": UserRole.PROCESSOR, "org_name": "Центр утилизации медотходов"},
                {"username": "inspector_1", "email": "inspector1@medwaste.local", "full_name": "Inspector One",
                    "role": UserRole.INSPECTOR, "org_name": "Администрация MedWaste"},
            ]

            users = {}
            for user_data in users_data:
                result = await db.execute(
                    select(User).where(User.username == user_data["username"])
                )
                existing_user = result.scalars().first()
                if not existing_user:
                    user = User(
                        id=uuid.uuid4(),
                        username=user_data["username"],
                        email=user_data["email"],
                        full_name=user_data["full_name"],
                        password_hash=hash_password("password123"),
                        role=user_data["role"],
                        organization_id=organizations[user_data["org_name"]].id,
                    )
                    db.add(user)
                    users[user_data["username"]] = user
                else:
                    users[user_data["username"]] = existing_user

            await db.commit()
            print(f"✅ Создано {len(users)} пользователей\n")

            # =====================================================================
            # 4. ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
            # =====================================================================
            print("📋 Создание профилей пользователей...")

            # Educator profiles
            for username in ["educator_1", "educator_2"]:
                user = users[username]
                result = await db.execute(
                    select(EducatorProfile).where(
                        EducatorProfile.user_id == user.id)
                )
                existing_profile = result.scalars().first()
                if not existing_profile:
                    profile = EducatorProfile(
                        user_id=user.id,
                        waste_license_number=f"EDUCATOR-{username[-1]}-2024",
                        educator_call_address=f"Офис МО:  {username}",
                    )
                    db.add(profile)

            # Driver profiles
            for username in ["driver_1", "driver_2"]:
                user = users[username]
                result = await db.execute(
                    select(DriverProfile).where(
                        DriverProfile.user_id == user.id)
                )
                existing_profile = result.scalars().first()
                if not existing_profile:
                    profile = DriverProfile(
                        user_id=user.id,
                        vehicle_number=f"A{username[-1]}25ABC",
                        waste_license_number=f"DRIVER-{username[-1]}-2024",
                    )
                    db.add(profile)

            # Processor profiles
            for username in ["processor_1", "processor_2"]:
                user = users[username]
                result = await db.execute(
                    select(ProcessorProfile).where(
                        ProcessorProfile.user_id == user.id)
                )
                existing_profile = result.scalars().first()
                if not existing_profile:
                    profile = ProcessorProfile(
                        user_id=user.id,
                        processor_license_number=f"PROCESS-{username[-1]}-2024",
                        processor_facility_address=f"Facility {username[-1]}",
                    )
                    db.add(profile)

            # Inspector profile
            user = users["inspector_1"]
            result = await db.execute(
                select(InspectorProfile).where(
                    InspectorProfile.user_id == user.id)
            )
            existing_profile = result.scalars().first()
            if not existing_profile:
                profile = InspectorProfile(
                    user_id=user.id,
                    inspector_license_number="INSP-001-2024",
                    department="Экологический контроль",
                )
                db.add(profile)

            await db.commit()
            print("✅ Профили созданы\n")

            # =====================================================================
            # 5. ПАРТИИ ОТХОДОВ
            # =====================================================================
            print("📦 Создание партий отходов...")

            batches_count = 0
            educator_org_pairs = [
                (users["educator_1"],
                 organizations["Больница №1 'Скорая помощь'"]),
                (users["educator_2"], organizations["Клиника 'Здоровье'"]),
            ]

            for idx, (educator, org) in enumerate(educator_org_pairs):
                for waste_idx, (code, waste_type) in enumerate(list(waste_types.items())[:3]):
                    assigned_driver = users["driver_1"] if idx == 0 else users["driver_2"]
                    assigned_processor_org = assigned_driver.organization_id
                    batch = WasteBatch(
                        id=uuid.uuid4(),
                        waste_type_id=waste_type.id,
                        quantity=Decimal(str(10 + idx * 5 + waste_idx * 3)),
                        unit="kg",
                        educator_id=educator.id,
                        driver_id=assigned_driver.id,
                        organization_id=org.id,
                        processor_organization_id=assigned_processor_org,
                        pickup_address=f"ул. Медицинская, д. {10 + idx}",
                        delivery_address="ул. Переработки, д. 1",
                        status=WasteStatus.CREATED,
                        created_at=get_utc_now(),
                        updated_at=get_utc_now(),
                    )
                    db.add(batch)
                    batches_count += 1

            await db.commit()
            print(f"✅ Создано {batches_count} партий отходов\n")

            # =====================================================================
            # 6. QR ТОКЕНЫ
            # =====================================================================
            print("🔐 Создание QR токенов...")

            result = await db.execute(select(WasteBatch))
            batches = result.scalars().all()

            qr_tokens_count = 0
            for batch in batches:
                token_str = generate_qr_token()
                qr_token = QRToken(
                    id=uuid.uuid4(),
                    token=token_str,
                    batch_id=batch.id,
                    expires_at=get_utc_now() + timedelta(days=7),
                    is_valid=True,
                    scanned_count=0,
                    created_at=get_utc_now(),
                )
                db.add(qr_token)
                qr_tokens_count += 1

            await db.commit()
            print(f"✅ Создано {qr_tokens_count} QR токенов\n")

            # =====================================================================
            # 7. ИСТОРИЯ ИЗМЕНЕНИЙ СТАТУСА
            # =====================================================================
            print("📝 Создание истории изменений статуса...")

            history_count = 0
            for batch in batches:
                # Created → In Transit
                history = BatchStatusHistory(
                    id=uuid.uuid4(),
                    batch_id=batch.id,
                    old_status=WasteStatus.CREATED,
                    new_status=WasteStatus.IN_TRANSIT,
                    changed_at=get_utc_now(),
                    changed_by_id=users["driver_1"].id,
                )
                db.add(history)
                history_count += 1

                # In Transit → Received
                history = BatchStatusHistory(
                    id=uuid.uuid4(),
                    batch_id=batch.id,
                    old_status=WasteStatus.IN_TRANSIT,
                    new_status=WasteStatus.RECEIVED,
                    changed_at=get_utc_now() + timedelta(hours=2),
                    changed_by_id=users["processor_1"].id,
                )
                db.add(history)
                history_count += 1

            await db.commit()
            print(f"✅ Создано {history_count} записей истории\n")

            # =====================================================================
            # 8. СОБЫТИЯ АУДИТА
            # =====================================================================
            print("📊 Создание событий аудита...")

            events_count = 0
            for batch in batches:
                # Event: Batch created
                event = Event(
                    id=uuid.uuid4(),
                    event_type=EventType.BATCH_CREATED,
                    user_id=batch.educator_id,
                    object_type="WasteBatch",
                    object_id=batch.id,
                    description=f"Партия отходов создана: {batch.quantity} {batch.unit}",
                    created_at=get_utc_now(),
                )
                db.add(event)
                events_count += 1

                # Event: QR code scanned
                event = Event(
                    id=uuid.uuid4(),
                    event_type=EventType.QR_SCANNED,
                    user_id=users["driver_1"].id,
                    object_type="QRToken",
                    object_id=batch.id,
                    description="QR код отсканирован водителем",
                    created_at=get_utc_now(),
                )
                db.add(event)
                events_count += 1

            await db.commit()
            print(f"✅ Создано {events_count} событий\n")

            # =====================================================================
            # ИТОГИ
            # =====================================================================
            print("=" * 70)
            print("✅ ИНИЦИАЛИЗАЦИЯ БД УСПЕШНО ЗАВЕРШЕНА!")
            print("=" * 70)

            # Get statistics
            result = await db.execute(select(Organization))
            orgs_total = len(result.scalars().all())

            result = await db.execute(select(WasteType))
            waste_types_total = len(result.scalars().all())

            result = await db.execute(select(User))
            users_total = len(result.scalars().all())

            result = await db.execute(select(WasteBatch))
            batches_total = len(result.scalars().all())

            result = await db.execute(select(QRToken))
            tokens_total = len(result.scalars().all())

            result = await db.execute(select(BatchStatusHistory))
            history_total = len(result.scalars().all())

            result = await db.execute(select(Event))
            events_total = len(result.scalars().all())

            print(f"\n📊 Статистика:\n")
            print(f"  • Организаций:      {orgs_total}")
            print(f"  • Типов отходов:    {waste_types_total}")
            print(f"  • Пользователей:    {users_total}")
            print(f"  • Партий отходов:   {batches_total}")
            print(f"  • QR токенов:       {tokens_total}")
            print(f"  • Записи истории:   {history_total}")
            print(f"  • События аудита:   {events_total}")

            print(f"\n🔐 Учетные данные администратора:")
            print(f"  Username: admin")
            print(f"  Password: password123")

            print(f"\n👥 Учетные данные тестовых пользователей:")
            for username in ["educator_1", "educator_2", "driver_1", "driver_2", "processor_1", "processor_2", "inspector_1"]:
                user_data = next(
                    (u for u in users_data if u["username"] == username), None)
                if user_data:
                    print(
                        f"  {username:15} ({str(user_data['role'].value):10}): password123")

            print(f"\n⚠️  Рекомендуется изменить пароли после первого входа!")
            print("=" * 70)

        except Exception as e:
            print(f"\n❌ Ошибка при инициализации БД: {str(e)}")
            await db.rollback()
            raise


def main():
    """Точка входа."""
    asyncio.run(init_db())


if __name__ == "__main__":
    main()
