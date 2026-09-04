# MIGRATION_GUIDE.md — Полная документация и план переезда

> Документ создан 04.09.2026. Содержит полное описание бизнес-логики,
> текущей архитектуры, схемы БД, API и план миграции на FastAPI + React (shadcn/ui).

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Схема базы данных](#2-схема-базы-данных)
3. [API-справочник](#3-api-справочник)
4. [Бизнес-логика табеля](#4-бизнес-логика-табеля)
5. [Производственный календарь](#5-производственный-календарь)
6. [Роли и доступы](#6-роли-и-доступы)
7. [Проблемы текущей реализации](#7-проблемы-текущей-реализации)
8. [План миграции на FastAPI](#8-план-миграции-на-fastapi)
9. [Новая архитектура бэкенда](#9-новая-архитектура-бэкенда)
10. [Новая архитектура фронтенда](#10-новая-архитектура-фронтенда)
11. [Docker и инфраструктура](#11-docker-и-инфраструктура)

---

## 1. Обзор системы

### Текущий стек

| Слой | Технология | Версия |
|---|---|---|
| Бэкенд | NestJS + TypeScript | Node.js |
| ORM | Sequelize + sequelize-typescript | — |
| БД | PostgreSQL | 16.3-alpine |
| Фронтенд | React + Vite + TypeScript | — |
| UI | Ant Design + ag-grid | — |
| Стили | Tailwind CSS | — |
| Состояние | react-query + react-hook-form | — |
| Аутентификация | JWT (bcryptjs) | — |
| Инфра | Docker Compose + nginx + Let's Encrypt | — |
| Деплой | VPS testeste.ru | — |

### Целевой стек

| Слой | Технология |
|---|---|
| Бэкенд | **FastAPI + Python 3.12** |
| ORM | **SQLAlchemy 2.0 + Alembic** |
| БД | PostgreSQL 16.3 (**та же, не трогаем**) |
| Фронтенд | **React + Vite + TypeScript** (переписать) |
| UI | **shadcn/ui + Tailwind CSS 4** |
| Таблица | **TanStack Table** (вместо ag-grid) |
| Формы | **React Hook Form + Zod** |
| Состояние | **TanStack Query (React Query)** |
| Аутентификация | JWT (bcrypt) |
| Инфра | Docker Compose + nginx (та же) |

---

## 2. Схема базы данных

### ER-диаграмма (текстовая)

```
users ─────────┐
  │             │
  │ role_id     │ id (createdById, lastMasterId)
  ▼             │
roles            │
                 ▼
              employees ──────────────────────┐
  │             │             │                │
  │ lastFacilityId            │ lastPositionId │
  ▼             │             ▼                │
facilities      │         positions             │
  │             │             │                │
  │ id          │             │                │
  ├─────────────┼─────────────┼────────────────┤
  │             │             │                 │
  ▼             ▼             ▼                 ▼
production_    work_logs    employment_      position_
calendars     change_logs   periods          periods
                 │
                 ▼
              work_log_changes_logs

facilities ◄──► positions (M:N via positions_facilities)
facilities ◄──► users (мастера via master_facilities)

employees ──► facility_periods (история привязки к объекту)
employees ──► master_periods (история привязки мастера)
employees ──► out_of_town_periods (история вахтовик/местный)
```

### Основные таблицы

#### users
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK, auto | ID пользователя |
| login | STRING, unique | Логин |
| password | STRING | Хеш пароля (bcrypt) |
| lastName | STRING | Фамилия |
| firstName | STRING | Имя |
| middleName | STRING | Отчество |
| positionId | INTEGER, FK → positions.id | Должность |
| role_id | INTEGER, FK → roles.id | Роль |
| phoneNumber | STRING | Телефон |
| lastLoginAt | DATE | Последний вход |
| passwordChangedAt | DATE | Дата смены пароля |

#### roles
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID роли |
| name | STRING, unique | admin, master, personnel_officer, financier |
| alt_name | STRING, unique | Отображаемое имя |

#### facilities (объекты)
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID объекта |
| name | STRING, unique | Название |
| address | STRING | Адрес |
| description | STRING | Описание |
| settings | JSONB | Настройки табеля |

**settings (JSONB):**
```json
{
  "letters": true,
  "integers": {
    "allowDay": true,
    "allowNight": true,
    "allowOverwork": true,
    "allowOnlyTotal": false
  }
}
```

#### production_calendars
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID |
| facilityId | INTEGER, FK → facilities.id | Объект |
| startDate | DATE | Дата начала действия |
| endDate | DATE / null | null = текущий активный |
| workingDays | STRING[] | ["monday","tuesday",...] |
| months | JSONB | { year: 2025, dates: [{month: 1, days: [1,2,3,...]}] } |

#### employees (сотрудники)
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID |
| dateAdded | DATE | Дата создания |
| createdById | INTEGER, FK → users.id | Кто создал |
| lastName/firstName/middleName | STRING | ФИО |
| phoneNumber | STRING | Телефон |
| registeredAddress / actualAddress | STRING | Адреса |
| lastStatus | ENUM(working, fired, archived) | Статус |
| lastFacilityId | INTEGER, FK | Текущий объект |
| lastMasterId | INTEGER, FK | Текущий мастер |
| lastPositionId | INTEGER, FK | Текущая должность |
| lastIsOutOfTown | BOOLEAN | Вахтовик (true) / Местный (false) |

#### work_logs (табель)
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID |
| employeeId | INTEGER, FK | Сотрудник |
| facilityId | INTEGER, FK | Объект |
| date | STRING | "MM-YYYY" |
| workDays | JSONB | Данные по дням |

**workDays (JSONB):**
```json
{
  "01.01.2025": "Б",
  "02.01.2025": { "day": 8, "night": 0, "overwork": 2, "total": 10 },
  "03.01.2025": null
}
```

#### work_log_changes_logs (история изменений)
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID |
| workLogId | INTEGER, FK | Запись табеля |
| oldValue | JSONB | Предыдущее значение |
| newValue | JSONB | Новое значение |
| changes | JSONB | { date: { was, became } } |
| userId | INTEGER, FK | Кто изменил |
| employeeId | INTEGER, FK | Сотрудник |
| facilityId | INTEGER, FK | Объект |
| date | STRING | Дата изменения |

#### Периоды (5 таблиц с одинаковой структурой)

**employment_periods** — история статусов (working / fired / archived)
**facility_periods** — история привязки к объекту (employeeId, facilityId, startDate, endDate)
**master_periods** — история привязки мастера (employeeId, masterId, startDate, endDate)
**position_periods** — история должности (employeeId, positionId, startDate, endDate)
**out_of_town_periods** — история вахтовик/местный (employeeId, isOutOfTown, startDate, endDate)

#### positions (должности)
| Колонка | Тип | Описание |
|---|---|---|
| id | INTEGER, PK | ID |
| name | STRING | Название должности |

#### positions_facilities (M:N)
| Колонка | Тип | Описание |
|---|---|---|
| positionId | INTEGER, FK | Должность |
| facilityId | INTEGER, FK | Объект |

#### master_facilities (M:N)
| Колонка | Тип | Описание |
|---|---|---|
| master_id | INTEGER, FK → users.id | Мастер |
| facility_id | INTEGER, FK → facilities.id | Объект |

---

## 3. API-справочник

Базовый путь: `/api/v1`

### Авторизация (/auth)

| Метод | Путь | Роль | Описание | Тело запроса |
|---|---|---|---|---|
| POST | `/auth/login` | public | Логин, возвращает { token } | `{ login, password }` |
| POST | `/auth/create` | public | Регистрация | `{ login, password, lastName, firstName, middleName, positionId, role_id, phoneNumber? }` |
| GET | `/auth/user` | любой авторизованный | Текущий пользователь | — |

**JWT payload:** `{ "login": "admin", "id": 1, "role": 1 }`

### Пользователи (/users)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/users` | admin, personnel_officer | Все пользователи |
| GET | `/users/employees?type=&facilityId=` | admin, personnel_officer | Сотрудники по роли/объекту |
| PATCH | `/users/:id` | admin, personnel_officer | Обновить пользователя |
| DELETE | `/users/:id` | admin | Удалить пользователя |

### Объекты (/facilities)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/facilities` | admin, master, personnel_officer | Создать объект |
| GET | `/facilities?page=&pageSize=` | admin, master, personnel_officer, financier | Список (пагинация) |
| GET | `/facilities/:id/:year/:month` | admin, master, personnel_officer, financier | Объект с календарём |
| PATCH | `/facilities/:id` | admin, master, personnel_officer | Обновить (включая календарь) |
| DELETE | `/facilities/:id` | admin | Удалить |

### Сотрудники (/employees)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/employees` | admin, master, personnel_officer | Создать |
| GET | `/employees?searchName=&status=` | admin | Список (с поиском) |
| GET | `/employees/byFacilities?facilityId=&date=` | admin, master, personnel_officer, financier | По объекту и дате |
| GET | `/employees/:id` | admin | Один сотрудник |
| PATCH | `/employees/:id` | admin, master, personnel_officer | Обновить |
| PATCH | `/employees/update/employee/logs/:id` | admin, master, personnel_officer | Обновить из табеля |
| DELETE | `/employees/:id` | admin | Удалить |

### Табель (/work-logs)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/work-logs` | admin, master, personnel_officer | Создать/обновить записи |
| GET | `/work-logs/:date/:id` | admin, master, personnel_officer, financier | По дате (MM-YYYY) и объекту |
| GET | `/work-logs` | admin, master, personnel_officer | Все записи |
| GET | `/work-logs/download?date=&id=` | admin, master, personnel_officer, financier | Скачать Excel по объекту |
| GET | `/work-logs/download-all?date=` | admin, master, personnel_officer, financier | Скачать Excel все объекты |

### Должности (/positions)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/positions` | admin, master, personnel_officer | Создать |
| GET | `/positions` | admin, master, personnel_officer | Все должности |
| GET | `/positions/:id` | admin, master, personnel_officer | Одна должность |
| GET | `/positions/byFacility/:id` | admin, master, personnel_officer | По объекту |
| PATCH | `/positions/:id` | admin, master, personnel_officer | Обновить |

### Роли (/roles)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/roles` | admin | Создать |
| GET | `/roles` | admin | Все роли |
| PATCH | `/roles/:id` | admin | Обновить |

### Мастера-объекты (/master-facilities)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/master-facilities` | admin, personnel_officer | Привязать мастера |
| PATCH | `/master-facilities?id=` | admin, personnel_officer | Обновить привязку |

### Логи табеля (/worklogschanges)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/worklogschanges?page=&pageSize=` | admin | История изменений |
| GET | `/worklogschanges/:id` | admin | Одна запись |
| PATCH | `/worklogschanges/:id` | admin | Обновить |

### Производственный календарь (/production-calendar)

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/production-calendar` | любой авторизованный | ⚠️ Хардкод 2024 (будет заменён) |

---

## 4. Бизнес-логика табеля

### 4.1. Настройки объекта (facility.settings)

| Флаг | Что делает |
|---|---|
| `allowDay` | Разрешает ввод дневных часов (Д) |
| `allowNight` | Разрешает ввод ночных часов (Н) |
| `allowOverwork` | Разрешает ввод переработки (П) |
| `allowOnlyTotal` | Только одно поле «Итого часов» (макс 24), без разбивки |
| `letters` | Разрешает буквенные коды (Б, В, О и т.д.) |

### 4.2. Комбинации настроек → вид ячейки

| Комбинация | Вид ячейки | Макс. значение поля |
|---|---|---|
| День+Ночь+Переработка | 3 поля: Д / Н / П(2ч+>2ч) | 0–8 (шаг 0.5) |
| День+Ночь | 2 поля: Д / Н | 0–12 |
| День+Переработка | 2 поля | 0–12 |
| Ночь+Переработка | 2 поля | 0–12 |
| Только одно поле | 1 поле | 0–24 |
| allowOnlyTotal | 1 поле «Часы» | 0–24 |

### 4.3. Буквенные коды (letters: true)

| Код | Значение |
|---|---|
| Я | Явка |
| П | Прогул |
| Б | Больничный |
| В | Выходной |
| О | Отпуск |
| МО | Межвахтовый отпуск |
| А | Административный отпуск |
| К | Командировка |
| М | Материнский день |

### 4.4. Валидация на бэкенде

| Правило | Описание |
|---|---|
| Строковые значения | Только: Б, В, О, А, П, МО, К, М |
| allowOnlyTotal=true | Запрещено day/night/overwork, только total ≤ 24 |
| allowDay=false | Запрещено заполнять «день» |
| allowNight=false | Запрещено заполнять «ночь» |
| allowOverwork=false | Запрещено заполнять «переработку» |
| total > 24 | Ошибка |
| day+night+overwork > 24 | Ошибка |
| Мастер | Может редактировать только сегодня, вчера, позавчера |

### 4.5. Подсветка ячеек (фронтенд)

| Условие | Цвет |
|---|---|
| Числовые данные вне окна редактирования | 🟡 Жёлтый |
| Буквенный код вне окна редактирования | 🔴 Красный |

### 4.6. Блокировка дат

| Роль | Доступные даты |
|---|---|
| Мастер | Только сегодня, вчера, позавчера |
| Админ, кадровик | Если сегодня ≥ 15 — нельзя редактировать прошлый месяц; если < 15 — нельзя редактировать позапрошлый |

### 4.7. Влияние «Вахтовик» на подсчёт итогов

`isOutOfTown = true` (Вахтовик) / `isOutOfTown = false` (Местный)
В коде: `isLocal = !lastIsOutOfTown`

**Рабочие дни (не выходные) — одинаково для всех:**
- hoursOfDay += day || total
- hoursOfNight += night || total
- if (day || night || total) countOfWorkDays += 1

**Выходные и праздничные дни:**

| Метрика | Вахтовик (isLocal=false) | Местный (isLocal=true) |
|---|---|---|
| Часы (день+ночь) в выходные | → hoursOfWeekendWorkDays | → hoursOfWeekendWorkDays |
| Переработка в выходные: смена | → countOfWeekendWorkDays **+1** | → countOfWorkDays **+1** |
| Часы переработки в выходные | → hoursOfWeekendWorkDays += overwork | → hoursOfWeekendWorkDays += overwork |

**Буква «В» в выходной:**

| | Вахтовик | Местный |
|---|---|---|
| +1 к countOfWorkDays | ❌ Нет | ✅ Да |

**Отображение «Итого смен (вых)»:** Местный → прочерк «–», Вахтовик → число

### 4.8. Итоговые колонки

**Режим «Числа» (numbers):**

| Колонка | Что считает |
|---|---|
| Итого часов | day / night / overwork(2ч+>2ч) по разрешённым полям |
| Итого смен | Количество дней с часами > 0 |
| Итого часов (вых) | Часы, отработанные в выходные/праздники |
| Итого смен (вых) | Количество выходных смен (см. влияние вахтовика) |

**Режим «Буквы» (letters):**

| Колонка | Что считает |
|---|---|
| П | Количество прогулов |
| Б | Количество больничных |
| В | Количество выходных |
| О | Количество дней отпуска |
| МО | Количество дней межвахтового отпуска |
| А | Количество дней администр. отпуска |
| К | Количество дней командировки |
| М | Количество материнских дней |

### 4.9. Логирование изменений (Change Log)

Каждое изменение табеля записывается:
- **was** — предыдущее значение ячейки
- **became** — новое значение
- **userId** — кто изменил
- **employeeId** — какой сотрудник
- **facilityId** — какой объект
- **date** — дата

Доступно только админу через `GET /worklogschanges`.

---

## 5. Производственный календарь

### Хранение

Таблица `production_calendars`, привязана к объекту (facilityId).

| Поле | Описание |
|---|---|
| facilityId | К какому объекту |
| startDate | Дата начала действия |
| endDate | Дата окончания (null = текущий активный) |
| workingDays | ["monday","tuesday",...] |
| months | JSONB: { year: 2025, dates: [{month: 1, days: [1,2,3,...]}] } |

### Версионирование

При обновлении календаря:
1. Текущая запись: `endDate = new Date()` (закрывается)
2. Новая запись: `endDate = null` (становится активной)
3. История сохраняется полностью

### Как настраивает пользователь

1. Открыть модалку «Редактирование объекта»
2. Нажать «Настроить календарь»
3. Открывается 12 календарей (январь–декабрь)
4. Кликом отметить нерабочие дни (подсвечиваются синим)
5. Кнопка «Использовать текущий производственный календарь РФ» — подставляет хардкод 2024
6. Кнопка «Сбросить» — очищает все отметки
7. При сохранении — даты отправляются как `notWorkingDays: ["2025-01-01",...]`

### Как используется в табеле

```
Для каждой ячейки даты:
  isInnerWeekend = false
  Если дата найдена в productionCalendar.months.dates:
    isInnerWeekend = true
  Если isInnerWeekend == false:
    isInnerWeekend = isWeekend (суббота/воскресенье)
  Используется для:
  - Подсветки заголовка колонки (серый фон)
  - Расчёта итогов (выходные отдельно)
  - Буква «В» для местных = +1 смена
```

### Проблемы

| Проблема | Описание |
|---|---|
| 🔴 Хардкод 2024 | `GET /production-calendar` возвращает статический список только 2024 года |
| 🔴 Нет API управления | Нет POST/PUT/DELETE для календаря отдельно от объекта |
| 🔴 Нет автообновления | Нет подключения к isdayoff.ru и т.п. |

---

## 6. Роли и доступы

| Роль | Создание пользователя | Управление объектами | Табель | Сотрудники | Логи | Excel |
|---|---|---|---|---|---|---|
| **admin** | ✅ | ✅ CRUD | ✅ Полный | ✅ CRUD | ✅ | ✅ |
| **master** | ❌ | ✅ Свои объекты | ✅ (3 дня) | ✅ Создание | ❌ | ✅ |
| **personnel_officer** | ✅ | ✅ | ✅ | ✅ CRUD | ❌ | ✅ |
| **financier** | ❌ | ✅ Только чтение | ✅ Только чтение | ❌ | ❌ | ✅ |

---

## 7. Проблемы текущей реализации

### Критичные

| # | Проблема | Влияние |
|---|---|---|
| 1 | work-logs.service.ts — **3200 строк** | Невозможно поддерживать и тестировать |
| 2 | Нет unit-тестов | Любое изменение может сломать бизнес-логику |
| 3 | `synchronize: true` в Sequelize | Схема БД управляется автосинхронизацией, нет миграций |
| 4 | Хардкод производственного календаря на 2024 | Не актуален на 2025+ |
| 5 | Валидация дублируется фронт/бэк | Рассинхронизация правил |

### Средние

| # | Проблема | Влияние |
|---|---|---|
| 6 | TypeScript `any`, `@ts-ignore` | Потеря типобезопасности |
| 7 | ProductionCalendarService — пустой класс | Мёртвый код |
| 8 | Нет пагинации в табеле | Проблемы при большом количестве сотрудников |
| 9 | Нет WebSocket/уведомлений | Конфликты при одновременном редактировании |
| 10 | Нет миграций | ALTER TABLE вручную |

### Низкие

| # | Проблема | Влияние |
|---|---|---|
| 11 | Sequelize устаревает | Лучше SQLAlchemy для Python |
| 12 | Нет Swagger в проде | Сложно разобраться новому разработчику |
| 13 | Нет rate limiting | Нет защиты от brute force |
| 14 | Не RESTful эндпоинты | `/employees/update/employee/logs/:id` |

---

## 8. План миграции на FastAPI

### Принцип

**База данных НЕ трогаем.** FastAPI подключается к той же PostgreSQL, читает/пишет те же таблицы. Данные сохраняются полностью.

### Этапы

#### Этап 1: Подготовка (1 день)

1. Снять дамп схемы БД (для документации):
   ```bash
   docker exec timesheet-postgres-1 pg_dump -s -U timesheet timesheet > schema.sql
   ```

2. Создать папку `timesheet-api/` в корне репозитория

3. Инициализировать FastAPI проект (структура см. раздел 9)

4. Создать `requirements.txt`:
   ```
   fastapi==0.115.*
   uvicorn[standard]==0.30.*
   sqlalchemy==2.0.*
   alembic==1.13.*
   psycopg2-binary==2.9.*
   pydantic==2.9.*
   pydantic-settings==2.5.*
   python-jose[cryptography]==3.3.*
   passlib[bcrypt]==1.7.*
   bcrypt==4.2.*
   openpyxl==3.1.*
   httpx==0.27.*
   python-multipart==0.0.*
   ```

#### Этап 2: Модели SQLAlchemy (1 день)

Описать все 14 таблиц, **строго соответствуя** текущей схеме PostgreSQL.
Имена колонок совпадают с Sequelize — SQLAlchemy маппится прямо на существующие таблицы.

Пример:
```python
# app/models/employee.py
class Employee(Base):
    __tablename__ = 'employees'

    id = Column(Integer, primary_key=True, autoincrement=True)
    dateAdded = Column('dateAdded', DateTime, nullable=False, server_default=func.now())
    createdById = Column('createdById', Integer, ForeignKey('users.id'))
    lastName = Column('lastName', String, nullable=False)
    firstName = Column('firstName', String, nullable=False)
    middleName = Column('middleName', String, nullable=False)
    phoneNumber = Column('phoneNumber', String, nullable=True)
    registeredAddress = Column('registeredAddress', String, nullable=True)
    actualAddress = Column('actualAddress', String, nullable=True)
    lastStatus = Column('lastStatus', Enum('working', 'fired', 'archived'), nullable=False)
    lastFacilityId = Column('lastFacilityId', Integer, ForeignKey('facilities.id'), nullable=True)
    lastMasterId = Column('lastMasterId', Integer, ForeignKey('users.id'), nullable=True)
    lastPositionId = Column('lastPositionId', Integer, ForeignKey('positions.id'), nullable=True)
    lastIsOutOfTown = Column('lastIsOutOfTown', Boolean, nullable=False)
```

#### Этап 3: Аутентификация (0.5 дня)

- JWT через `python-jose`
- `passlib[bcrypt]` для хеширования (совместимо с bcryptjs)
- Токен совместим с текущим форматом: `{ login, id, role }`
- Тот же `PRIVATE_KEY` из `.env`

#### Этап 4: CRUD эндпоинты (2 дня)

Порядок (от простого к сложному):
1. `/auth` — логин, регистрация, текущий пользователь
2. `/roles` — CRUD ролей
3. `/positions` — CRUD должностей
4. `/users` — CRUD пользователей
5. `/facilities` — CRUD объектов + производственный календарь
6. `/employees` — CRUD сотрудников + периоды
7. `/work-logs` — табель (создание, чтение, валидация)
8. `/work-logs/download` — экспорт в Excel (openpyxl)
9. `/worklogschanges` — история изменений

#### Этап 5: Бизнес-логика табеля (2 дня)

Перенести из `work-logs.service.ts` (3200 строк) в модульную структуру:

```
services/
├── work_log.py              # CRUD + валидация
├── work_log_totals.py       # Подсчёт итогов (вахтовик/местный)
├── work_log_export.py       # Экспорт в Excel
└── production_calendar.py   # Работа с календарём + isdayoff.ru
```

#### Этап 6: Производственный календарь (0.5 дня)

1. `GET /production-calendar?year=2025` — праздники из БД или внешнего API
2. Интеграция с `https://isdayoff.ru/api/` для автоматической загрузки
3. Кэширование (опционально Redis)

#### Этап 7: Тестирование (1 день)

- pytest для API-эндпоинтов
- Тесты валидации табеля
- Тесты подсчёта итогов (особенно вахтовик vs местный)
- Тесты производственного календаря

#### Этап 8: Переключение (0.5 дня)

1. Снять дамп БД (подстраховка)
2. Собрать новый фронтенд
3. Собрать FastAPI-образ
4. Обновить `docker-compose.yml`: заменить `./timesheet` на `./timesheet-api`
5. `docker compose up -d --build`
6. Проверить по чеклисту (см. раздел 11)
7. При проблемах — откатить на NestJS

---

## 9–11. См. отдельные файлы в `docs/`

| Секция | Файл |
|---|---|
| 9. Новая архитектура бэкенда | [`docs/09-new-backend-architecture.md`](docs/09-new-backend-architecture.md) |
| 10. Совместимость JWT и паролей | [`docs/10-jwt-password-compatibility.md`](docs/10-jwt-password-compatibility.md) |
| 11. Чеклист проверки миграции | [`docs/11-migration-checklist.md`](docs/11-migration-checklist.md) |