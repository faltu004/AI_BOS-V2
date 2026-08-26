'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;
const LOG_FILE_NAME = 'tls-gateway.log';
const OMIT = Symbol('omit-sensitive-log-value');

function positiveInteger(value, fallback) {

  const parsed = Number.parseInt(String(value || ''), 10);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function isSensitiveKey(key) {

  const normalized = String(key)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

  return (
    normalized.includes('authorization') ||
    normalized.includes('cookie') ||
    normalized.includes('password') ||
    normalized.includes('passwd') ||
    normalized.includes('passphrase') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('apikey') ||
    normalized.includes('devicekey') ||
    normalized.includes('enrollmentkey') ||
    normalized.includes('credential') ||
    normalized === 'key' ||
    normalized.endsWith('key') ||
    normalized === 'body' ||
    normalized === 'requestbody' ||
    normalized === 'headers' ||
    normalized === 'requestheaders' ||
    normalized === 'url' ||
    normalized === 'requesturl'
  );
}

function redactText(value) {

  return String(value)
    .replace(/:\/\/[^\s/@:]+:[^\s/@]+@/g, '://[REDACTED]@')
    .replace(
      /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
      '[REDACTED_CREDENTIAL]'
    )
    .replace(
      /\b(authorization|proxy-authorization|cookie|set-cookie|password|passwd|passphrase|secret|token|device[-_ ]?token|device[-_ ]?key|enrollment[-_ ]?key|api[-_ ]?key)\s*[:=]\s*([^\s,;]+)/gi,
      '$1=[REDACTED]'
    )
    .slice(0, 8000);
}

function sanitizeValue(value, key, seen) {

  if (isSensitiveKey(key)) {
    return OMIT;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactText(value);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value !== 'object') {
    return '[' + typeof value + ']';
  }

  if (
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer
  ) {
    return '[BINARY]';
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);

  if (Array.isArray(value)) {

    const result = value
      .map((entry) => sanitizeValue(entry, 'item', seen))
      .filter((entry) => entry !== OMIT);

    seen.delete(value);
    return result;
  }

  const result = {};

  for (const [nestedKey, nestedValue] of Object.entries(value)) {

    const sanitized = sanitizeValue(
      nestedValue,
      nestedKey,
      seen
    );

    if (sanitized !== OMIT) {
      result[nestedKey] = sanitized;
    }
  }

  seen.delete(value);
  return result;
}

function sanitizeDetails(details) {

  const sanitized = sanitizeValue(
    details,
    'details',
    new WeakSet()
  );

  return sanitized && typeof sanitized === 'object'
    ? sanitized
    : {};
}

function safeError(error, options = {}) {

  if (!(error instanceof Error)) {
    return {
      errorType: typeof error
    };
  }

  const result = {
    errorName: redactText(error.name || 'Error')
  };

  if (
    typeof error.code === 'string' ||
    typeof error.code === 'number'
  ) {
    result.errorCode = redactText(error.code);
  }

  if (options.includeMessage !== false && error.message) {
    result.errorMessage = redactText(error.message);
  }

  return result;
}

function optionsFromEnvironment(env = process.env) {

  return {
    logDirectory: path.resolve(
      env.TLS_GATEWAY_LOG_DIR ||
      path.join(__dirname, 'logs')
    ),
    maxBytes: positiveInteger(
      env.TLS_GATEWAY_LOG_MAX_BYTES,
      DEFAULT_MAX_BYTES
    ),
    maxFiles: positiveInteger(
      env.TLS_GATEWAY_LOG_MAX_FILES,
      DEFAULT_MAX_FILES
    )
  };
}

class StructuredLogger {

  constructor(options = {}) {

    const environmentOptions = optionsFromEnvironment(
      options.env
    );

    this.logDirectory = path.resolve(
      options.logDirectory ||
      environmentOptions.logDirectory
    );
    this.logPath = path.join(
      this.logDirectory,
      LOG_FILE_NAME
    );
    this.maxBytes = positiveInteger(
      options.maxBytes,
      environmentOptions.maxBytes
    );
    this.maxFiles = positiveInteger(
      options.maxFiles,
      environmentOptions.maxFiles
    );
    this.consoleEnabled = options.console !== false;
    this.clock = options.clock || (() => new Date());
    this.currentSize = 0;
    this.fileEnabled = true;
    this.lastFailure = undefined;

    try {

      fs.mkdirSync(this.logDirectory, {
        recursive: true
      });

      if (fs.existsSync(this.logPath)) {
        this.currentSize = fs.statSync(this.logPath).size;
      }
    } catch (error) {

      this.fileEnabled = false;
      this.reportFailure('initialize', error);
    }
  }

  info(event, details) {
    this.write('info', event, details);
  }

  warn(event, details) {
    this.write('warn', event, details);
  }

  error(event, details) {
    this.write('error', event, details);
  }

  fatal(event, details) {
    this.write('fatal', event, details);
  }

  write(level, event, details = {}) {

    try {

      const record = {
        ...sanitizeDetails(details),
        timestamp: this.clock().toISOString(),
        level,
        service: 'tls-gateway',
        event: redactText(event),
        pid: process.pid
      };

      const line = JSON.stringify(record) + '\n';

      if (this.consoleEnabled) {

        try {
          fs.writeSync(1, line);
        } catch {
          // Console logging is best effort.
        }
      }

      this.writeFile(line);
    } catch (error) {

      this.reportFailure('serialize', error);
    }
  }

  writeFile(line) {

    if (!this.fileEnabled) {
      return;
    }

    try {

      const lineBytes = Buffer.byteLength(line);

      if (
        this.currentSize > 0 &&
        this.currentSize + lineBytes > this.maxBytes
      ) {
        this.rotate();
      }

      fs.appendFileSync(
        this.logPath,
        line,
        'utf8'
      );

      this.currentSize += lineBytes;
      this.lastFailure = undefined;
    } catch (error) {

      this.reportFailure('write', error);
    }
  }

  rotate() {

    try {

      const oldest =
        this.logPath + '.' + this.maxFiles;

      if (fs.existsSync(oldest)) {
        fs.unlinkSync(oldest);
      }

      for (
        let index = this.maxFiles - 1;
        index >= 1;
        index -= 1
      ) {

        const source =
          this.logPath + '.' + index;
        const destination =
          this.logPath + '.' + (index + 1);

        if (fs.existsSync(source)) {

          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }

          fs.renameSync(source, destination);
        }
      }

      if (fs.existsSync(this.logPath)) {

        fs.renameSync(
          this.logPath,
          this.logPath + '.1'
        );
      }

      this.currentSize = 0;
    } catch (error) {

      this.reportFailure('rotate', error);

      try {

        this.currentSize = fs.existsSync(this.logPath)
          ? fs.statSync(this.logPath).size
          : 0;
      } catch {
        this.fileEnabled = false;
      }
    }
  }

  reportFailure(operation, error) {

    try {

      const errorCode =
        error && error.code
          ? String(error.code)
          : 'UNKNOWN';

      const signature = operation + ':' + errorCode;

      if (signature === this.lastFailure) {
        return;
      }

      this.lastFailure = signature;

      fs.writeSync(
        2,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'tls-gateway',
          event: 'logging_failure',
          operation,
          errorCode: redactText(errorCode)
        }) + '\n'
      );
    } catch {
      // Logging must never become a gateway failure mode.
    }
  }
}

function createLogger(options) {
  return new StructuredLogger(options);
}

module.exports = {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_FILES,
  LOG_FILE_NAME,
  StructuredLogger,
  createLogger,
  optionsFromEnvironment,
  redactText,
  safeError,
  sanitizeDetails
};
