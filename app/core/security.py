"""Функции безопасности: хеширование, JWT токены, QR коды."""

from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import uuid
import qrcode
import re
from io import BytesIO
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Хешировать пароль."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверить пароль."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создать JWT токен доступа."""
    to_encode = data.copy()
    # Convert any UUID values to strings for JSON serialization
    for key, value in to_encode.items():
        if isinstance(value, uuid.UUID):
            to_encode[key] = str(value)
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    # Convert expiration datetime to Unix timestamp (seconds since epoch)
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.InvalidTokenError:
        return None


def validate_password(password: str) -> bool:
    """Валидировать пароль по требованиям безопасности.
    
    Требования:
    - Минимум 8 символов
    - Минимум одна заглавная буква
    - Минимум одна цифра
    - Минимум один специальный символ
    
    Raises:
        ValueError: Если пароль не соответствует требованиям
    """
    if len(password) < 8:
        raise ValueError("Пароль должен быть минимум 8 символов")
    if not any(c.isupper() for c in password):
        raise ValueError("Пароль должен содержать минимум одну заглавную букву")
    if not any(c.isdigit() for c in password):
        raise ValueError("Пароль должен содержать минимум одну цифру")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Пароль должен содержать минимум один специальный символ")
    return True


def generate_qr_token() -> str:
    """Сгенерировать уникальный токен для QR кода."""
    return str(uuid.uuid4())


def generate_qr_code(data: str) -> BytesIO:
    """Сгенерировать QR код как изображение."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)
    return img_byte_arr


def get_qr_token_expiration() -> datetime:

    return datetime.utcnow() + timedelta(days=settings.qr_token_lifetime_days)


def is_token_expired(expires_at: datetime) -> bool:

    return datetime.utcnow() > expires_at
