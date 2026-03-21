from enum import Enum


class UserRole(str, Enum):
    """Роли пользователей в системе"""
    EDUCATOR = "educator"  # Образователь
    DRIVER = "driver"  # Водитель
    PROCESSOR = "processor"  # Переработчик
    ADMIN = "admin"  # Администратор
    INSPECTOR = "inspector"  # Инспектор


class WasteStatus(str, Enum):
    """Статусы партии отходов"""
    CREATED = "created"  # Создана
    IN_TRANSIT = "in_transit"  # В пути
    RECEIVED = "received"  # Принята переработчиком


class WasteClass(str, Enum):
    """Классы опасности отходов"""
    CLASS_1 = "class_1"  # Чрезвычайно опасные
    CLASS_2 = "class_2"  # Высокоопасные
    CLASS_3 = "class_3"  # Умеренно опасные
    CLASS_4 = "class_4"  # Малоопасные
    CLASS_5 = "class_5"  # Практически неопасные


class EventType(str, Enum):
    """Типы событий в журнале"""
    BATCH_CREATED = "batch_created"
    QR_GENERATED = "qr_generated"
    QR_SCANNED = "qr_scanned"
    BATCH_STATUS_CHANGED = "batch_status_changed"
    USER_CREATED = "user_created"
    USER_DELETED = "user_deleted"
    REPORT_GENERATED = "report_generated"
