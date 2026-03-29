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

const toStringArray = (value, fallback = []) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const items = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
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
  supplies: {
    yogurt: {
      price: toInt(process.env.SUPPLY_YOGURT_PRICE, 25),
      volume: toInt(process.env.SUPPLY_YOGURT_VOLUME, 500)
    },
    sunflowerOil: {
      price: toInt(process.env.SUPPLY_SUNFLOWER_OIL_PRICE, 20),
      volume: toInt(process.env.SUPPLY_SUNFLOWER_OIL_VOLUME, 50)
    }
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
    immediateRefresh: toBool(process.env.OPENSEARCH_IMMEDIATE_REFRESH, true)
  },
  kafka: {
    enabled: toBool(process.env.KAFKA_ENABLED, true),
    brokers: toStringArray(process.env.KAFKA_BROKERS, ['kafka:9092']),
    clientId: getString(process.env.KAFKA_CLIENT_ID, 'ferm-backend'),
    consumerGroup: getString(process.env.KAFKA_CONSUMER_GROUP, 'ferm-plant-consumers'),
    plantTopic: getString(process.env.KAFKA_PLANT_TOPIC, 'ferm.garden.plant'),
    maturityTopic: getString(process.env.KAFKA_MATURITY_TOPIC, 'ferm.garden.maturity'),
    maturityConsumerGroup: getString(process.env.KAFKA_MATURITY_GROUP, 'ferm-maturity-consumers')
  },
  email: {
    enabled: toBool(process.env.EMAIL_ENABLED, true),
    host: getString(process.env.EMAIL_HOST, 'mailhog'),
    port: toInt(process.env.EMAIL_PORT, 1025),
    secure: toBool(process.env.EMAIL_SECURE, undefined),
    user: getString(process.env.EMAIL_USER),
    password: getString(process.env.EMAIL_PASSWORD),
    from: getString(process.env.EMAIL_FROM, 'no-reply@ferma.local')
  },
  scheduler: {
    maturityCheckIntervalMs: toInt(process.env.MATURITY_CHECK_INTERVAL_MS, 60000)
  }
};

if (!config.opensearch.enabled) {
  config.opensearch.node = '';
}

export default config;

