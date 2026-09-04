# 9. Новая архитектура бэкенда

## Технологии

| Компонент | Выбор |
|---|---|
| Фреймворк | FastAPI 0.110+ |
| ORM | SQLAlchemy 2.0 (Declarative) |
| Миграции | Alembic |
| Валидация | Pydantic v2 |
| Аутентификация | JWT (python-jose) + bcrypt |
| Excel-экспорт | openpyxl |
| Внешний API календаря | httpx → isdayoff.ru |
| Сервер | uvicorn |
| Docker | python:3.12-slim |

## Структура проекта

```
timesheet-api/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── deps.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── employee.py
│   │   ├── facility.py
│   │   ├── work_log.py
│   │   ├── change_log.py
│   │   ├── position.py
│   │   ├── production_calendar.py
│   │   ├── master_facility.py
│   │   ├── position_facility.py
│   │   └── period_models.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── employee.py
│   │   ├── facility.py
│   │   ├── work_log.py
│   │   └── common.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── employees.py
│   │   ├── facilities.py
│   │   ├── work_logs.py
│   │   ├── positions.py
│   │   ├── roles.py
│   │   └── production_calendar.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── work_log.py
│   │   ├── work_log_totals.py
│   │   ├── work_log_export.py
│   │   ├── employee.py
│   │   ├── facility.py
│   │   └── production_calendar.py
│   └── utils/
│       ├── __init__.py
│       └── dates.py
├── tests/
├── alembic/
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── .env
```

## Ключевые улучшения

| Было (NestJS) | Стало (FastAPI) |
|---|---|
| 1 файл 3200 строк | 4 файла по ~200-400 строк |
| Sequelize `synchronize: true` | Alembic-миграции |
| `any`, `@ts-ignore` | Строгая типизация Pydantic v2 |
| Нет тестов | pytest на каждый эндпоинт |
| Хардкод календаря | isdayoff.ru API + кэширование |
| Ручная Swagger-документация | Автогенерация OpenAPI |