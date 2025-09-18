import { Client } from '@opensearch-project/opensearch';

const nodeUrl = process.env.OPENSEARCH_NODE;
const indexName = process.env.OPENSEARCH_LOG_INDEX || 'ferm-logs';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;
const rejectUnauthorized = process.env.OPENSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false';

let client;
let indexPrepared = false;

function getClient() {
  if (!nodeUrl) {
    return null;
  }
  if (client) {
    return client;
  }
  try {
    const options = { node: nodeUrl };
    if (username || password) {
      options.auth = {
        username: username || '',
        password: password || ''
      };
    }
    if (!rejectUnauthorized) {
      options.ssl = { rejectUnauthorized: false };
    }
    client = new Client(options);
  } catch (error) {
    console.error('Failed to initialize OpenSearch client:', error);
    client = null;
  }
  return client;
}

async function ensureIndex() {
  const osClient = getClient();
  if (!osClient || indexPrepared) {
    return;
  }
  try {
    await osClient.indices.create(
      {
        index: indexName,
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
  } catch (error) {
    console.error('Failed to ensure OpenSearch index:', error);
  }
}

async function sendToOpenSearch(body) {
  const osClient = getClient();
  if (!osClient) {
    return;
  }
  try {
    await ensureIndex();
    await osClient.index({ index: indexName, body });
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
  console.log(message);
  return sendToOpenSearch(body);
}

export function logError(message, extra) {
  const body = baseDocument('error', message, extra);
  console.error(message, extra?.error);
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