FROM node:20.11.0 as build-stage

WORKDIR /app

COPY package*.json ./
RUN yarn install

COPY . .
RUN yarn build

EXPOSE 42131

# Запускаем приложение
CMD ["yarn", "start:prod"]  # Запускаем в продакшн режиме
