import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOpenApi, resetOpenApiCache } from './openapi.js';

test('loadOpenApi returns parsed OpenAPI document', () => {
  resetOpenApiCache();
  const spec = loadOpenApi();

  assert.ok(spec, 'spec should be loaded');
  assert.equal(spec.openapi, '3.0.3');
  assert.ok(spec.paths, 'spec should have paths section');
  assert.ok(spec.paths['/profile'], 'profile path should exist');
});
