import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';
import { ServiceUnavailableError } from '../utils/errors.js';
import { createConsumer, kafkaAvailable, releaseConsumer } from '../utils/message-broker.js';
import { sendMaturityEmail } from './maturity.js';

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
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = parseMaturityMessage(message);

        const delivered = await sendMaturityEmail(payload);
        if (delivered) {
          processed += 1;
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

        if (processed >= limit) {
          await stopConsumer();
        }
      } catch (error) {
        logError('Ошибка при обработке сообщения созревания', {
          event: 'garden.maturity.consume_failed',
          topic,
          partition,
          offset: message.offset,
          error: error.message
        });
      }
    }
  });

  if (timer) {
    clearTimeout(timer);
  }

  await consumer.disconnect();
  releaseConsumer(consumer);

  return processed;
}
