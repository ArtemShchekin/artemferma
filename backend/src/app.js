import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { loadOpenApi } from './utils/openapi.js';

function buildFallbackSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'API documentation unavailable',
      version: '1.0.0',
      description: 'Не удалось загрузить спецификацию OpenAPI. Проверьте логи сервера.'
    },
    paths: {
      '/__docs-unavailable': {
        get: {
          summary: 'Документация временно недоступна',
          description: 'Спецификация OpenAPI не была загружена при старте сервера.',
          responses: {
            '503': {
              description: 'Спецификация не загружена'
            }
          }
        }
      }
    }
  };
}

function setupSwagger(app) {
  const openapi = loadOpenApi();
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      url: '/api/docs/openapi.json'
    }
  };

  app.get('/api/docs/openapi.json', (_req, res) => {
    const spec = loadOpenApi();
    if (spec) {
      res.json(spec);
    } else {
      res.status(200).json(buildFallbackSpec());
    }
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, swaggerUiOptions));
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    helmet({
      // Swagger UI использует встроенные скрипты/стили и отдельные ассеты,
      // поэтому стандартный CSP и ограничения на кросс-доменные ресурсы ломают загрузку.
      // Отключаем эти политики, оставляя остальные механизмы Helmet активными.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false
    })
  );  

  app.use(requestLogger);

  setupSwagger(app);

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}