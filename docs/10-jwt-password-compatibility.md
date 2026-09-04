# 10. Совместимость JWT и паролей

## Пароли (bcrypt)

Текущий стек: `bcryptjs` (Node.js) → `passlib[bcrypt]` (Python).

Обе библиотеки используют одинаковый алгоритм хеширования:
- Формат: `$2b$12$<22-char-salt><31-char-hash>`
- Количество раундов: 12 (по умолчанию)

**Проверка совместимости:**
```python
from passlib.hash import bcrypt as passlib_bcrypt

# Хеш, созданный bcryptjs в Node.js
node_hash = "$2b$12$LJ3m4ys3Lz5Qe5WH3Z5WHOO5Z5WH3Z5WHOO5Z5WH3Z5WHOO5Z5WH3Z"

# Проверка пароля — работает!
passlib_bcrypt.verify("mypassword", node_hash)  # True

# Создание нового хеша — тоже совместимо
new_hash = passlib_bcrypt.hash("newpassword")
# Node.js bcryptjs.verify("newpassword", new_hash) → True
```

**Вывод:** Миграция паролей **не требуется**. Существующие хеши работают в Python «как есть».

## JWT-токены

Текущий формат (NestJS):
```json
{
  "login": "admin",
  "id": 1,
  "role": 1,
  "iat": 1700000000,
  "exp": 1700086400
}
```

Алгоритм: HS256
Секрет: `PRIVATE_KEY` из `.env`

**В FastAPI:**
```python
from jose import jwt

token = jwt.encode(
    {"login": user.login, "id": user.id, "role": user.role_id},
    settings.PRIVATE_KEY,
    algorithm="HS256"
)

# Проверка существующего токена
payload = jwt.decode(token, settings.PRIVATE_KEY, algorithms=["HS256"])
```

**Вывод:** Токены полностью совместимы. Пользователи, вошедшие через старый бэкенд, продолжат работать на новом без повторного логина.

## .env (общие переменные)

```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=timesheet
DB_USER=timesheet
DB_PASSWORD=secret

# JWT
PRIVATE_KEY=your-secret-key-here

# Сервер
PORT=5000

# Новые переменные
ISDAYOFF_API_URL=https://isdayoff.ru/api
ISDAYOFF_API_KEY=  # опционально
```