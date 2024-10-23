FROM node:20.11.0 as build-stage

WORKDIR /app


COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 42131

# Запускаем приложение
CMD ["npm", "run", "start:prod"]  # Запускаем в продакшн режиме
