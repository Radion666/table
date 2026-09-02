# Используем официальный Node.js образ
FROM node:20.11.0 AS build-stage

WORKDIR /app

COPY package*.json ./
RUN yarn install

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN yarn build

FROM nginx:alpine AS production-stage

RUN mkdir /app

COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf
# COPY --from=build-stage /app/dist /usr/share/nginx/html
# COPY --from=build-stage /app/dist /usr/share/nginx/html

# EXPOSE 80



# # Используем официальный Node.js образ
# FROM node:20.11.0 as build-stage

# WORKDIR /app
# COPY package*.json ./
# RUN npm i
# COPY ./ .
# RUN npm run build

# FROM nginx as production-stage
# RUN mkdir /app
# COPY --from=build-stage /app/dist /app
# COPY nginx.conf /etc/nginx/nginx.conf