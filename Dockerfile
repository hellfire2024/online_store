
# Production-ready Dockerfile for React frontend (Vite build + nginx)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build

# --- Serve with nginx ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
COPY --from=build /app/public /usr/share/nginx/html/public
COPY --from=build /app/nginx.conf /etc/nginx/nginx.conf  # Optional: custom nginx config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
