# Stage 1: build the static site.
FROM node:24-alpine AS build
WORKDIR /app

# Install first, so this layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The canonical URL, sitemap and robots.txt are written at build time.
# Set it with: docker compose build --build-arg SITE_URL=https://your-domain
ARG SITE_URL=https://geofare.example
ENV SITE_URL=$SITE_URL
RUN npm run build

# Stage 2: serve dist/ with nginx. Nothing from stage 1 except the built files.
FROM nginxinc/nginx-unprivileged:stable-alpine

# The image's default user is nginx (uid 101); it can bind port 8080 and write to /tmp only.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
