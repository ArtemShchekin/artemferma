import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }
  return fallback;
};

const getString = (value, fallback = '') => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : fallback;
};

const config = {
  env: getString(process.env.NODE_ENV, 'development'),
  port: toInt(process.env.PORT, 3000),
  jwtSecret: getString(process.env.JWT_SECRET, 'devsecret'),
    jwtAccessExpiresIn: getString(process.env.JWT_ACCESS_EXPIRES_IN, '15m'),
  jwtRefreshSecret: getString(process.env.JWT_REFRESH_SECRET, 'devrefreshsecret'),
  jwtRefreshExpiresIn: getString(process.env.JWT_REFRESH_EXPIRES_IN, '30d'),
  database: {
    host: getString(process.env.DB_HOST, 'mysql'),
    port: toInt(process.env.DB_PORT, 3306),
    user: getString(process.env.DB_USER, 'ferm'),
    password: getString(process.env.DB_PASSWORD, 'fermpass'),
    database: getString(process.env.DB_NAME, 'fermdb'),
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
    connectRetryAttempts: toInt(process.env.DB_CONNECT_RETRY_ATTEMPTS, 30),
    connectRetryDelayMs: toInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 1000)
  },
  prices: {
    purchaseBase: toInt(process.env.PURCHASE_BASE_PRICE, 2),
    purchaseAdv: toInt(process.env.PURCHASE_ADV_PRICE, 5),
    saleBase: toInt(process.env.SALE_BASE_PRICE, 4),
    saleAdv: toInt(process.env.SALE_ADV_PRICE, 10)
  },
  garden: {
    slots: toInt(process.env.GARDEN_SLOTS, 6),
    growthMinutes: toInt(process.env.GROWTH_MINUTES, 10)
  },
  opensearch: {
    enabled: toBool(process.env.OPENSEARCH_ENABLED, true),
    node: getString(process.env.OPENSEARCH_NODE, 'http://opensearch:9200'),
    index: getString(process.env.OPENSEARCH_LOG_INDEX, 'ferm-logs'),
    username: getString(process.env.OPENSEARCH_USERNAME),
    password: getString(process.env.OPENSEARCH_PASSWORD),
    rejectUnauthorized: toBool(process.env.OPENSEARCH_TLS_REJECT_UNAUTHORIZED, true),
    indexRetryAttempts: toInt(process.env.OPENSEARCH_INDEX_RETRY_ATTEMPTS, 24),
    indexRetryDelayMs: toInt(process.env.OPENSEARCH_INDEX_RETRY_DELAY_MS, 5000),
    immediateRefresh: toBool(process.env.OPENSEARCH_IMMEDIATE_REFRESH, true)  }
};

if (!config.opensearch.enabled) {
  config.opensearch.node = '';
}

export default config;