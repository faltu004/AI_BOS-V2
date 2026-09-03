import { env } from "./env.js";

export const appConfig = {
  name: "AI Business Operating System API",
  apiPrefix: env.API_PREFIX,
  isProduction: env.NODE_ENV === "production",
  clientOrigins: env.CLIENT_ORIGIN,
  allowTunnelOrigins: env.ALLOW_TUNNEL_ORIGINS,
  cookieDomain: env.COOKIE_DOMAIN,
  employeeUpdateFeedDir: env.EMPLOYEE_UPDATE_FEED_DIR,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  upload: {
    maxFileSizeMb: env.UPLOAD_MAX_FILE_SIZE_MB,
  },
};

const privateLanHostPattern =
  /^(127\.0\.0\.1|localhost|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

function registrableDomain(hostname: string): string {
  const labels = hostname.split(".");
  return labels.length <= 2 ? hostname : labels.slice(-2).join(".");
}

/**
 * A Cloudflare Tunnel exposes each app on its own subdomain of the operator's own
 * domain (see CLOUDFLARE_TUNNEL_SETUP.md). Once ANY subdomain of that domain has been
 * explicitly trusted via CLIENT_ORIGIN, the sibling subdomains (api-/admin-/app-) are
 * trusted too — this avoids requiring every subdomain to be enumerated by hand, while
 * never trusting a domain the operator hasn't already opted into.
 */
function isTrustedTunnelOrigin(hostname: string): boolean {
  const domain = registrableDomain(hostname);
  return appConfig.clientOrigins.some((allowedOrigin) => {
    try {
      const allowed = new URL(allowedOrigin);
      return allowed.protocol === "https:" && registrableDomain(allowed.hostname) === domain;
    } catch {
      return false;
    }
  });
}

/** CORS/socket origin check: explicit allowlist, plus LAN IPs always, plus trusted tunnel subdomains when enabled. */
export function isAllowedOrigin(origin: string): boolean {
  if (appConfig.clientOrigins.includes(origin)) {
    return true;
  }

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  if (privateLanHostPattern.test(hostname)) {
    return true;
  }

  return appConfig.allowTunnelOrigins && isTrustedTunnelOrigin(hostname);
}
