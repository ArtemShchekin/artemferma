
import { createApp } from './app.js';
import config from './config/index.js';
import { ensureDatabaseConnection, closePool } from './db/pool.js';
import { logError, logShutdown, logStartup } from './logging/index.js';

async function bootstrap() {

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    logError('Failed to establish database connection', {
      event: 'startup.database_error',
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logStartup({ port: config.port, message: `Backend started on port ${config.port}` });
  });

let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    logShutdown(signal, { signal });

    const finish = () => {
      closePool()
        .catch((error) => {
          logError('Failed to close database pool during shutdown', {
            event: 'shutdown.pool_error',
            error: error.message,
            stack: error.stack
          });
        })
        .finally(() => process.exit(0));
    };

    server.close(finish);
    setTimeout(finish, 10000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', {
      event: 'unhandledRejection',
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });
  });

  process.on('uncaughtException', (error) => {
    logError('Uncaught exception', {
      event: 'uncaughtException',
      error: error.message,
      stack: error.stack
    });
  });
}

bootstrap().catch((error) => {
  logError('Failed to start backend', {
    event: 'startup.failed',
    error: error.message,
    stack: error.stack
  });
    process.exit(1);

});
