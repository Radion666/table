FROM node:20.11.0 AS build-stage

WORKDIR /app

COPY package.json yarn.lock ./

# RUN yarn install
RUN yarn install --production --ignore-engines
RUN yarn global add @nestjs/cli

COPY . .
RUN yarn build

EXPOSE 42131

# Запускаем приложение
CMD ["yarn", "start:prod"]
