import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';
import { ServiceUnavailableError } from '../utils/errors.js';
import { createConsumer, kafkaAvailable, releaseConsumer } from '../utils/message-broker.js';
import { sendMaturityEmail } from './maturity.js';

let consumerInstance;

function parseMaturityMessage(message) {
  if (!message.value) {
    throw new Error('Сообщение без данных');
  }

  const requestId = message.key ? message.key.toString('utf8') : undefined;
  const payloadText = message.value.toString('utf8');
  const payload = JSON.parse(payloadText);

  const userId = Number(payload.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Некорректный идентификатор пользователя');
  }

  const slot = Number(payload.slot);
  if (!Number.isInteger(slot) || slot <= 0) {
    throw new Error('Некорректный номер грядки');
  }

  return {
    userId,
    slot,
    type: payload.type,
    email: payload.email,
    requestId: payload.requestId || requestId
  };
}

function createMaturityHandler(onProcessed) {
  return async ({ topic, partition, message }) => {
    try {
      const payload = parseMaturityMessage(message);

      const delivered = await sendMaturityEmail(payload);
      if (delivered && onProcessed) {
        onProcessed();
      }

      logInfo('Сообщение об урожае обработано', {
        event: 'garden.maturity.consumed',
        topic,
        partition,
        offset: message.offset,
        userId: payload.userId,
        slot: payload.slot,
        type: payload.type,
        requestId: payload.requestId
      });
    } catch (error) {
      logError('Ошибка при обработке сообщения созревания', {
        event: 'garden.maturity.consume_failed',
        topic,
        partition,
        offset: message.offset,
        error: error.message
      });
    }
  };
}

export async function consumeMaturityNotifications({ limit = 10, timeoutMs = 2000 } = {}) {
  if (!kafkaAvailable()) {
    throw new ServiceUnavailableError('Очередь уведомлений недоступна');
  }

  const consumer = await createConsumer(config.kafka.maturityConsumerGroup);
  if (!consumer) {
    throw new ServiceUnavailableError('Очередь уведомлений недоступна');
  }

  let processed = 0;
  let timer;

  const stopConsumer = async () => {
    try {
      await consumer.stop();
    } catch (error) {
      logError('Не удалось остановить consumer уведомлений', {
        event: 'garden.maturity.consumer.stop_failed',
        error: error.message
      });
    }
  };

  if (timeoutMs > 0) {
    timer = setTimeout(stopConsumer, timeoutMs);
    timer.unref();
  }

  await consumer.subscribe({ topic: config.kafka.maturityTopic, fromBeginning: false });
  await consumer.run({
    eachMessage: createMaturityHandler(async () => {
      processed += 1;
      if (processed >= limit) {
        await stopConsumer();
      }
    })
  });

  if (timer) {
    clearTimeout(timer);
  }

  await consumer.disconnect();
  releaseConsumer(consumer);

  return processed;
}

export async function startMaturityConsumer() {
  if (!config.email.enabled) {
    logInfo('Email уведомления отключены, consumer созревания не запущен', {
      event: 'garden.maturity.consumer.email_disabled'
    });
    return null;
  }

  if (!kafkaAvailable()) {
    logInfo('Kafka отключена, consumer созревания не запущен', {
      event: 'garden.maturity.consumer.disabled'
    });
    return null;
  }

  if (consumerInstance) {
    return consumerInstance;
  }

  const consumer = await createConsumer(config.kafka.maturityConsumerGroup);
  if (!consumer) {
    throw new Error('Не удалось инициализировать consumer уведомлений о созревании');
  }

  await consumer.subscribe({ topic: config.kafka.maturityTopic, fromBeginning: false });

  consumer.run({ eachMessage: createMaturityHandler() }).catch((error) => {
    logError('Consumer созревания остановился с ошибкой', {
      event: 'garden.maturity.consumer.crashed',
      error: error.message,
      stack: error.stack
    });
  });

  logInfo('Consumer созревания запущен', {
    event: 'garden.maturity.consumer.started',
    topic: config.kafka.maturityTopic,
    groupId: config.kafka.maturityConsumerGroup
  });

  consumerInstance = consumer;
  return consumerInstance;
}

export async function stopMaturityConsumer() {
  if (!consumerInstance) {
    return;
  }

  try {
    await consumerInstance.stop();
  } catch (error) {
    logError('Не удалось остановить consumer уведомлений о созревании', {
      event: 'garden.maturity.consumer.stop_failed',
      error: error.message,
      stack: error.stack
    });
  }
}
