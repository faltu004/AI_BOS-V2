'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_FILES,
  LOG_FILE_NAME,
  StructuredLogger,
  optionsFromEnvironment
} = require('../logger.cjs');

function temporaryDirectory(t) {

  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aibos-tls-logger-')
  );

  t.after(() => {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    });
  });

  return directory;
}

test('production defaults are 20 MiB and ten retained files', () => {

  const options = optionsFromEnvironment({});

  assert.equal(DEFAULT_MAX_BYTES, 20 * 1024 * 1024);
  assert.equal(DEFAULT_MAX_FILES, 10);
  assert.equal(options.maxBytes, DEFAULT_MAX_BYTES);
  assert.equal(options.maxFiles, DEFAULT_MAX_FILES);
  assert.equal(LOG_FILE_NAME, 'tls-gateway.log');
});

test('logging environment variables configure directory, size, and retention', () => {

  const options = optionsFromEnvironment({
    TLS_GATEWAY_LOG_DIR: 'custom-tls-logs',
    TLS_GATEWAY_LOG_MAX_BYTES: '12345',
    TLS_GATEWAY_LOG_MAX_FILES: '7'
  });

  assert.equal(
    options.logDirectory,
    path.resolve('custom-tls-logs')
  );
  assert.equal(options.maxBytes, 12345);
  assert.equal(options.maxFiles, 7);
});

test('structured JSON logs omit sensitive fields and redact credential text', (t) => {

  const logDirectory = temporaryDirectory(t);
  const logger = new StructuredLogger({
    logDirectory,
    console: false,
    clock: () => new Date('2026-08-23T12:00:00.000Z')
  });

  logger.error('http_proxy_error', {
    failureType: 'upstream_connection',
    authorization: 'Bearer authorization-secret-value',
    Cookie: 'session=cookie-secret-value',
    password: 'password-secret-value',
    deviceToken: 'device-token-secret-value',
    enrollmentKey: 'enrollment-key-secret-value',
    apiKey: 'api-key-secret-value',
    requestBody: {
      value: 'body-secret-value'
    },
    requestUrl: '/api?token=query-secret-value',
    nested: {
      serviceCredential: 'credential-secret-value',
      safeValue: 'retained-value'
    },
    errorMessage:
      'Authorization: Bearer message-secret-value api_key=message-api-secret'
  });

  const content = fs.readFileSync(
    path.join(logDirectory, LOG_FILE_NAME),
    'utf8'
  );

  const record = JSON.parse(content.trim());

  assert.equal(record.timestamp, '2026-08-23T12:00:00.000Z');
  assert.equal(record.level, 'error');
  assert.equal(record.service, 'tls-gateway');
  assert.equal(record.event, 'http_proxy_error');
  assert.equal(record.failureType, 'upstream_connection');
  assert.deepEqual(record.nested, {
    safeValue: 'retained-value'
  });

  for (const forbidden of [
    'authorization-secret-value',
    'cookie-secret-value',
    'password-secret-value',
    'device-token-secret-value',
    'enrollment-key-secret-value',
    'api-key-secret-value',
    'body-secret-value',
    'query-secret-value',
    'credential-secret-value',
    'message-secret-value',
    'message-api-secret'
  ]) {
    assert.equal(content.includes(forbidden), false, forbidden);
  }

  assert.equal(Object.hasOwn(record, 'authorization'), false);
  assert.equal(Object.hasOwn(record, 'Cookie'), false);
  assert.equal(Object.hasOwn(record, 'requestBody'), false);
  assert.equal(Object.hasOwn(record, 'requestUrl'), false);
});

test('size rotation retains only the configured rotated files', (t) => {

  const logDirectory = temporaryDirectory(t);
  const logger = new StructuredLogger({
    logDirectory,
    maxBytes: 420,
    maxFiles: 2,
    console: false
  });

  for (let index = 0; index < 30; index += 1) {

    logger.info('rotation_test', {
      index,
      message: 'safe-rotation-data'.repeat(5)
    });
  }

  const active = path.join(logDirectory, LOG_FILE_NAME);

  assert.equal(fs.existsSync(active), true);
  assert.equal(fs.existsSync(active + '.1'), true);
  assert.equal(fs.existsSync(active + '.2'), true);
  assert.equal(fs.existsSync(active + '.3'), false);

  for (const file of [active, active + '.1', active + '.2']) {

    const records = fs.readFileSync(file, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    assert.ok(records.length > 0);
    assert.ok(records.every(
      (record) => record.event === 'rotation_test'
    ));
  }
});

test('file logging failure never throws or disables gateway callers', (t) => {

  const directory = temporaryDirectory(t);
  const blockedPath = path.join(directory, 'not-a-directory');

  fs.writeFileSync(
    blockedPath,
    'prevents directory creation',
    'utf8'
  );

  let logger;

  assert.doesNotThrow(() => {

    logger = new StructuredLogger({
      logDirectory: blockedPath,
      console: false
    });
  });

  assert.doesNotThrow(() => {

    logger.info('gateway_started', {
      listenPort: 5443
    });
  });
});
