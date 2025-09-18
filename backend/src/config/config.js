import dotenv from 'dotenv';

dotenv.config();

const int = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || 'devsecret',
  database: {
    host: process.env.DB_HOST || 'mysql',
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'ferm',
    password: process.env.DB_PASSWORD || 'fermpass',
    database: process.env.DB_NAME || 'fermdb',
    connectionLimit: int(process.env.DB_CONNECTION_LIMIT, 10)
  },
  prices: {
    purchaseBase: int(process.env.PURCHASE_BASE_PRICE, 2),
    purchaseAdv: int(process.env.PURCHASE_ADV_PRICE, 5),
    saleBase: int(process.env.SALE_BASE_PRICE, 4),
    saleAdv: int(process.env.SALE_ADV_PRICE, 10)
  },
  garden: {
    slots: int(process.env.GARDEN_SLOTS, 6),
    growthMinutes: int(process.env.GROWTH_MINUTES, 10)
  },
  opensearch: {
    node: process.env.OPENSEARCH_NODE || '',
    index: process.env.OPENSEARCH_LOG_INDEX || 'ferm-logs',
    username: process.env.OPENSEARCH_USERNAME || '',
    password: process.env.OPENSEARCH_PASSWORD || '',
    rejectUnauthorized: process.env.OPENSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false'
  }
};

export default config;