import fs from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { logError } from '../logging/index.js';

let cachedSpec = null;

export function loadOpenApi() {
  if (cachedSpec) {
    return cachedSpec;
  }
  try {
    const openapiUrl = new URL('../../openapi.yaml', import.meta.url);
    const openapiPath = fileURLToPath(openapiUrl);
    const raw = fs.readFileSync(openapiPath, 'utf-8');
    cachedSpec = YAML.parse(raw);
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