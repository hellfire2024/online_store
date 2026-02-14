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
RUN echo "==== FILES IN /app ====" && ls -al /app && \
	echo "==== FILES IN /app/src ====" && ls -al /app/src || (echo "No src directory" && exit 1) && \
	echo "==== CONTENTS OF /app/src/main.tsx ====" && cat /app/src/main.tsx || echo "main.tsx missing" && \
	echo "==== CONTENTS OF /app/src/App.tsx ====" && cat /app/src/App.tsx || echo "App.tsx missing"
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
RUN echo "==== BEFORE BUILD: files in /app ====" && ls -al /app && \
	(npm run build || yarn build) || (echo "==== BUILD FAILED ====" && cat /app/dist/index.html 2>/dev/null || echo "No index.html" && exit 1)
RUN if [ -d /app/dist ]; then echo "==== AFTER BUILD: files in /app/dist ====" && ls -al /app/dist && echo "==== CONTENTS OF /app/dist/index.html ====" && cat /app/dist/index.html; else echo "No dist directory found" && exit 1; fi
RUN node verify-frontend-build.js

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
RUN echo "==== CONTENTS OF /usr/share/nginx/html/index.html (final image) ====" && cat /usr/share/nginx/html/index.html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD curl -f http://localhost:80 || exit 1
CMD ["nginx", "-g", "daemon off;"]
