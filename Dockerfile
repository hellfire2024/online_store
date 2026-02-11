# Force redeploy: 2026-02-11

# Production-ready Dockerfile for React frontend (Vite build + nginx)

# Production Dockerfile for Vite React frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
COPY vite.config.ts .
COPY src ./src
COPY public ./public
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
RUN npm run build || yarn build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
