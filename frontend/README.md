# MedWaste Frontend

Веб-интерфейс для системы управления медицинскими отходами.

## 📁 Структура проекта

```
frontend/
├── login.html          # Страница входа
├── register.html       # Страница регистрации
├── dashboard.html      # Главная панель управления
├── css/
│   └── style.css       # Главные стили (Bootstrap 5 + кастомные)
└── js/
    ├── api.js          # Клиент API
    └── dashboard.js    # Логика панели управления
```

## 🚀 Запуск

### Локально
1. Откройте `frontend/login.html` в браузере или используйте локальный сервер:
```bash
python -m http.server 3000
```

2. Перейдите на `http://localhost:3000/frontend/login.html`

### С Docker
Frontend обслуживается вместе с API в docker-compose.

## 🔐 Аутентификация

Система использует JWT токены, которые хранятся в `localStorage`:
- `token` - JWT аксес токен
- `user_role` - Роль пользователя

Токен отправляется в заголовке `Authorization: Bearer <token>` для всех запросов.

## 👥 Роли и функционал

### 📋 Образователь (Educator)
- Создание партий медицинских отходов
- Просмотр своих партий
- Запрос QR-токена для партии
- Экспорт в CSV

### 🚗 Водитель (Driver)
- Просмотр назначенных партий
- Сканирование QR-кода
- Подтверждение вывоза партии

### ♻️ Переработчик (Processor)
- Просмотр назначенных партий
- Получение партий от водителя
- Отметить партию как обработанную

### 👮 Инспектор (Inspector)
- Просмотр всех партий в системе
- История изменения статусов
- Статистика по организациям
- Общая статистика системы

### ⚙️ Администратор (Admin)
- Управление пользователями
- Просмотр всех данных в системе

## 🎨 Дизайн

- **Bootstrap 5** - Адаптивная верстка
- **Кастомные стили** - Оформление, соответствующее бренду MedWaste
- **Семантические цвета**:
  - Зелёный (#27ae60) - Успешные действия
  - Красный (#e74c3c) - Опасные действия
  - Синий (#3498db) - Информация
  - Оранжевый (#f39c12) - Предупреждения

## 🔌 API интеграция

### Основные endpoints

```javascript
// Auth
POST /auth/login
POST /auth/signup

// Educator
POST /educator/batches
GET /educator/batches
GET /educator/batches/{id}
POST /educator/batches/{id}/qr-token

// Driver
GET /driver/batches
POST /driver/batches/{id}/confirm-pickup

// Processor
GET /processor/batches
POST /processor/batches/{id}/receive

// Inspector
GET /inspector/batches
GET /inspector/batches/{id}/statuses
GET /inspector/batches/{id}/events

// Admin
GET /admin/users
```

## 📱 Адаптивность

Frontend адаптивен для:
- 📱 Мобильные устройства (320px+)
- 📱 Планшеты (768px+)
- 🖥️ Десктопы (1024px+)

На мобильных устройствах боковое меню скрывается.

## 🛠️ Технологии

- HTML5
- CSS3 + Bootstrap 5
- JavaScript (ES6+)
- Fetch API для работы с API

## 📝 Примечания

- Все цены в рублях
- Все даты в формате РФ (dd.mm.yyyy)
- Язык интерфейса - русский
- Поддержка CORS между frontend и API

## 🔐 Безопасность

- JWT токены в localStorage (обновить на sessionStorage для production)
- CORS validation на сервере
- HTTPS required для production
- Rate limiting recommended на endpoint'ах

## 🚧 Развитие

Возможные улучшения:
- [ ] Отправка отчётов по email
- [ ] Сканирование QR код через камеру
- [ ] Оффлайн режим
- [ ] Интеграция с SMS уведомлениями
- [ ] Графики и диаграммы аналитики
- [ ] Экспорт в PDF

