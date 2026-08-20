const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "aibos";
const APP_HOST = "app";
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

function registerAppSchemePrivileges(protocol) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        codeCache: true
      }
    }
  ]);
}

function normalizeApiBaseUrl(value) {
  const trimmed =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !trimmed ||
    /^REPLACE_WITH_/i.test(trimmed)
  ) {
    return undefined;
  }

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    return undefined;
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    return undefined;
  }

  const pathname =
    parsed.pathname.replace(/\/+$/, "");

  if (pathname !== "/api/v1") {
    return undefined;
  }

  parsed.pathname = pathname;

  return parsed.toString().replace(/\/$/, "");
}

function readRuntimeConfig({
  resourcesPath,
  explicitConfigPath = process.env.AI_BOS_CONFIG_PATH,
  programDataRoot =
    process.env.ProgramData ??
    process.env.PROGRAMDATA
} = {}) {
  const candidates = [
    explicitConfigPath,
    programDataRoot
      ? path.join(
          programDataRoot,
          "AI BOS",
          "aibos-config.json"
        )
      : undefined,
    resourcesPath
      ? path.join(
          resourcesPath,
          "aibos-config.json"
        )
      : undefined
  ].filter(Boolean);

  const uniqueCandidates = [
    ...new Set(
      candidates.map((candidate) =>
        path.resolve(candidate),
      ),
    ),
  ];

  const issues = [];

  for (const filePath of uniqueCandidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(
        fs.readFileSync(filePath, "utf8"),
      );

      const apiBaseUrl =
        normalizeApiBaseUrl(
          parsed?.API_BASE_URL,
        );

      if (!apiBaseUrl) {
        throw new Error(
          "API_BASE_URL must be an absolute http(s) URL ending in /api/v1",
        );
      }

      return Object.freeze({
        API_BASE_URL: apiBaseUrl,
      });
    } catch (error) {
      issues.push(
        `${filePath}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  const programDataHint = programDataRoot
    ? path.join(
        programDataRoot,
        "AI BOS",
        "aibos-config.json",
      )
    : "%ProgramData%\\AI BOS\\aibos-config.json";

  throw new Error(
    [
      "No valid AI BOS desktop API configuration was found.",
      `Create or configure: ${programDataHint}`,
      "Required example:",
      '{"API_BASE_URL":"http://SERVER:5000/api/v1"}',
      issues.length
        ? `Rejected configuration files: ${issues.join(" | ")}`
        : "No configuration candidate file exists."
    ].join(" "),
  );
}

function isInsideRoot(rootPath, candidatePath) {
  const relative = path.relative(
    rootPath,
    candidatePath,
  );

  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(
        `..${path.sep}`,
      ) &&
      !path.isAbsolute(relative)
    )
  );
}

function resolveRendererRequest(
  rendererRoot,
  requestUrl,
) {
  const root = path.resolve(rendererRoot);

  let parsed;

  try {
    parsed = new URL(requestUrl);
  } catch {
    return {
      status: 400,
    };
  }

  if (
    parsed.protocol !== `${APP_SCHEME}:` ||
    parsed.hostname !== APP_HOST
  ) {
    return {
      status: 403,
    };
  }

  let decodedPath;

  try {
    decodedPath = decodeURIComponent(
      parsed.pathname || "/",
    );
  } catch {
    return {
      status: 400,
    };
  }

  if (decodedPath.includes("\0")) {
    return {
      status: 400,
    };
  }

  const webPath = decodedPath.replace(
    /\\/g,
    "/",
  );

  const relativePath =
    webPath.replace(/^\/+/, "");

  const requestedPath =
    relativePath || "index.html";

  const candidate = path.resolve(
    root,
    requestedPath,
  );

  if (!isInsideRoot(root, candidate)) {
    return {
      status: 403,
    };
  }

  if (
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    return {
      status: 200,
      filePath: candidate,
    };
  }

  if (!path.extname(requestedPath)) {
    const indexPath = path.join(
      root,
      "index.html",
    );

    if (
      fs.existsSync(indexPath) &&
      fs.statSync(indexPath).isFile()
    ) {
      return {
        status: 200,
        filePath: indexPath,
      };
    }
  }

  return {
    status: 404,
  };
}

function registerRendererProtocol({
  protocol,
  net,
  rendererRoot,
}) {
  protocol.handle(
    APP_SCHEME,
    (request) => {
      const resolved =
        resolveRendererRequest(
          rendererRoot,
          request.url,
        );

      if (
        resolved.status !== 200 ||
        !resolved.filePath
      ) {
        return new Response(
          resolved.status === 403
            ? "Forbidden"
            : resolved.status === 400
              ? "Bad Request"
              : "Not Found",
          {
            status: resolved.status,
            headers: {
              "content-type":
                "text/plain; charset=utf-8",
            },
          },
        );
      }

      return net.fetch(
        pathToFileURL(
          resolved.filePath,
        ).toString(),
      );
    },
  );
}

function isAppUrl(value) {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol ===
        `${APP_SCHEME}:` &&
      parsed.hostname === APP_HOST
    );
  } catch {
    return false;
  }
}

function isAllowedExternalUrl(value) {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

module.exports = {
  APP_SCHEME,
  APP_HOST,
  APP_ORIGIN,
  registerAppSchemePrivileges,
  normalizeApiBaseUrl,
  readRuntimeConfig,
  resolveRendererRequest,
  registerRendererProtocol,
  isAppUrl,
  isAllowedExternalUrl,
};