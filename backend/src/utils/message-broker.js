import { Kafka } from 'kafkajs';
import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';

let kafkaClient;
let producer;
const consumers = new Set();

function isKafkaEnabled() {
  return Boolean(config.kafka.enabled && config.kafka.brokers.length > 0);
}

function getKafkaClient() {
  if (!isKafkaEnabled()) {
    return null;
  }

  if (kafkaClient) {
    return kafkaClient;
  }

  kafkaClient = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers
  });

  return kafkaClient;
}

export async function getProducer() {
  const client = getKafkaClient();
  if (!client) {
    return null;
  }

  if (!producer) {
    producer = client.producer();
    await producer.connect();
    logInfo('Kafka producer connected', {
      event: 'kafka.producer.connected',
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers
    });
  }

  return producer;
}

export async function createConsumer(groupId = config.kafka.consumerGroup) {
  const client = getKafkaClient();
  if (!client) {
    return null;
  }

  const consumer = client.consumer({ groupId });
  await consumer.connect();
  consumers.add(consumer);
  logInfo('Kafka consumer connected', {
    event: 'kafka.consumer.connected',
    clientId: config.kafka.clientId,
    groupId,
    brokers: config.kafka.brokers
  });

  return consumer;
}

export function releaseConsumer(consumer) {
  consumers.delete(consumer);
}

export async function disconnectKafka() {
  if (producer) {
    try {
      await producer.disconnect();
      logInfo('Kafka producer disconnected', { event: 'kafka.producer.disconnected' });
    } catch (error) {
      logError('Failed to disconnect Kafka producer', {
        event: 'kafka.producer.disconnect_failed',
        error: error.message,
        stack: error.stack
      });
    }
    producer = undefined;
  }

  for (const consumer of consumers) {
    try {
      await consumer.disconnect();
      logInfo('Kafka consumer disconnected', { event: 'kafka.consumer.disconnected' });
    } catch (error) {
      logError('Failed to disconnect Kafka consumer', {
        event: 'kafka.consumer.disconnect_failed',
        error: error.message,
        stack: error.stack
      });
    }
  }

  consumers.clear();
}

export function kafkaAvailable() {
  return isKafkaEnabled();
}
