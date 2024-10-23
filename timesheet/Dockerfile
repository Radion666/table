FROM node:20.11.0 AS build-stage

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .
RUN yarn build

EXPOSE 42131

# Запускаем приложение
CMD ["yarn", "start:prod"]
