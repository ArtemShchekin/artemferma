import fs from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { logError } from '../logging/index.js';

let cachedSpec = null;

function readOpenApiFromDisk() {
  const openapiUrl = new URL('../../openapi.yaml', import.meta.url);
  const openapiPath = fileURLToPath(openapiUrl);
  const raw = fs.readFileSync(openapiPath, 'utf-8');
  const parsed = YAML.parse(raw);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OpenAPI specification is empty');
  }

  const hasOperations = parsed.paths && typeof parsed.paths === 'object';
  if (!hasOperations || Object.keys(parsed.paths).length === 0) {
    throw new Error('OpenAPI specification contains no paths');
  }

  return parsed;
}

export function loadOpenApi() {
  if (cachedSpec) {
    return cachedSpec;
  }

  try {
    cachedSpec = readOpenApiFromDisk();
    return cachedSpec;
  } catch (error) {
    logError('Failed to load OpenAPI specification', {
      event: 'openapi.load_failed',
      error: error.message,
      stack: error.stack
    });
    cachedSpec = null;
    return null;
  }
}

export function resetOpenApiCache() {
  cachedSpec = null;
}