# Timesheet App

> **Automated time tracking system for construction and shift-based enterprises.**

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | NestJS 10, TypeScript, Sequelize ORM |
| Frontend | React 18, Vite 5, Ant Design, Tailwind CSS |
| Database | PostgreSQL 16 |
| Auth | JWT (default 30 days), Role-based access |
| Infra | Docker Compose, Nginx, Let's Encrypt SSL |
| Export | Excel (exceljs) |
| Notifications | Telegram Bot (optional) |

## Project Structure

```
table/
└── table/
    ├── timesheet/          # Backend (NestJS)
    ├── timesheet-front/    # Frontend (React + Vite)
    ├── docker-compose.yml  # Orchestration
    ├── .env                # Environment variables
    ├── .env.example        # Example env file
    └── PROJECT_OVERVIEW.md # Detailed documentation
```

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/Radion666/table.git
cd table
cp .env.example .env
# Edit .env with your values
```

### 2. Launch with Docker

```bash
docker compose up -d --build
```

### 3. Create initial data

Using SQL directly in PostgreSQL or via Swagger (`/api/docs`):

```sql
INSERT INTO roles (name, "alt_name", "createdAt", "updatedAt")
VALUES
('admin', 'Администратор', NOW(), NOW()),
('master', 'Мастер', NOW(), NOW()),
('personnel_officer', 'Кадровик', NOW(), NOW()),
('financier', 'Финансист', NOW(), NOW());
```

Create admin user via API:

```bash
curl -X POST http://localhost:42131/api/v1/auth/create \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"YourPassword!","lastName":"Admin","firstName":"Admin","middleName":"Adminov","role_id":2,"phoneNumber":"+79000000000"}'
```

### 4. SSL with Let's Encrypt

```bash
# Install certbot
apt install certbot -y

# Stop containers first (certbot needs port 80)
docker compose down

# Generate certificate
certbot certonly --standalone -d your_domain.ru --non-interactive --agree-tos --email your@email.com

# Replace DOMAIN in nginx.conf
sed -i 's/DOMAIN/your_domain.ru/g' timesheet-front/nginx.conf

# Restart
docker compose up -d --build
```

## Environment Variables

### Backend (`.env` or docker-compose env)

| Variable | Description | Required |
| --- | --- | --- |
| PORT | NestJS port (default: 42131) | Yes |
| PG_HOST | PostgreSQL host | Yes |
| PG_PORT | PostgreSQL port | Yes |
| PG_USERNAME | PostgreSQL user | Yes |
| PG_PASSWORD | PostgreSQL password | Yes |
| PG_DATABASE | PostgreSQL database | Yes |
| PRIVATE_KEY | JWT secret | **Yes** |
| TG_API_TOKEN | Telegram Bot token | No |
| TG_CHAT_ID | Telegram Chat ID | No |
| NODE_ENV | Environment (production) | Yes |

### Frontend (build-time)

| Variable | Description | Example |
| --- | --- | --- |
| VITE_API_URL | API base URL | `/api/v1` |

## API Endpoints

| Endpoint | Description | Auth |
| --- | --- | --- |
| POST /api/v1/auth | Login | Public |
| POST /api/v1/auth/create | Create user | Public |
| GET /api/v1/auth/user | Get current user | JWT |
| GET /api/v1/roles | List roles | JWT (Admin) |
| POST/GET/PATCH/DELETE /api/v1/facilities | CRUD facilities | JWT (Admin) |
| GET /api/v1/employees | List employees | JWT |
| POST/GET/PATCH/DELETE /api/v1/users | CRUD users | JWT (Admin) |
| POST/GET/PATCH/DELETE /api/v1/work-logs | CRUD work logs | JWT |
| GET /api/v1/production-calendar | Production calendar | Public |

Swagger docs: `https://your_domain.ru/api/docs`

## Roles

| Role | Description |
| --- | --- |
| admin | Full access (CRUD everything) |
| master | Timesheet for their facilities, employees, reports |
| personnel_officer | Manage employees, timesheet |
| financier | View timesheet, reports (read-only) |

## Docker Compose Services

| Service | Port | Description |
| --- | --- | --- |
| frontend | 80, 443 | Nginx + React SPA + SSL |
| backend | 42131 | NestJS API |
| postgres | 5432 | PostgreSQL Database |
| pgadmin | 5050 | pgAdmin (UI) |

## Deployment (CI/CD)

Push to `master` branch triggers GitHub Actions:
- SSH to VPS
- `git pull`
- `docker compose up -d --build`

## Notes

- Backend binds to `0.0.0.0` inside Docker for inter-container communication
- Telegram module is optional — if `TG_API_TOKEN` is not set, the app starts without it
- PostgreSQL port 5432 is exposed only on `127.0.0.1` for security
- SSL certificates are mounted from `/etc/letsencrypt` (read-only)

## License

Private project. All rights reserved.
