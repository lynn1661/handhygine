FROM node:hydrogen-alpine

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3001

ENV SERVER_ENV=default

CMD node server.js