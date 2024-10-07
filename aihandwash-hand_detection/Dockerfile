FROM node:hydrogen-alpine

WORKDIR /app
COPY . .
RUN corepack enable
RUN cd /app/demos/live_video;yarn run create;cd /app/demos/live_video;yarn

EXPOSE 1234
CMD corepack enable && cd /app/demos/live_video && yarn run watch