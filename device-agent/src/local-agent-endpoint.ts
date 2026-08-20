const host =
  "127.0.0.1";

const port =
  Number(
    process.env
      .AI_BOS_SESSION_TELEMETRY_PORT ||
      57943,
  );

export function getLocalAgentBaseUrl():
  string {
  return `http://${host}:${port}`;
}

export function getLocalAgentHost():
  string {
  return host;
}

export function getLocalAgentPort():
  number {
  return port;
}
