# Production-ready Dockerfile for React frontend (Vite build + nginx)

# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Copy frontend files (building from root context, so need frontend/ prefix)
COPY frontend/package.json ./package.json
COPY frontend/package-lock.json ./package-lock.json
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/index.html ./index.html
COPY frontend/tailwind.config.js ./tailwind.config.js
COPY frontend/postcss.config.js ./postcss.config.js
COPY frontend/public ./public
COPY frontend/src ./src
COPY frontend/components ./components
COPY frontend/context ./context
COPY frontend/hooks ./hooks
COPY frontend/pages ./pages
COPY frontend/services ./services
COPY frontend/types.ts ./types.ts
COPY frontend/verify-frontend-build.js ./verify-frontend-build.js

# Install dependencies (production only)
RUN npm install --frozen-lockfile && npm cache clean --force

# Build the app
RUN npm run build

# Verify build artifacts
RUN node verify-frontend-build.js
RUN rm -rf ~/.npm /tmp/*

# Runtime stage (nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
