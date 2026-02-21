# Production-ready Dockerfile for React frontend (Vite build + nginx)

# Build stage
FROM node:20.11.1-slim AS build
WORKDIR /app
# Update and upgrade OS packages, then clean up
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
COPY package.json ./package.json
COPY vite.config.ts ./vite.config.ts
COPY index.html ./index.html
COPY public ./public
COPY src ./src
COPY verify-frontend-build.js ./verify-frontend-build.js
# Install only production dependencies, clean npm cache
RUN npm install --omit=dev --frozen-lockfile && npm cache clean --force
RUN npm run build || yarn build
RUN node verify-frontend-build.js
RUN rm -rf ~/.npm /tmp/*

# Runtime stage (distroless nginx)
FROM gcr.io/distroless/nginx-static:1.25
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
