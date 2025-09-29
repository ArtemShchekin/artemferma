import { Client } from '@opensearch-project/opensearch';

import config from '../config/index.js';

let client;
let indexPrepared = false;
let ensureIndexPromise;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOpenSearchEnabled = Boolean(config.opensearch.enabled && config.opensearch.node);

function printToConsole(level, message, extra) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  if (level === 'error') {
    console.error(message + payload);
  } else {
    console.log(message + payload);
  }
}

function getClient() {
  if (!isOpenSearchEnabled) {
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
    printToConsole('error', 'Failed to initialize OpenSearch client', { error: error.message });
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
                'event.eventname': { type: 'keyword' },
                message: { type: 'text' },
                method: { type: 'keyword' },
                path: { type: 'keyword' },
                status: { type: 'integer' },
                durationMs: { type: 'integer' },
                userId: { type: 'integer' },
                ip: { type: 'ip' },
                requestBody: { type: 'text' },
                requestQuery: { type: 'text' },
                requestParams: { type: 'text' },
                stack: { type: 'text' },
                responseBody: { type: 'text' }              
              }
            }
          }
        },
        { ignore: [400] }
      );
      indexPrepared = true;
      printToConsole('info', 'OpenSearch log index ready', {
        event: 'opensearch.index_ready',
        index: config.opensearch.index
      });
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
        printToConsole('error', 'Failed to ensure OpenSearch index', { error: error.message });
      })
      .finally(() => {
        ensureIndexPromise = undefined;
      });
  }
  
  await ensureIndexPromise;
}

async function sendToOpenSearch(body) {
    if (!isOpenSearchEnabled) {
    return;
  }

  const osClient = getClient();
  if (!osClient) {
    return;
  }

  try {
    await ensureIndex();
    if (!indexPrepared) {
      return;
    }    
    await osClient.index({ index: config.opensearch.index, body, refresh: 'wait_for' });
  } catch (error) {
    printToConsole('error', 'Failed to send log to OpenSearch', { error: error.message });
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
  printToConsole('info', message, extra);
}

export function logError(message, extra) {
  printToConsole('error', message, extra);
}

export function logHttpEvent(eventName, extra) {
  const body = baseDocument('info', 'http_event', {
    event: 'http_event',
    'event.eventname': eventName,
    ...extra
  });
  return sendToOpenSearch(body);
}

export function logApi(message, extra = {}) {
  const payload = { event: 'api', ...extra };
   if (payload.response && typeof payload.response !== 'string') {
    try {
      payload.response = JSON.stringify(payload.response);
    } catch (error) {
      payload.response = '[unserializable response]';
    }
  }
  printToConsole('info', message, payload);
  const body = baseDocument('info', message, payload);
  return sendToOpenSearch(body);
}

export function logStartup(extra = {}) {
  return logInfo('Backend started', { event: 'startup', ...extra });
}

export function logShutdown(reason, extra = {}) {
  return logInfo('Backend shutting down', { event: 'shutdown', reason, ...extra });
}