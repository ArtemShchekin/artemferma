
# Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests. Allow building even if package-lock.json is absent
# by falling back to `npm install`.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
