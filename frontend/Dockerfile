# ==========================================================
# SafeHER Production Multi-Stage Frontend Dockerfile
# Builds React/Vite UI and serves via unprivileged Nginx
# ==========================================================

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# Stage 2: Hardened Unprivileged Nginx Runtime
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
