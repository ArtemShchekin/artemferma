
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY src ./src
COPY migrations ./migrations
COPY openapi.yaml /app/openapi.yaml
ENV NODE_ENV=production
CMD ["sh", "-c", "node src/migrate.js && node src/index.js"]
