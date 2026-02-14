# This Dockerfile is now for the frontend only, and should be placed in the frontend/ directory.
# It expects all build files to be present in the same directory.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Debug: Show files before and after build, and log errors if build fails
COPY verify-frontend-build.js ./verify-frontend-build.js
# Debug: List files in /app and /app/src after COPY
RUN echo "==== FILES IN /app ====" && ls -al /app && echo "==== FILES IN /app/src ====" && ls -al /app/src || echo "No src directory" && exit 1
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
RUN echo "==== BEFORE BUILD: files in /app ====" && ls -al /app && \
	(npm run build || yarn build) || (echo "==== BUILD FAILED ====" && cat /app/dist/index.html 2>/dev/null || echo "No index.html" && exit 1)
RUN echo "==== AFTER BUILD: files in /app/dist ====" && ls -al /app/dist || echo "No dist directory found" && exit 1
RUN node verify-frontend-build.js

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD curl -f http://localhost:80 || exit 1
CMD ["nginx", "-g", "daemon off;"]
