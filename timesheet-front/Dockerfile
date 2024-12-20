# Dockerfile для фронтенда
FROM node:20.11.0 AS build-stage

WORKDIR /app

# Копирование зависимостей и установка
COPY package*.json ./
RUN yarn install

# Копирование исходного кода и сборка
COPY . .
RUN yarn build

# Используем Nginx для продакшн окружения
FROM nginx:alpine AS production-stage

# Копирование сертификатов и ключей SSL в контейнер
COPY ssl/goldrekrut.ru.crt /etc/ssl/
COPY ssl/goldrekrut.ru.key /etc/ssl/

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Копирование собранного фронтенда в директорию Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Убедитесь, что права на файлы SSL корректные
RUN chmod 644 /etc/ssl/certs/goldrekrut.ru.crt /etc/ssl/private/goldrekrut.ru.key
