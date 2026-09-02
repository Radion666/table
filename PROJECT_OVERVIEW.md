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
| Контейнер   | Образ            | Порты       | Назначение           |
|-------------|------------------|-------------|----------------------|
| frontend    | multi-stage build| 80, 443     | nginx + React SPA + SSL |
| backend     | node:20          | 42131       | NestJS API           |
| postgres    | postgres:16.3-alpine | 5432 (127.0.0.1) | БД PostgreSQL   |
| pgadmin     | dpage/pgadmin4   | 5050        | Управление БД        |

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

### SSL (Let's Encrypt)
```bash
# Остановить контейнеры (certbot нужен порт 80)
docker compose down

# Сгенерировать сертификат
certbot certonly --standalone -d your_domain.ru --non-interactive --agree-tos --email your@email.com

# Заменить DOMAIN в nginx.conf на реальный домен
sed -i 's/DOMAIN/your_domain.ru/g' timesheet-front/nginx.conf

# Запустить обратно
docker compose up -d --build
```

### CI/CD (GitHub Actions)
- Пуш в `master` → SSH на VPS → `git pull` → `docker compose up -d --build`

### Первый запуск (создание данных)
После деплоя — через SQL или Swagger (`/api/docs`):

```sql
INSERT INTO roles (name, "alt_name", "createdAt", "updatedAt")
VALUES
('admin', 'Администратор', NOW(), NOW()),
('master', 'Мастер', NOW(), NOW()),
('personnel_officer', 'Кадровик', NOW(), NOW()),
('financier', 'Финансист', NOW(), NOW());
```

Создать админа через API:
```bash
curl -X POST http://localhost:42131/api/v1/auth/create \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"YourPassword!","lastName":"Admin","firstName":"Admin","middleName":"Adminov","role_id":2,"phoneNumber":"+79000000000"}'
```

---

## ⚠️ Известные проблемы и решения

### ✅ Решённые (при деплое)
1. ~~Нет `.env` файлов~~ → Создан `.env` на сервере
2. ~~Порт бэкенда~~ → `app.listen(PORT, '0.0.0.0')` для Docker
3. ~~Sequelize `synchronize: false`~~ → В проде `synchronize: true`, таблицы создаются автоматически
4. ~~JWT secret fallback `'secret'`~~ → `PRIVATE_KEY` обязательно в `.env`
5. ~~`VITE_API_URL` не передаётся при сборке~~ → Передаётся через `args` в docker-compose.yml
6. ~~Порт 5432 postgres доступен извне~~ → Привязан к `127.0.0.1:5432`
7. ~~SSL/HTTPS~~ → Настроен Let's Encrypt + nginx

### 🟡 Безопасность (не критично)
1. bcrypt salt rounds = 5 (рекомендуется 10-12)
2. CORS: `cors: true` — все origins
3. Exception filter логирует stack trace, hostname, env

### 🟠 Баги кода
1. `WorkLogsService` зарегистрирован дважды в providers модуля
2. `RolesService.findById` может вернуть undefined → RolesGuard всегда 403
3. Redux store пересоздаётся на каждый рендер (App.tsx)
4. Нет миграций БД — полная зависимость от autoLoadModels