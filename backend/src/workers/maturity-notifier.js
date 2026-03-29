import { randomUUID } from 'crypto';
import config from '../config/index.js';
import { query } from '../db/pool.js';
import { logError, logInfo } from '../logging/index.js';
import { sendMaturityEmail } from '../services/maturity.js';
import { getProducer, kafkaAvailable } from '../utils/message-broker.js';

let timer;
let isRunning = false;

async function fetchMaturePlots() {
  const [rows] = await query(
    `SELECT p.user_id AS userId, p.slot, p.type, p.planted_at AS plantedAt, u.email
     FROM plots p
     JOIN users u ON u.id = p.user_id
     WHERE p.harvested = 0
       AND p.type IS NOT NULL
       AND p.planted_at IS NOT NULL
       AND p.matured_notified = 0
       AND TIMESTAMPDIFF(MINUTE, p.planted_at, NOW()) >= ?`,
    [config.garden.growthMinutes]
  );

  return rows;
}

async function notifyPlot(plot) {
  const requestId = randomUUID();

  if (kafkaAvailable()) {
    const producer = await getProducer();
    if (producer) {
      const messagePayload = {
        requestId,
        userId: plot.userId,
        slot: plot.slot,
        type: plot.type,
        email: plot.email,
        createdAt: new Date().toISOString()
      };

      try {
        await producer.send({
          topic: config.kafka.maturityTopic,
          messages: [
            {
              key: requestId,
              value: JSON.stringify(messagePayload)
            }
          ]
        });

        logInfo('Уведомление о созревании поставлено в очередь', {
          event: 'garden.maturity.produced',
          topic: config.kafka.maturityTopic,
          requestId,
          userId: plot.userId,
          slot: plot.slot,
          type: plot.type
        });
        return true;
      } catch (error) {
        logError('Не удалось отправить уведомление в Kafka, используем прямую доставку', {
          event: 'garden.maturity.kafka_send_failed',
          topic: config.kafka.maturityTopic,
          requestId,
          userId: plot.userId,
          slot: plot.slot,
          type: plot.type,
          error: error.message
        });
      }
    } else {
      logError('Kafka producer недоступен, переходим на прямую отправку уведомления', {
        event: 'garden.maturity.kafka_unavailable',
        userId: plot.userId,
        slot: plot.slot,
        type: plot.type,
        requestId
      });
    }
  } else {
    logInfo('Kafka отключена, maturity-уведомление будет отправлено напрямую', {
      event: 'garden.maturity.kafka_disabled',
      userId: plot.userId,
      slot: plot.slot,
      type: plot.type,
      requestId
    });
  }

  const delivered = await sendMaturityEmail({ ...plot, requestId });
  if (!delivered) {
    return false;
  }

  logInfo('Уведомление о созревании отправлено напрямую', {
    event: 'garden.maturity.direct_sent',
    requestId,
    userId: plot.userId,
    slot: plot.slot,
    type: plot.type
  });
  return true;
}

async function checkMaturePlots() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const plots = await fetchMaturePlots();
    for (const plot of plots) {
      try {
        await notifyPlot(plot);
      } catch (error) {
        logError('Failed to process maturity notification', {
          event: 'garden.maturity.notify_failed',
          userId: plot.userId,
          slot: plot.slot,
          error: error.message,
          stack: error.stack
        });
      }
    }
  } catch (error) {
    logError('Failed to check mature plots', {
      event: 'garden.maturity.check_failed',
      error: error.message,
      stack: error.stack
    });
  } finally {
    isRunning = false;
  }
}

function scheduleNextRun(delayMs = config.scheduler.maturityCheckIntervalMs) {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(async () => {
    await checkMaturePlots();
    scheduleNextRun();
  }, delayMs);

  timer.unref();
}

export function startMaturityNotifier() {
  if (!config.email.enabled) {
    logInfo('Email notifications disabled, maturity notifier not started', {
      event: 'garden.maturity.notifier.disabled'
    });
    return null;
  }

  if (timer) {
    return timer;
  }

  logInfo('Starting maturity notifier', {
    event: 'garden.maturity.notifier.start',
    intervalMs: config.scheduler.maturityCheckIntervalMs,
    kafkaEnabled: kafkaAvailable()
  });

  scheduleNextRun(0);
  return timer;
}

export function stopMaturityNotifier() {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}
