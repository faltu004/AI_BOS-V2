'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { safeError } = require('../logger.cjs');

const GATEWAY_PATH = path.resolve(
  __dirname,
  '..',
  'gateway.cjs'
);

const PROVEN_BASELINE_SHA256 =
  '668FD297F1EB02AC306DACA0C51C4B3CB5A8FBBC65D1636918C69A3967026402';

class FakeServer extends EventEmitter {

  constructor() {
    super();
    this.listenCalls = [];
    this.closeCalls = 0;
  }

  listen(...args) {

    this.listenCalls.push(args.slice(0, 2));

    const callback = args.at(-1);

    if (typeof callback === 'function') {
      callback();
    }
  }

  close(callback) {

    this.closeCalls += 1;
    callback();
  }
}

class FakeProxyRequest extends EventEmitter {

  constructor(options, responseCallback) {
    super();
    this.options = options;
    this.responseCallback = responseCallback;
    this.destroyed = false;
    this.ended = false;
  }

  end() {
    this.ended = true;
  }

  destroy() {
    this.destroyed = true;
  }
}

class FakeSocket extends EventEmitter {

  constructor(remoteAddress = '192.0.2.30') {
    super();
    this.remoteAddress = remoteAddress;
    this.writable = true;
    this.destroyed = false;
    this.writes = [];
    this.ends = [];
    this.pipes = [];
  }

  write(value) {
    this.writes.push(value);
    return true;
  }

  end(value) {

    if (value !== undefined) {
      this.ends.push(value);
    }

    this.writable = false;
  }

  destroy() {
    this.destroyed = true;
  }

  pipe(destination) {
    this.pipes.push(destination);
    return destination;
  }
}

function createLoggerCapture() {

  const calls = [];
  const logger = {};

  for (const level of ['info', 'warn', 'error', 'fatal']) {

    logger[level] = (event, details = {}) => {
      calls.push({ level, event, details });
    };
  }

  return { logger, calls };
}

function loadGateway() {

  const source = fs.readFileSync(GATEWAY_PATH, 'utf8');
  const server = new FakeServer();
  const proxyRequests = [];
  const tlsReads = [];
  const timeouts = [];
  const exits = [];
  const processRef = new EventEmitter();
  const { logger, calls: logCalls } = createLoggerCapture();
  let requestHandler;
  let tlsOptions;

  processRef.exit = (code) => {
    exits.push(code);
  };

  const sandbox = {
    Buffer,
    Error,
    JSON,
    __dirname: path.dirname(GATEWAY_PATH),
    __filename: GATEWAY_PATH,
    console,
    exports: {},
    module: { exports: {} },
    process: processRef,
    require(moduleName) {

      if (moduleName === 'node:https') {

        return {
          createServer(options, handler) {
            tlsOptions = options;
            requestHandler = handler;
            return server;
          }
        };
      }

      if (moduleName === 'node:http') {

        return {
          request(options, callback) {

            const request = new FakeProxyRequest(
              options,
              callback
            );

            proxyRequests.push(request);
            return request;
          }
        };
      }

      if (moduleName === 'node:fs') {

        return {
          readFileSync(filePath, encoding) {

            tlsReads.push({ filePath, encoding });

            if (encoding === 'utf8') {
              return 'proven-production-passphrase\n';
            }

            return Buffer.from('proven-production-pfx');
          }
        };
      }

      if (moduleName === './logger.cjs') {
        return {
          createLogger: () => logger,
          safeError
        };
      }

      throw new Error('Unexpected require: ' + moduleName);
    },
    setTimeout(callback, delay) {

      const timeout = {
        callback,
        delay,
        unrefCalled: false,
        unref() {
          this.unrefCalled = true;
        }
      };

      timeouts.push(timeout);
      return timeout;
    }
  };

  vm.runInNewContext(source, sandbox, {
    filename: GATEWAY_PATH
  });

  return {
    exits,
    logCalls,
    processRef,
    proxyRequests,
    requestHandler,
    server,
    source,
    timeouts,
    tlsOptions,
    tlsReads
  };
}

function incomingRequest(overrides = {}) {

  const request = new EventEmitter();

  Object.assign(request, {
    method: 'POST',
    url: '/api/v1/devices/register?enrollment_key=forwarded-not-logged',
    headers: {
      host: 'ADMIN-WORKNAI:5443',
      authorization: 'Bearer forwarded-authorization-value',
      cookie: 'session=forwarded-cookie-value',
      'x-device-token': 'forwarded-device-token-value'
    },
    socket: new FakeSocket('203.0.113.40'),
    pipe(destination) {
      this.pipedTo = destination;
      return destination;
    }
  }, overrides);

  return request;
}

test('patched source retains the proven baseline topology and proxy primitives', () => {

  const source = fs.readFileSync(GATEWAY_PATH, 'utf8');

  assert.equal(PROVEN_BASELINE_SHA256.length, 64);
  assert.match(
    source,
    /D:\\\\AI-BOS-Server\\\\config\\\\tls\\\\AI-BOS-Server\.pfx/
  );
  assert.match(
    source,
    /D:\\\\AI-BOS-Server\\\\config\\\\tls\\\\AI-BOS-Server\.pfx\.passphrase/
  );
  assert.match(source, /minVersion: 'TLSv1\.2'/);
  assert.equal(
    (source.match(/hostname: '127\.0\.0\.1'/g) || []).length,
    2
  );
  assert.equal(
    (source.match(/port: 5000/g) || []).length,
    2
  );
  assert.equal(
    (source.match(/'x-forwarded-proto': 'https'/g) || []).length,
    2
  );
  assert.equal(
    (source.match(/'x-forwarded-for': clientReq\.socket\.remoteAddress/g) || []).length,
    2
  );
  assert.equal(
    (source.match(/host: '127\.0\.0\.1:5000'/g) || []).length,
    2
  );
  assert.match(source, /server\.listen\(5443, '0\.0\.0\.0'/);
  assert.match(source, /const UPGRADE_UPSTREAM_TIMEOUT_MS = 10_000/);
  assert.match(source, /proxySocket\.pipe\(clientSocket\)/);
  assert.match(source, /clientSocket\.pipe\(proxySocket\)/);
  assert.match(source, /proxyRes\.rawHeaders\.length/);
  assert.match(source, /'TLS gateway upstream unavailable'/);
  assert.match(source, /'HTTP\/1\.1 400 Bad Request\\r\\n'/);
  assert.equal(source.includes('gateway.mjs'), false);
  assert.equal(source.includes("require('node:net')"), false);
});

test('TLS loading, listener, startup logs, and fixed upstream remain unchanged', () => {

  const harness = loadGateway();

  assert.deepEqual(
    harness.tlsReads.map((entry) => entry.filePath),
    [
      'D:\\AI-BOS-Server\\config\\tls\\AI-BOS-Server.pfx.passphrase',
      'D:\\AI-BOS-Server\\config\\tls\\AI-BOS-Server.pfx'
    ]
  );
  assert.equal(
    harness.tlsOptions.pfx.toString(),
    'proven-production-pfx'
  );
  assert.equal(
    harness.tlsOptions.passphrase,
    'proven-production-passphrase'
  );
  assert.equal(harness.tlsOptions.minVersion, 'TLSv1.2');
  assert.deepEqual(harness.server.listenCalls, [[5443, '0.0.0.0']]);

  const starting = harness.logCalls.find(
    (call) => call.event === 'gateway_starting'
  );
  const started = harness.logCalls.find(
    (call) => call.event === 'gateway_started'
  );

  for (const call of [starting, started]) {
    assert.ok(call);
    assert.equal(call.details.protocol, 'https');
    assert.equal(call.details.listenHost, '0.0.0.0');
    assert.equal(call.details.listenPort, 5443);
    assert.equal(call.details.upstreamProtocol, 'http');
    assert.equal(call.details.upstreamHost, '127.0.0.1');
    assert.equal(call.details.upstreamPort, 5000);
  }
});

test('normal HTTP proxy options, response piping, and sensitive forwarding are preserved', () => {

  const harness = loadGateway();
  const clientReq = incomingRequest();
  const clientRes = {
    headersSent: false,
    writeHeadCalls: [],
    endCalls: [],
    writeHead(...args) {
      this.writeHeadCalls.push(args);
    },
    end(value) {
      this.endCalls.push(value);
    }
  };

  harness.requestHandler(clientReq, clientRes);

  const proxyReq = harness.proxyRequests[0];

  assert.equal(proxyReq.options.hostname, '127.0.0.1');
  assert.equal(proxyReq.options.port, 5000);
  assert.equal(proxyReq.options.method, 'POST');
  assert.equal(proxyReq.options.path, clientReq.url);
  assert.equal(proxyReq.options.headers.host, '127.0.0.1:5000');
  assert.equal(proxyReq.options.headers['x-forwarded-proto'], 'https');
  assert.equal(
    proxyReq.options.headers['x-forwarded-for'],
    '203.0.113.40'
  );
  assert.equal(
    proxyReq.options.headers['x-forwarded-host'],
    'ADMIN-WORKNAI:5443'
  );
  assert.equal(
    proxyReq.options.headers.authorization,
    'Bearer forwarded-authorization-value'
  );
  assert.equal(
    proxyReq.options.headers.cookie,
    'session=forwarded-cookie-value'
  );
  assert.equal(
    proxyReq.options.headers['x-device-token'],
    'forwarded-device-token-value'
  );
  assert.equal(clientReq.pipedTo, proxyReq);

  const proxyRes = {
    statusCode: 207,
    headers: {
      'content-type': 'application/json'
    },
    pipe(destination) {
      this.pipedTo = destination;
    }
  };

  proxyReq.responseCallback(proxyRes);

  assert.deepEqual(clientRes.writeHeadCalls, [[207, proxyRes.headers]]);
  assert.equal(proxyRes.pipedTo, clientRes);
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-authorization-value'),
    false
  );
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-cookie-value'),
    false
  );
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-device-token-value'),
    false
  );
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-not-logged'),
    false
  );
});

test('HTTP upstream errors keep the existing 502 JSON response and add safe logging', () => {

  const harness = loadGateway();
  const clientReq = incomingRequest();
  const clientRes = {
    headersSent: false,
    writeHeadCalls: [],
    endCalls: [],
    writeHead(...args) {
      this.writeHeadCalls.push(args);
    },
    end(value) {
      this.endCalls.push(value);
    }
  };

  harness.requestHandler(clientReq, clientRes);
  harness.proxyRequests[0].emit(
    'error',
    new Error('Authorization: Bearer upstream-secret-value')
  );

  assert.equal(clientRes.writeHeadCalls.length, 1);
  assert.equal(clientRes.writeHeadCalls[0][0], 502);
  assert.equal(
    clientRes.writeHeadCalls[0][1]['content-type'],
    'application/json'
  );
  assert.deepEqual(clientRes.endCalls, [JSON.stringify({
    success: false,
    error: 'TLS gateway upstream unavailable'
  })]);

  const errorCall = harness.logCalls.find(
    (call) => call.event === 'http_proxy_error'
  );

  assert.ok(errorCall);
  assert.equal(errorCall.details.failureType, 'upstream_connection');
  assert.equal(
    JSON.stringify(harness.logCalls).includes('upstream-secret-value'),
    false
  );
});

test('WebSocket upgrade request, handshake bytes, and bidirectional piping are preserved', () => {

  const harness = loadGateway();
  const clientSocket = new FakeSocket('198.51.100.20');
  const clientReq = incomingRequest({
    method: 'GET',
    socket: clientSocket,
    url: '/socket.io/?transport=websocket&token=forwarded-ws-query'
  });
  const clientHead = Buffer.from('client-head');

  harness.server.emit(
    'upgrade',
    clientReq,
    clientSocket,
    clientHead
  );

  const proxyReq = harness.proxyRequests[0];

  assert.equal(proxyReq.options.hostname, '127.0.0.1');
  assert.equal(proxyReq.options.port, 5000);
  assert.equal(proxyReq.options.method, 'GET');
  assert.equal(proxyReq.options.path, clientReq.url);
  assert.equal(proxyReq.options.timeout, 10_000);
  assert.equal(proxyReq.options.headers.host, '127.0.0.1:5000');
  assert.equal(proxyReq.options.headers['x-forwarded-proto'], 'https');
  assert.equal(
    proxyReq.options.headers['x-forwarded-for'],
    '198.51.100.20'
  );
  assert.equal(proxyReq.ended, true);

  const proxySocket = new FakeSocket('127.0.0.1');
  const proxyHead = Buffer.from('proxy-head');
  const proxyRes = {
    statusCode: 101,
    statusMessage: 'Switching Protocols',
    rawHeaders: [
      'Upgrade',
      'websocket',
      'Connection',
      'Upgrade',
      'Set-Cookie',
      'forwarded-response-cookie'
    ]
  };

  proxyReq.emit(
    'upgrade',
    proxyRes,
    proxySocket,
    proxyHead
  );

  assert.equal(
    clientSocket.writes[0],
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Set-Cookie: forwarded-response-cookie\r\n\r\n'
  );
  assert.equal(clientSocket.writes[1], proxyHead);
  assert.equal(proxySocket.writes[0], clientHead);
  assert.deepEqual(proxySocket.pipes, [clientSocket]);
  assert.deepEqual(clientSocket.pipes, [proxySocket]);
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-response-cookie'),
    false
  );
  assert.equal(
    JSON.stringify(harness.logCalls).includes('forwarded-ws-query'),
    false
  );

  proxySocket.emit(
    'error',
    new Error('api_key=websocket-backend-secret')
  );

  const errorCall = harness.logCalls.find(
    (call) =>
      call.event === 'websocket_proxy_error' &&
      call.details.failureType === 'backend_socket'
  );

  assert.ok(errorCall);
  assert.equal(
    JSON.stringify(harness.logCalls).includes('websocket-backend-secret'),
    false
  );
});

test('WebSocket connection failures retain socket cleanup and add safe upgrade logging', () => {

  const harness = loadGateway();
  const clientSocket = new FakeSocket('198.51.100.21');
  const clientReq = incomingRequest({
    method: 'GET',
    socket: clientSocket
  });

  harness.server.emit(
    'upgrade',
    clientReq,
    clientSocket,
    Buffer.alloc(0)
  );

  const proxyReq = harness.proxyRequests[0];

  proxyReq.emit(
    'error',
    new Error('device_token=websocket-upgrade-secret')
  );

  assert.equal(proxyReq.destroyed, true);
  assert.equal(clientSocket.destroyed, true);

  const errorCall = harness.logCalls.find(
    (call) => call.event === 'websocket_upgrade_error'
  );

  assert.ok(errorCall);
  assert.equal(errorCall.details.failureType, 'upstream_connection');
  assert.equal(
    JSON.stringify(harness.logCalls).includes('websocket-upgrade-secret'),
    false
  );
});

test('backend-declined WebSocket upgrades retain the existing HTTP status response', () => {

  const harness = loadGateway();
  const clientSocket = new FakeSocket();
  const clientReq = incomingRequest({
    method: 'GET',
    socket: clientSocket
  });

  harness.server.emit(
    'upgrade',
    clientReq,
    clientSocket,
    Buffer.alloc(0)
  );

  const proxyReq = harness.proxyRequests[0];
  const proxyRes = {
    statusCode: 401,
    statusMessage: 'Unauthorized',
    resumed: false,
    resume() {
      this.resumed = true;
    }
  };

  proxyReq.emit('response', proxyRes);

  assert.deepEqual(clientSocket.ends, [
    'HTTP/1.1 401 Unauthorized\r\n' +
    'Connection: close\r\n\r\n'
  ]);
  assert.equal(proxyRes.resumed, true);
  assert.equal(proxyReq.destroyed, true);
  assert.ok(harness.logCalls.some(
    (call) =>
      call.event === 'websocket_upgrade_error' &&
      call.details.failureType === 'backend_declined_upgrade' &&
      call.details.statusCode === 401
  ));
});

test('shutdown and process-fatal paths log safely while retaining exit behavior', () => {

  const shutdownHarness = loadGateway();

  shutdownHarness.processRef.emit('SIGTERM');

  assert.equal(shutdownHarness.server.closeCalls, 1);
  assert.deepEqual(shutdownHarness.exits, [0]);
  assert.equal(shutdownHarness.timeouts.length, 1);
  assert.equal(shutdownHarness.timeouts[0].delay, 5000);
  assert.equal(shutdownHarness.timeouts[0].unrefCalled, true);
  assert.ok(shutdownHarness.logCalls.some(
    (call) => call.event === 'gateway_shutdown_started'
  ));
  assert.ok(shutdownHarness.logCalls.some(
    (call) => call.event === 'gateway_stopped'
  ));

  const fatalHarness = loadGateway();

  fatalHarness.processRef.emit(
    'uncaughtExceptionMonitor',
    new Error('password=uncaught-secret-value')
  );
  fatalHarness.processRef.emit(
    'unhandledRejection',
    new Error('api_key=rejection-secret-value')
  );

  assert.deepEqual(fatalHarness.exits, [1]);
  assert.ok(fatalHarness.logCalls.some(
    (call) => call.event === 'uncaught_exception'
  ));
  assert.ok(fatalHarness.logCalls.some(
    (call) => call.event === 'unhandled_rejection'
  ));
  assert.equal(
    JSON.stringify(fatalHarness.logCalls).includes('uncaught-secret-value'),
    false
  );
  assert.equal(
    JSON.stringify(fatalHarness.logCalls).includes('rejection-secret-value'),
    false
  );
});
