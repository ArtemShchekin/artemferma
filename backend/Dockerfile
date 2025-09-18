FROM node:20-alpine
WORKDIR /app

# Install dependencies using lockfile when present
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy application source
COPY . .

ENV NODE_ENV=production
CMD ["sh", "-c", "node src/migrate.js && node src/index.js"]
