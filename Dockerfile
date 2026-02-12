# Production-ready Dockerfile for React frontend (Vite build + nginx)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./package.json
COPY vite.config.ts ./vite.config.ts
COPY index.html ./index.html
COPY public ./public
COPY src ./src
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
RUN npm run build || yarn build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
