import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { loadOpenApi } from './utils/openapi.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(
    helmet({
      // Swagger UI использует встроенные скрипты/стили и отдельные ассеты,
      // поэтому стандартный CSP и ограничения на кросс-доменные ресурсы ломают загрузку.
      // Отключаем эти политики, оставляя остальные механизмы Helmet активными.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    })
  );  
  app.use(requestLogger);

  const openapi = loadOpenApi();
  if (openapi) {
    app.get('/api/docs/openapi.json', (_req, res) => {
      res.json(openapi);
    });
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(null, {
        swaggerOptions: {
          url: '/api/docs/openapi.json'
        }
      })
    );
  }

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}