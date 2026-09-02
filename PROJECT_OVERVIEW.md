# 📋 Timesheet App — Обзор проекта

## 🎯 Назначение

**Timesheet App** — система табельного учёта рабочего времени сотрудников для вахтовых/строительных предприятий. Позволяет вести учёт отработанных часов, смен, больничных, отпусков по объектам (facilities) и сотрудникам (employees), а также генерировать Excel-отчёты.

---

## 🏗 Архитектура

### Монорепозиторий
```
table/
└── table/
    ├── timesheet/          # Backend (NestJS)
    ├── timesheet-front/    # Frontend (React + Vite)
    ├── docker-compose.yml  # Оркестрация контейнеров
    └── .github/workflows/  # CI/CD (SSH deploy)
```

### Backend — NestJS 10
- **ORM**: Sequelize + sequelize-typescript → PostgreSQL 16
- **Аутентификация**: JWT (модуль @nestjs/jwt), токен 30 дней
- **Авторизация**: Ролевая (admin, master, personnel_officer, financier)
- **API Prefix**: `/api/v1`
- **Swagger**: `/api/docs`
- **Логирование**: Winston + Telegram Bot API (ошибки → TG чат)
- **Экспорт**: exceljs → генерация XLSX отчётов
- **Кэширование**: @nestjs/cache-manager

### Frontend — React 18 + Vite 5
- **Стейт**: Redux Toolkit + React Query (@tanstack/react-query)
- **UI**: Ant Design + Tailwind CSS
- **Таблицы**: AG Grid
- **Формы**: React Hook Form
- **Роутинг**: React Router DOM v6
- **HTTP**: Axios с интерцепторами (JWT Bearer)
- **Сборка**: Vite → nginx (alpine) в Docker

### Инфраструктура — Docker Compose
| Контейнер   | Образ            | Порт  | Назначение           |
|-------------|------------------|-------|----------------------|
| frontend    | multi-stage build| 80    | nginx + React SPA    |
| backend     | node:20.11       | 42131 | NestJS API           |
| postgres    | postgres:16.3-alpine | 5432 | БД PostgreSQL       |
| pgadmin     | dpage/pgadmin4   | 5050  | Управление БД        |

---

## 📊 Модель данных

### Основные сущности
| Сущность             | Описание                                    |
|----------------------|---------------------------------------------|
| **User**             | Пользователь системы (логин, пароль, ФИО, роль, должность) |
| **Role**             | Роль: admin, master, personnel_officer, financier, worker |
| **Position**         | Должность (связана с объектами M:N)         |
| **Employee**         | Сотрудник (ФИО, статус, связи с периодами)  |
| **Facility**         | Объект/стройка (наименование, настройки табеля, рабочие дни) |
| **WorkLog**          | Запись табеля (сотрудник + объект + дата + часы) |
| **ChangeLog**        | Лог изменений табеля (старое/новое значение) |
| **ProductionCalendar** | Производственный календарь по объектам   |

### Периоды (история состояний сотрудника)
| Период                | Описание                                   |
|-----------------------|--------------------------------------------|
| EmploymentPeriod      | Трудоустройство/увольнение (working/fired/archived) |
| FacilityPeriod        | Привязка сотрудника к объекту             |
| MasterPeriod          | Назначение мастера на сотрудника          |
| PositionPeriod        | Назначение должности сотруднику           |
| OutOfTownPeriod       | Период вахты/командировки                  |

### Связующие таблицы
| Таблица               | Описание                                    |
|-----------------------|---------------------------------------------|
| MasterFacilities      | M:N связь мастер ↔ объект                   |
| PositionFacility      | M:N связь должность ↔ объект                |

---

## 🔐 Безопасность

- **Аутентификация**: JWT Bearer token, срок 30 дней
- **Авторизация**: Декоратор `@Roles()` + Guard `RolesGuards`
- **Хеширование паролей**: bcryptjs, salt rounds = 5 ⚠️ (рекомендуется 10-12)
- **JWT Secret**: берётся из env `PRIVATE_KEY`, fallback `'secret'` ⚠️
- **CORS**: включён глобально (`cors: true`) — все origins
- **Exception Filter**: логирует stack trace, hostname, env — утечка в проде ⚠️

### Роли и доступ
| Роль               | Доступ                                                |
|--------------------|-------------------------------------------------------|
| admin              | Полный доступ (CRUD всего)                            |
| master             | Табель по своим объектам, сотрудники, отчёты           |
| personnel_officer  | Управление сотрудниками, табель                        |
| financier          | Просмотр табеля, отчёты (Excel), только чтение         |

---

## ⚙️ Переменные окружения

### Backend (`.production.env` или env контейнера)
| Переменная      | Описание                         | Обязательно | Default  |
|-----------------|----------------------------------|-------------|----------|
| PORT            | Порт NestJS                      | Да          | 5000 ⚠️  |
| PG_HOST         | Хост PostgreSQL                  | Да          | —        |
| PG_PORT         | Порт PostgreSQL                  | Да          | —        |
| PG_USERNAME     | Пользователь БД                  | Да          | —        |
| PG_PASSWORD     | Пароль БД                        | Да          | —        |
| PG_DATABASE     | Имя БД                           | Да          | —        |
| PRIVATE_KEY     | JWT секрет                       | ДА! ⚠️     | 'secret' |
| TG_API_TOKEN    | Telegram Bot токен               | Нет         | —        |
| TG_CHAT_ID      | Telegram Chat ID                 | Нет         | —        |
| NODE_ENV        | Окружение                        | Да          | —        |

### Frontend (build-time)
| Переменная      | Описание                         | Пример              |
|-----------------|----------------------------------|---------------------|
| VITE_API_URL    | URL API бэкенда                  | `/api/v1`           |

---

## 🚀 Деплой

### Docker Compose
```bash
docker compose up -d --build
```

### CI/CD (GitHub Actions)
- Пуш в `master` → SSH на VPS → `git pull` → `docker compose down` → `docker compose up -d --build`

### Первый запуск (создание данных)
После деплоя через Swagger (`/api/docs`):
1. Создать роли: `POST /api/v1/roles` — `{name: "admin", alt_name: "Администратор"}`
2. Создать другие роли: master, personnel_officer, financier
3. Создать первого админа: `POST /api/v1/auth/create`

---

## ⚠️ Известные проблемы (выявлены при анализе)

### 🔴 Критические (блокируют деплой)
1. **Нет `.env` файлов** — приложение не запустится без переменных
2. **Порт бэкенда**: NestJS default 5000, но Dockerfile/nginx ожидают 42131
3. **Sequelize `synchronize: false`** — таблицы НЕ создадутся на пустой БД
4. **JWT secret fallback `'secret'`** — критическая уязвимость
5. **`VITE_API_URL` не передаётся при сборке** — фронтенд не найдёт API

### 🟡 Безопасность
1. bcrypt salt rounds = 5 (рекомендуется 10-12)
2. CORS: `cors: true` — все origins
3. Exception filter утекает stack trace, hostname, env в ответы API
4. Порт 5432 postgres доступен извне в docker-compose
5. Хардкод `lastLoginAt: '2024-10-08 14:30:00'` в users.service.ts

### 🟠 Баги кода
1. `WorkLogsService` зарегистрирован дважды в providers модуля
2. `RolesService.findById` может вернуть undefined → RolesGuard всегда 403
3. Redux store пересоздаётся на каждый рендер (App.tsx)
4. Нет миграций БД — полная зависимость от autoLoadModels