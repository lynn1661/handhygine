# build stage
FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 修复MediaPipe文件权限，确保nginx可以读取所有文件（包括子目录）
RUN find /usr/share/nginx/html -type f -exec chmod 644 {} \; || true

ENV NODE_ENV=production
EXPOSE 81
CMD ["nginx", "-g", "daemon off;"]