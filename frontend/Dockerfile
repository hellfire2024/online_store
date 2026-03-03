# This Dockerfile is now for the frontend only, and should be placed in the frontend/ directory.
# It expects all build files to be present in the same directory.
FROM node:lts-alpine AS build
# Patch Alpine vulnerabilities
RUN apk upgrade --no-cache
WORKDIR /app

COPY frontend/package.json ./
COPY frontend/.env.example ./.env.example
# If .env is missing, copy .env.example as .env
RUN if [ ! -f .env ]; then cp .env.example .env; fi
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY tailwind.config.js ./tailwind.config.js
COPY postcss.config.js ./postcss.config.js

COPY frontend/public ./public
COPY frontend/pages ./pages
COPY frontend/context ./context
COPY frontend/components ./components
COPY frontend/hooks ./hooks
COPY services ./services
COPY frontend/src ./src

COPY frontend/verify-frontend-build.js ./verify-frontend-build.js
RUN echo "==== FILES IN /app ====" && ls -al /app && \
    echo "==== FILES IN /app/src ====" && ls -al /app/src || (echo "No src directory" && exit 1) && \
    echo "==== CONTENTS OF /app/src/main.tsx ====" && cat /app/src/main.tsx || echo "main.tsx missing" && \
    echo "==== CONTENTS OF /app/src/App.tsx ====" && cat /app/src/App.tsx || echo "App.tsx missing"
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
# Always run Vite build inside the container, never copy dist from host
RUN echo "==== BEFORE BUILD: files in /app ====" && ls -al /app && \
    (npm run build || yarn build) || (echo "==== BUILD FAILED ====" && exit 1)
# Fail if dist/index.html is missing or empty
RUN if [ ! -f /app/dist/index.html ] || [ ! -s /app/dist/index.html ]; then echo "dist/index.html missing or empty, build failed" && exit 1; fi
RUN echo "==== AFTER BUILD: files in /app/dist ====" && ls -al /app/dist && echo "==== CONTENTS OF /app/dist/index.html ====" && cat /app/dist/index.html
RUN node verify-frontend-build.js

FROM nginxinc/nginx-unprivileged:stable-alpine-slim
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
