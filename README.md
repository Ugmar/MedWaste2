# 🏥 MedWaste API

**Система управления медицинскими отходами** с отслеживанием от образователя (медицинского учреждения) через водителя до переработчика. Обеспечивает полный контроль над жизненным циклом медицинских отходов с помощью QR кодов, логирования событий и разделения ролей пользователей.

---

## 📋 Содержание

- [Обоснование технологий](#обоснование-технологий)
- [Структура проекта](#структура-проекта)
- [Как запустить](#как-запустить)
- [API документация](#api-документация)
- [Примеры запросов](#примеры-запросов)
- [Архитектура](#архитектура)
- [Разработка](#разработка)

---

## 🔧 Обоснование технологий

### FastAPI
- **Почему**: Современный фреймворк с автоматической генерацией OpenAPI документации
- **Преимущества**: Быстрое написание API, встроенная валидация Pydantic, высокая производительность

### PostgreSQL
- **Почему**: Реляционная БД для структурированных данных с чёткими отношениями
- **Преимущества**: ACID транзакции, поддержка Enum типов, удобные миграции через Alembic

### SQLAlchemy ORM
- **Почему**: Абстрактный слой для работы с БД, независимость от драйверов
- **Преимущества**: Безопасность от SQL инъекций, удобный синтаксис, отношения между таблицами

### Pydantic
- **Почему**: Валидация данных и сериализация для API
- **Преимущества**: Автоматическая генерация схем, type hints, удобная работа с JSON

### JWT (JSON Web Tokens)
- **Почему**: Stateless аутентификация для API
- **Преимущества**: Масштабируемость, не требует сессии на сервере

### QR коды
- **Почему**: Удобное отслеживание физических партий отходов
- **Преимущества**: Легко сканировать, содержит информацию о партии, трудно подделать

---

## 📁 Структура проекта

```
app/
├── core/                 # Ядро приложения
│   ├── config.py        # Конфигурация (DATABASE_URL, SECRET_KEY и т.д.)
│   ├── database.py      # SQLAlchemy engine, session, Base
│   ├── security.py      # Хеширование паролей, JWT, QR коды
│   └── dependencies.py  # FastAPI dependencies для авторизации
│
├── models/              # SQLAlchemy модели
│   └── models.py        # User, Organization, WasteBatch, QRToken и т.д.
│
├── schemas/             # Pydantic схемы валидации
│   └── schemas.py       # UserCreate, WasteBatchResponse и т.д.
│
├── services/            # Бизнес-логика
│   └── crud.py          # Services: UserService, WasteBatchService и т.д.
│
├── routes/              # API эндпоинты
│   ├── auth.py          # /auth/login
│   ├── admin.py         # /admin/organizations, /admin/users
│   ├── educator.py      # /educator/batches, /educator/qr-tokens
│   ├── driver.py        # /driver/scan-qr, /driver/batch/{id}/pickup
│   ├── processor.py     # /processor/assigned-batches
│   └── inspector.py     # /inspector/waste-batches, /inspector/summary
│
├── enums.py             # UserRole, WasteStatus, WasteClass, EventType
├── main.py              # FastAPI приложение
└── __init__.py          # Package инициализация

init_db.py              # Скрипт инициализации БД с тестовыми данными
docker-compose.yml      # Состав контейнеров (API + PostgreSQL)
Dockerfile              # Образ для API
requirements.txt        # Python зависимости
.env.example            # Шаблон конфигурации
```

### 📚 Описание папок

| Папка | Назначение |
|-------|-----------|
| `core/` | Конфигурация, БД, безопасность, dependencies |
| `models/` | SQLAlchemy модели БД |
| `schemas/` | Pydantic схемы для валидации API запросов/ответов |
| `services/` | CRUD операции и бизнес-логика |
| `routes/` | Эндпоинты API по ролям (auth, admin, educator...) |

---

## 🚀 Как запустить

### Способ 1: Docker Compose (Рекомендуется)

**Требования:** Docker 20.10+, Docker Compose 2.0+

```bash
# Клонировать репозиторий
git clone https://github.com/MedWeb/MedWaste.git
cd MedWaste

# Запустить контейнеры
docker-compose up -d

# Проверить статус
docker-compose ps

# Логи API
docker-compose logs -f api
```

**Результат:**
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Учетные данные:
  - Username: `admin`
  - Password: `admin123`

### Способ 2: Локально (без Docker)

**Требования:** Python 3.10+, PostgreSQL 12+

```bash
# Установить PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Создать БД
sudo -u postgres psql << EOF
CREATE DATABASE medwaste_db;
CREATE USER medwaste_user WITH PASSWORD 'medwaste_password';
GRANT ALL PRIVILEGES ON DATABASE medwaste_db TO medwaste_user;
EOF

# Клонировать проект
git clone https://github.com/MedWeb/MedWaste.git
cd MedWaste

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Инициализировать БД
python init_db.py

# Запустить API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📡 API документация

### Структура эндпоинтов

| Сервис | Эндпойнт | Метод | Описание |
|--------|---------|-------|---------|
| **Auth** | `/auth/login` | POST | Вход и получение токена |
| **Admin** | `/admin/organizations` | POST, GET | Управление организациями |
| | `/admin/users` | POST | Создание пользователей |
| | `/admin/waste-types` | GET, POST | Типы отходов |
| **Educator** | `/educator/batches` | POST, GET | Создание и просмотр партий |
| | `/educator/batches/{id}` | GET | Детали партии |
| | `/educator/batches/{id}/qr-tokens` | POST, GET | Генерирование QR кодов |
| **Driver** | `/driver/scan-qr` | POST | Сканирование QR кода |
| | `/driver/batch/{id}/pickup` | POST | Подтверждение получения |
| **Processor** | `/processor/assigned-batches` | GET | Партии переработчика |
| | `/processor/batches/{id}/receive` | POST | Приём партии |
| | `/processor/drivers` | POST, GET | Управление водителями |
| **Inspector** | `/inspector/waste-batches` | GET | Статистика по партиям |
| | `/inspector/summary` | GET | Общая сводка |

### Аутентификация

Все защищённые эндпоинты требуют заголовка:
```
Authorization: Bearer <access_token>
```

---

## 💡 Примеры запросов

### 1. Вход администратора

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | jq
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Создание организации (админ)

```bash
TOKEN="<your_token>" # Из результата login

curl -X POST "http://localhost:8000/admin/organizations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "inn": "7700029760",
    "kpp": "770301001",
    "name": "ООО Переработчик Отходов"
  }' | jq
```

### 3. Создание партии отходов (образователь)

```bash
curl -X POST "http://localhost:8000/educator/batches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "waste_type_id": "<waste_type_id>",
    "quantity": 10.5,
    "unit": "kg",
    "pickup_address": "ул. Ленина, д.1, кв.1",
    "delivery_address": "ул. Промышленная, д.100"
  }' | jq
```

### 4. Генерирование QR кода (образователь)

```bash
curl -X POST "http://localhost:8000/educator/batches/<batch_id>/qr-tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "batch_id": "<batch_id>",
    "lifetime_days": 7
  }' | jq
```

### 5. Сканирование QR кода (водитель)

```bash
curl -X POST "http://localhost:8000/driver/scan-qr" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<qr_token>"
  }' | jq
```

### 6. Статистика (инспектор)

```bash
curl -X GET "http://localhost:8000/inspector/summary" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🏗️ Архитектура

### Диаграмма потока данных

```
Образователь (Больница/Клиника)
    ↓
  (создаёт партию отходов)
    ↓
Система MedWaste API
    ├─→ Генерирует QR код
    ├─→ Логирует событие
    └─→ Записывает в БД
    ↓
Водитель (Транспортировка)
    ↓
  (сканирует QR код)
    ↓
API обновляет статус: IN_TRANSIT
    ├─→ Логирует событие
    └─→ Уведомляет переработчика
    ↓
Переработчик (Утилизация)
    ↓
  (получает партию)
    ↓
API обновляет статус: RECEIVED
    ├─→ Логирует событие
    └─→ Архивирует запись
    ↓
Инспектор (Надзор)
    ↓
  (просматривает статистику)
    ↓
API возвращает аналитику:
    ├─ Всего партий
    ├─ По статусам
    └─ Логистика событий
```

### Компоненты системы

1. **FastAPI приложение** — REST API с авторизацией
2. **PostgreSQL** — персистентное хранилище данных
3. **Auth Layer** — проверка ролей и токенов
4. **Service Layer** — бизнес-логика CRUD операций
5. **QR Generator** — создание QR кодов для отслеживания
6. **Event Logger** — логирование всех операций для аудита

### Статусы партии

```
CREATED (создана)
    ↓
IN_TRANSIT (в пути - водитель подтвердил)
    ↓
RECEIVED (принята переработчиком)
```

### Роли пользователей

| Роль | Доступ |
|------|--------|
| **ADMIN** | Управление организациями, типами отходов |
| **EDUCATOR** | Создание партий, генерирование QR кодов |
| **DRIVER** | Сканирование QR, подтверждение получения |
| **PROCESSOR** | Просмотр назначенных партий, подтверждение приёма |
| **INSPECTOR** | Просмотр статистики, аудит событий |

---

## 🔐 Окружение (.env)

Создайте `.env` файл:

```bash
# Database
DATABASE_URL=postgresql://medwaste_user:medwaste_password@localhost:5432/medwaste_db

# JWT
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# QR Code
QR_TOKEN_LIFETIME_DAYS=7

# Server
DEBUG=False
APP_TITLE=MedWaste API
APP_VERSION=1.0.0
```

---

## 🛠️ Разработка

### Форматирование кода

```bash
# Используется Black + Flake8
black app/
flake8 app/

# или через pre-commit hooks
pre-commit install
```

### Тесты

```bash
# Запустить тесты
pytest tests/ -v

# С покрытием
pytest tests/ --cov=app
```

### Структура кода

- **Понятные имена переменных**: `user`, не `u`
- **Единое форматирование**: 4 пробела, 88 символов в строке
- **Комментарии только где нужно**: над функциями и сложной логикой
- **Docstrings**: для модулей, классов и функций

---

## 📞 Полезные команды

### Docker

```bash
# Просмотр логов
docker-compose logs -f api
docker-compose logs -f postgres

# Вход в контейнер
docker-compose exec api bash
docker-compose exec postgres psql -U medwaste_user -d medwaste_db

# Остановка
docker-compose down
docker-compose down -v  # С удалением данных

# Пересборка
docker-compose build --no-cache
```

### API

```bash
# Health check
curl http://localhost:8000/health

# Swagger UI
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc
```

---

## 📝 Лицензия

MIT

---

## 👥 Контакты

- GitHub: [MedWeb/MedWaste](https://github.com/MedWeb/MedWaste)
- Email: support@medwaste.local

---

**Последнее обновление:** Март 2026

