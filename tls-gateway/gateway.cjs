'use strict';

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const {
  createLogger,
  safeError
} = require('./logger.cjs');

const logger = createLogger();

process.on('uncaughtExceptionMonitor', (err) => {

  logger.fatal(
    'uncaught_exception',
    safeError(err, { includeMessage: false })
  );
});

process.on('unhandledRejection', (reason) => {

  logger.fatal(
    'unhandled_rejection',
    safeError(reason, { includeMessage: false })
  );

  process.exit(1);
});

const PFX =
  'D:\\AI-BOS-Server\\config\\tls\\AI-BOS-Server.pfx';

const SECRET =
  'D:\\AI-BOS-Server\\config\\tls\\AI-BOS-Server.pfx.passphrase';

const passphrase =
  fs.readFileSync(SECRET, 'utf8').trim();

if (!passphrase) {
  logger.fatal('tls_passphrase_unavailable');
  process.exit(1);
}

const server = https.createServer({
  pfx: fs.readFileSync(PFX),
  passphrase,
  minVersion: 'TLSv1.2'
}, (clientReq, clientRes) => {

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    method: clientReq.method,
    path: clientReq.url,

    headers: {
      ...clientReq.headers,
      host: '127.0.0.1:5000',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': clientReq.socket.remoteAddress,
      'x-forwarded-host':
        clientReq.headers.host || 'ADMIN-WORKNAI:5443'
    }
  }, (proxyRes) => {

    clientRes.writeHead(
      proxyRes.statusCode || 502,
      proxyRes.headers
    );

    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {

    logger.error(
      'http_proxy_error',
      {
        failureType: 'upstream_connection',
        ...safeError(err)
      }
    );

    if (!clientRes.headersSent) {

      clientRes.writeHead(502, {
        'content-type': 'application/json'
      });
    }

    clientRes.end(
      JSON.stringify({
        success: false,
        error: 'TLS gateway upstream unavailable'
      })
    );
  });

  clientReq.on('error', (err) => {

    logger.warn(
      'http_client_request_error',
      safeError(err)
    );

    proxyReq.destroy();
  });

  clientReq.pipe(proxyReq);
});

/*
 * WebSocket / HTTP Upgrade forwarding (Socket.IO transport=websocket).
 *
 * https.createServer's request handler above only ever sees normal
 * HTTP requests. An Upgrade request (Connection: Upgrade, Upgrade:
 * websocket) is a distinct Node event â€” with no "upgrade" listener,
 * Node silently does nothing with it, which is why the client saw a
 * connect timeout with zero bytes instead of any HTTP response.
 *
 * This mirrors the existing reverse-proxy request handler above: same
 * upstream host/port, same forwarded headers, same error-handling and
 * logging style, socket-level bidirectional piping.
 */
const UPGRADE_UPSTREAM_TIMEOUT_MS = 10_000;

server.on('upgrade', (clientReq, clientSocket, headHead) => {

  let settled = false;

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    method: clientReq.method,
    path: clientReq.url,

    headers: {
      ...clientReq.headers,
      host: '127.0.0.1:5000',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': clientReq.socket.remoteAddress,
      'x-forwarded-host':
        clientReq.headers.host || 'ADMIN-WORKNAI:5443'
    },

    timeout: UPGRADE_UPSTREAM_TIMEOUT_MS
  });

  function closeClientWithStatus(statusCode, statusMessage) {

    if (!clientSocket.writable) {
      return;
    }

    clientSocket.end(
      'HTTP/1.1 ' + statusCode + ' ' + statusMessage + '\r\n' +
      'Connection: close\r\n\r\n'
    );
  }

  function destroyBothSockets(reason, failureType) {

    if (settled) {
      return;
    }

    settled = true;

    if (reason) {

      logger.error(
        'websocket_upgrade_error',
        {
          failureType,
          ...safeError(reason)
        }
      );
    }

    if (!proxyReq.destroyed) {
      proxyReq.destroy();
    }

    if (!clientSocket.destroyed) {
      clientSocket.destroy();
    }
  }

  /*
   * Backend rejected the upgrade and answered with an ordinary HTTP
   * response instead of switching protocols (for example 400/401/403/
   * 500). Forward that real status and headers to the client instead
   * of leaving the client waiting only on the "upgrade" event, which
   * never fires in this case.
   */
  proxyReq.on('response', (proxyRes) => {

    if (settled) {
      return;
    }

    settled = true;

    logger.error(
      'websocket_upgrade_error',
      {
        failureType: 'backend_declined_upgrade',
        statusCode: proxyRes.statusCode
      }
    );

    closeClientWithStatus(
      proxyRes.statusCode || 502,
      proxyRes.statusMessage || 'Bad Gateway'
    );

    proxyRes.resume();
    proxyReq.destroy();
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {

    if (settled) {
      proxySocket.destroy();
      return;
    }

    settled = true;

    if (!clientSocket.writable) {
      proxySocket.destroy();
      return;
    }

    const statusLine =
      'HTTP/1.1 ' +
      (proxyRes.statusCode || 101) +
      ' ' +
      (proxyRes.statusMessage || 'Switching Protocols') +
      '\r\n';

    /*
     * rawHeaders preserves original casing, ordering, and duplicate
     * header entries (for example multiple Sec-WebSocket-Extensions
     * or Set-Cookie lines) exactly as the backend sent them, unlike
     * proxyRes.headers which folds duplicates into a single entry.
     */
    const rawHeaderLines = [];

    for (let index = 0; index < proxyRes.rawHeaders.length; index += 2) {

      rawHeaderLines.push(
        proxyRes.rawHeaders[index] +
        ': ' +
        proxyRes.rawHeaders[index + 1]
      );
    }

    clientSocket.write(
      statusLine +
      rawHeaderLines.join('\r\n') +
      '\r\n\r\n'
    );

    if (proxyHead && proxyHead.length > 0) {
      clientSocket.write(proxyHead);
    }

    if (headHead && headHead.length > 0) {
      proxySocket.write(headHead);
    }

    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);

    proxySocket.on('error', (err) => {

      logger.error(
        'websocket_proxy_error',
        {
          failureType: 'backend_socket',
          ...safeError(err)
        }
      );

      destroyBothSockets(err, 'backend_socket');
    });

    clientSocket.on('error', (err) => {

      logger.warn(
        'websocket_proxy_error',
        {
          failureType: 'client_socket',
          ...safeError(err)
        }
      );

      destroyBothSockets(err, 'client_socket');
    });

    proxySocket.on('close', () => {

      if (!clientSocket.destroyed) {
        clientSocket.destroy();
      }
    });

    clientSocket.on('close', () => {

      if (!proxySocket.destroyed) {
        proxySocket.destroy();
      }
    });
  });

  proxyReq.on('timeout', () => {

    destroyBothSockets(
      new Error('Upstream upgrade request timed out'),
      'upstream_timeout'
    );
  });

  proxyReq.on('error', (err) => {
    destroyBothSockets(err, 'upstream_connection');
  });

  clientSocket.on('error', (err) => {
    destroyBothSockets(err, 'client_socket');
  });

  proxyReq.end();
});

server.on('clientError', (err, socket) => {

  logger.error(
    'http_client_error',
    safeError(err)
  );

  if (socket.writable) {

    socket.end(
      'HTTP/1.1 400 Bad Request\r\n' +
      'Connection: close\r\n\r\n'
    );
  }
});

server.on('tlsClientError', (err) => {

  logger.error(
    'tls_client_error',
    safeError(err)
  );
});

logger.info(
  'gateway_starting',
  {
    protocol: 'https',
    listenHost: '0.0.0.0',
    listenPort: 5443,
    upstreamProtocol: 'http',
    upstreamHost: '127.0.0.1',
    upstreamPort: 5000
  }
);

server.listen(5443, '0.0.0.0', () => {

  logger.info(
    'gateway_started',
    {
      protocol: 'https',
      listenHost: '0.0.0.0',
      listenPort: 5443,
      upstreamProtocol: 'http',
      upstreamHost: '127.0.0.1',
      upstreamPort: 5000
    }
  );
});

function shutdown(signal) {

  logger.info(
    'gateway_shutdown_started',
    { signal }
  );

  server.close(() => {

    logger.info(
      'gateway_stopped',
      { signal }
    );

    process.exit(0);
  });

  setTimeout(
    () => {

      logger.error(
        'gateway_shutdown_timeout',
        { signal }
      );

      process.exit(1);
    },
    5000
  ).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

