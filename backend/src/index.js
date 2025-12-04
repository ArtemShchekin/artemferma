import { createApp } from './app.js';
import config from './config/index.js';
import { closePool, ensureDatabaseConnection } from './db/pool.js';
import { logError, logShutdown, logStartup } from './logging/index.js';
import { disconnectKafka } from './utils/message-broker.js';
import { startPlantConsumer, stopPlantConsumer } from './workers/plant-consumer.js';
import { startMaturityNotifier, stopMaturityNotifier } from './workers/maturity-notifier.js';

async function bootstrap() {
  await ensureDatabaseConnection();
  try {
    await startPlantConsumer();
  } catch (error) {
    logError('Failed to start plant consumer', {
      event: 'startup.consumer_failed',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }

  try {
    await startMaturityNotifier();
  } catch (error) {
    logError('Failed to start maturity notifier', {
      event: 'startup.maturity_notifier_failed',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logStartup({ port: config.port, message: `Backend started on port ${config.port}` });
  });

  let shuttingDown = false;

  const finishShutdown = async () => {
    try {
      await stopPlantConsumer();
    } catch (error) {
      logError('Failed to stop plant consumer during shutdown', {
        event: 'shutdown.consumer_error',
        error: error.message,
        stack: error.stack
      });
    }

    try {
      await stopMaturityNotifier();
    } catch (error) {
      logError('Failed to stop maturity notifier during shutdown', {
        event: 'shutdown.maturity_notifier_error',
        error: error.message,
        stack: error.stack
      });
    }

    try {
      await disconnectKafka();
    } catch (error) {
      logError('Failed to disconnect Kafka during shutdown', {
        event: 'shutdown.kafka_error',
        error: error.message,
        stack: error.stack
      });
    }

    try {
      await closePool();
    } catch (error) {
      logError('Failed to close database pool during shutdown', {
        event: 'shutdown.pool_error',
        error: error.message,
        stack: error.stack
      });
    } finally {
      process.exit(0);
    }
  };
  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    logShutdown(signal, { signal });

    server.close(() => {
      finishShutdown().catch((error) => {
        logError('Graceful shutdown failed', {
          event: 'shutdown.failed',
          error: error.message,
          stack: error.stack
        });
        process.exit(1);
      });
    });

    setTimeout(() => {
      logError('Forcing shutdown after timeout', {
        event: 'shutdown.timeout',
        timeoutMs: 10000
      });
      finishShutdown().catch(() => process.exit(1));
    }, 10000).unref();
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
