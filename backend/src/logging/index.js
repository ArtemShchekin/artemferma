import { Client } from '@opensearch-project/opensearch';

import config from '../config/index.js';


let client;
let indexPrepared = false;
let ensureIndexPromise;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient() {
  if (!config.opensearch.node) {
    return null;
  }
  if (client) {
    return client;
  }

  try {
    const options = { node: config.opensearch.node };
    if (config.opensearch.username || config.opensearch.password) {
      options.auth = {
        username: config.opensearch.username,
        password: config.opensearch.password
      };
    }
    if (!config.opensearch.rejectUnauthorized) {
      options.ssl = { rejectUnauthorized: false };
    }
    client = new Client(options);
  } catch (error) {
    console.error('Failed to initialize OpenSearch client:', error);
    client = null;
  }

  return client;
}

async function createIndexWithRetry(osClient) {
  const attempts = Math.max(config.opensearch.indexRetryAttempts, 1);
  const delayMs = Math.max(config.opensearch.indexRetryDelayMs, 0);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await osClient.ping();
      await osClient.indices.create(
        {
          index: config.opensearch.index,
          body: {
            mappings: {
              properties: {
                '@timestamp': { type: 'date' },
                level: { type: 'keyword' },
                event: { type: 'keyword' },
                message: { type: 'text' },
                method: { type: 'keyword' },
                path: { type: 'keyword' },
                status: { type: 'integer' },
                durationMs: { type: 'integer' },
                userId: { type: 'integer' },
                ip: { type: 'ip' },
                stack: { type: 'text' }
              }
            }
          }
        },
        { ignore: [400] }
      );
      indexPrepared = true;
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }
}

async function ensureIndex() {
  const osClient = getClient();
  if (!osClient || indexPrepared) {
    return;
  }

  if (!ensureIndexPromise) {
    ensureIndexPromise = createIndexWithRetry(osClient)
      .catch((error) => {
        console.error('Failed to ensure OpenSearch index:', error);
      })
      .finally(() => {
        ensureIndexPromise = undefined;
      });
  }
  
  await ensureIndexPromise;
}

async function sendToOpenSearch(body) {
  const osClient = getClient();
  if (!osClient) {
    return;
  }

  try {
    await ensureIndex();
    if (!indexPrepared) {
      return;
    }    
    await osClient.index({ index: config.opensearch.index, body });
  } catch (error) {
    console.error('Failed to send log to OpenSearch:', error);
  }
}

function baseDocument(level, message, extra = {}) {
  return {
    '@timestamp': new Date().toISOString(),
    level,
    message,
    ...extra
  };
}

export function logInfo(message, extra) {
  const body = baseDocument('info', message, extra);
  console.log(message, extra ? JSON.stringify(extra) : '');
  return sendToOpenSearch(body);
}

export function logError(message, extra) {
  const body = baseDocument('error', message, extra);
  console.error(message, extra?.error || '');
  return sendToOpenSearch(body);
}

export function logRequest(extra) {
  const body = baseDocument('info', 'http_request', { event: 'http_request', ...extra });
  return sendToOpenSearch(body);
}

export function logStartup(extra = {}) {
  return logInfo('Backend started', { event: 'startup', ...extra });
}

export function logShutdown(reason, extra = {}) {
  return logInfo('Backend shutting down', { event: 'shutdown', reason, ...extra });
}