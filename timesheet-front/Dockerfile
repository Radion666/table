FROM node:20.11.0 AS build-stage

WORKDIR /app

COPY package*.json ./
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine AS production-stage

COPY ssl/goldrekrut.ru.crt /etc/ssl/certs/
COPY ssl/goldrekrut.ru.key /etc/ssl/private/

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build-stage /app/dist /usr/share/nginx/html
