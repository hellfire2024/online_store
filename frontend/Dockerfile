# This Dockerfile is now for the frontend only, and should be placed in the frontend/ directory.
# It expects all build files to be present in the same directory.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src
COPY verify-frontend-build.js ./verify-frontend-build.js
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
RUN npm run build || yarn build
RUN node verify-frontend-build.js

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
