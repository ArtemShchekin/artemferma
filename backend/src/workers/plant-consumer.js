import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';
import { plantSeed } from '../services/garden.js';
import { createConsumer, kafkaAvailable } from '../utils/message-broker.js';
import { ValidationError, ConflictError } from '../utils/errors.js';

let consumerInstance;

function parsePlantingMessage(message) {
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

  return {
    userId,
    slot: payload.slot,
    inventoryId: payload.inventoryId,
    requestId: payload.requestId || requestId
  };
}

async function handlePlantingMessage(context) {
  const { topic, partition, message } = context;
  let payload;

  try {
    payload = parsePlantingMessage(message);
  } catch (error) {
    logError('Не удалось разобрать задачу посадки', {
      event: 'garden.plant.parse_failed',
      topic,
      partition,
      offset: message.offset,
      error: error.message
    });
    return;
  }

  logInfo('Сообщение посадки получено consumer', {
    event: 'garden.plant.received',
    topic,
    partition,
    offset: message.offset,
    requestId: payload.requestId,
    userId: payload.userId,
    slot: payload.slot,
    inventoryId: payload.inventoryId
  });

  try {
    const result = await plantSeed({
      userId: payload.userId,
      slot: payload.slot,
      inventoryId: payload.inventoryId
    });

    logInfo('Задача посадки обработана', {
      event: 'garden.plant.processed',
      topic,
      partition,
      offset: message.offset,
      requestId: payload.requestId,
      userId: payload.userId,
      slot: result.slot,
      seedType: result.plantedType
    });
  } catch (error) {
    const knownError = error instanceof ValidationError || error instanceof ConflictError;
    logError('Ошибка при обработке задачи посадки', {
      event: 'garden.plant.failed',
      topic,
      partition,
      offset: message.offset,
      requestId: payload.requestId,
      userId: payload?.userId,
      slot: payload?.slot,
      error: error.message,
      stack: knownError ? undefined : error.stack
    });
  }
}

export async function startPlantConsumer() {
  if (!kafkaAvailable()) {
    logInfo('Kafka отключена, consumer посадки не запущен', { event: 'garden.plant.consumer.disabled' });
    return null;
  }

  if (consumerInstance) {
    return consumerInstance;
  }

  const consumer = await createConsumer(config.kafka.consumerGroup);
  if (!consumer) {
    throw new Error('Не удалось инициализировать Kafka consumer');
  }

  await consumer.subscribe({ topic: config.kafka.plantTopic, fromBeginning: false });
  await consumer.run({
    eachMessage: async (context) => handlePlantingMessage(context)
  });

  logInfo('Consumer посадки запущен', {
    event: 'garden.plant.consumer.started',
    topic: config.kafka.plantTopic,
    groupId: config.kafka.consumerGroup
  });

  consumerInstance = consumer;
  return consumerInstance;
}

export async function stopPlantConsumer() {
  if (!consumerInstance) {
    return;
  }

  try {
    await consumerInstance.stop();
  } catch (error) {
    logError('Не удалось остановить consumer посадки', {
      event: 'garden.plant.consumer.stop_failed',
      error: error.message,
      stack: error.stack
    });
  }
}
